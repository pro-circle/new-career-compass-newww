import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type WorkspaceSettings = {
  fullName: string;
  email: string;
  company: string;
  notifications: Record<string, boolean>;
  floatingAssistant: boolean;
  theme: string;
};

export type TeamMemberRow = {
  id: string;
  email: string;
  role: string;
  status: string;
};

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  fullName: "",
  email: "",
  company: "",
  notifications: {},
  floatingAssistant: true,
  theme: "system",
};

export const getSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorkspaceSettings> => {
    const { db, currentUser } = await import("./workspace.server");
    const client = await db();
    const session = await currentUser();
    const userId = session.userId;
    if (!client || !userId) return { ...DEFAULT_SETTINGS, email: session.username ?? "" };
    const { data } = await client
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: profile } = await client
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    return {
      fullName: String(data?.full_name || profile?.full_name || ""),
      email: String(data?.email || profile?.email || session.username || ""),
      company: String(data?.company ?? ""),
      notifications: (data?.notifications as Record<string, boolean>) ?? {},
      floatingAssistant: data?.floating_assistant ?? true,
      theme: String(data?.theme ?? "system"),
    };
  },
);

export const saveSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        fullName: z.string().max(160).optional(),
        email: z.string().max(200).optional(),
        company: z.string().max(160).optional(),
        notifications: z.record(z.string(), z.boolean()).optional(),
        floatingAssistant: z.boolean().optional(),
        theme: z.string().max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const { data: existing } = await client
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const row = {
      user_id: userId,
      full_name: data.fullName ?? existing?.full_name ?? "",
      email: data.email ?? existing?.email ?? "",
      company: data.company ?? existing?.company ?? "",
      notifications: {
        ...((existing?.notifications as Record<string, boolean>) ?? {}),
        ...(data.notifications ?? {}),
      },
      floating_assistant: data.floatingAssistant ?? existing?.floating_assistant ?? true,
      theme: data.theme ?? existing?.theme ?? "system",
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from("user_settings").upsert(row);
    if (error) return { ok: false, message: error.message };

    if (data.fullName !== undefined) {
      await client.from("profiles").update({ full_name: data.fullName }).eq("id", userId);
    }
    return { ok: true, message: "Settings saved" };
  });

export const listTeam = createServerFn({ method: "GET" }).handler(
  async (): Promise<TeamMemberRow[]> => {
    const { db, currentUser } = await import("./workspace.server");
    const client = await db();
    const session = await currentUser();
    if (!client || !session.userId) return [];
    const { data } = await client
      .from("team_invites")
      .select("*")
      .eq("owner_id", session.userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      email: String(r.email ?? ""),
      role: String(r.role ?? "Recruiter"),
      status: String(r.status ?? "Invited"),
    }));
  },
);

export const inviteTeammate = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        role: z.string().max(40).default("Recruiter"),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { db, currentUserId, newId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const { error } = await client.from("team_invites").upsert(
      {
        id: newId("INV"),
        owner_id: userId,
        email: data.email.toLowerCase(),
        role: data.role,
        status: "Invited",
      },
      { onConflict: "id" },
    );
    if (error) return { ok: false, message: error.message };

    const { sendEmail } = await import("./mailer.server");
    const appUrl = (await import("./env.server")).serverEnv("APP_URL") ?? "";
    const mail = await sendEmail({
      to: data.email,
      subject: "You've been invited to ATS Engine",
      body: `You've been invited to join an ATS Engine workspace as a ${data.role}.\n\nCreate your account here: ${appUrl}/auth/signup\n\n— ATS Engine`,
    });
    return { ok: true, message: mail.message };
  });

export const revokeTeammate = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const { error } = await client
      .from("team_invites")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Access revoked" };
  });

/** Real password change through Supabase Auth (service role). */
export const changePassword = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { currentUser, db, NO_DB } = await import("./workspace.server");
    const session = await currentUser();
    if (!session.userId) return { ok: false, message: "You must be signed in." };
    if (session.userId.startsWith("demo-")) {
      return { ok: false, message: "Demo accounts can't change their password." };
    }
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };

    const { getSupabaseAuthClient } = await import("./auth.server");
    const auth = getSupabaseAuthClient();
    if (!auth) return { ok: false, message: "Auth is not configured." };
    const { error: signInError } = await auth.auth.signInWithPassword({
      email: session.username ?? "",
      password: data.currentPassword,
    });
    if (signInError) return { ok: false, message: "Current password is incorrect." };

    const { error } = await client.auth.admin.updateUserById(session.userId, {
      password: data.newPassword,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Password updated" };
  });
