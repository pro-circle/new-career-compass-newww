import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupInput = credentials.extend({
  fullName: z.string().min(1).max(120),
  role: z.enum(["employer", "candidate"]),
});

/** Offline demo logins — no Supabase required. */
const DEMO_ACCOUNTS: Record<
  string,
  { password: string; role: "employer" | "candidate"; userId: string }
> = {
  "recruiter@demo.dev": {
    password: "demo1234",
    role: "employer",
    userId: "demo-employer-0001",
  },
  "candidate@demo.dev": {
    password: "demo1234",
    role: "candidate",
    userId: "demo-candidate-0001",
  },
};

export const login = createServerFn({ method: "POST" })
  .validator((data: unknown) => credentials.parse(data))
  .handler(async ({ data }) => {
    const { getSupabaseAuthClient, ensureProfile } = await import("@/lib/auth.server");
    const { getAppSession } = await import("@/lib/session.server");

    // --- Demo accounts: work with zero backend configured ---
    const demo = DEMO_ACCOUNTS[data.email.trim().toLowerCase()];
    if (demo && demo.password === data.password) {
      const session = await getAppSession();
      await session.update({
        userId: demo.userId,
        username: data.email.trim().toLowerCase(),
        role: demo.role,
        onboarded: true,
      });
      return { ok: true as const, role: demo.role, onboarded: true };
    }

    const auth = getSupabaseAuthClient();
    if (!auth) {
      return {
        ok: false as const,
        error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
      };
    }

    const { data: res, error } = await auth.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (error || !res.user) {
      return { ok: false as const, error: error?.message ?? "Invalid credentials." };
    }

    const meta = (res.user.user_metadata ?? {}) as Record<string, string>;
    const profile = await ensureProfile(
      res.user.id,
      (meta.role as "employer" | "candidate") ?? "candidate",
      meta.full_name ?? "",
      res.user.email ?? data.email,
    );

    const session = await getAppSession();
    await session.update({
      userId: res.user.id,
      username: res.user.email ?? data.email,
      role: profile.role,
      onboarded: profile.onboarded,
    });
    return { ok: true as const, role: profile.role, onboarded: profile.onboarded };
  });

export const signup = createServerFn({ method: "POST" })
  .validator((data: unknown) => signupInput.parse(data))
  .handler(async ({ data }) => {
    const { getSupabaseAuthClient, ensureProfile } = await import("@/lib/auth.server");
    const { getAppSession } = await import("@/lib/session.server");

    const auth = getSupabaseAuthClient();
    if (!auth) {
      return {
        ok: false as const,
        error: "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.",
      };
    }

    const { data: res, error } = await auth.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName, role: data.role } },
    });
    if (error) return { ok: false as const, error: error.message };
    if (!res.user) {
      return {
        ok: false as const,
        error: "Check your inbox to confirm your email, then sign in.",
      };
    }

    const profile = await ensureProfile(res.user.id, data.role, data.fullName, data.email);

    if (!res.session) {
      return {
        ok: false as const,
        error: "Account created. Confirm your email, then sign in.",
      };
    }

    const session = await getAppSession();
    await session.update({
      userId: res.user.id,
      username: data.email,
      role: profile.role,
      onboarded: profile.onboarded,
    });
    return { ok: true as const, role: profile.role, onboarded: profile.onboarded };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { getAppSession } = await import("@/lib/session.server");
  const session = await getAppSession();
  await session.clear();
  return { ok: true as const };
});

export const getCurrentSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getAppSession } = await import("@/lib/session.server");
    const session = await getAppSession();
    return session.data;
  } catch (error) {
    console.error("[auth] failed to read session", error);
    return {} as Record<string, never>;
  }
});

export const markOnboarded = createServerFn({ method: "POST" }).handler(async () => {
  const { getAppSession } = await import("@/lib/session.server");
  const session = await getAppSession();
  await session.update({ ...session.data, onboarded: true });
  return { ok: true as const };
});
