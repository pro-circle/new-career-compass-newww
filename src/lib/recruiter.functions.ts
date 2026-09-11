import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function db() {
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  return getSupabaseAdmin();
}

/** Moves a candidate to a new pipeline stage. */
export const setCandidateStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        candidateId: z.string().min(1),
        status: z.enum(["New", "Screening", "Interviewing", "Final Round", "Offer", "Rejected"]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const client = await db();
    if (!client) return { ok: false, message: "Backend not configured." };
    const { error } = await client
      .from("candidates")
      .update({ status: data.status })
      .eq("id", data.candidateId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Moved to ${data.status}` };
  });

/** Sends an email or in-app notification to one or more candidates. */
export const contactCandidates = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        candidateIds: z.array(z.string().min(1)).min(1).max(50),
        channel: z.enum(["email", "notification"]),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        jobTitle: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; sent: number; message: string }> => {
    const client = await db();
    if (!client) {
      return { ok: false, sent: 0, message: "Backend not configured." };
    }
    const rows = data.candidateIds.map((id, i) => ({
      id: `NTF-${Date.now().toString(36).toUpperCase()}-${i}`,
      candidate_id: id,
      title: data.subject,
      time: "just now",
      type: data.channel === "email" ? "message" : "insight",
      created_at: new Date().toISOString(),
    }));
    const { error } = await client.from("notifications").insert(rows);
    if (error) return { ok: false, sent: 0, message: error.message };

    if (data.channel !== "email") {
      return {
        ok: true,
        sent: rows.length,
        message: `Notification sent to ${rows.length} candidate${rows.length > 1 ? "s" : ""}`,
      };
    }

    const { data: people } = await client
      .from("candidates")
      .select("id, name, email")
      .in("id", data.candidateIds);
    const { sendEmail } = await import("./mailer.server");
    let delivered = 0;
    let missing = 0;
    for (const p of people ?? []) {
      const to = String((p as { email?: string }).email ?? "").trim();
      if (!to) {
        missing += 1;
        continue;
      }
      const res = await sendEmail({ to, subject: data.subject, body: data.body });
      if (res.delivered) delivered += 1;
    }
    const reached = (people ?? []).length - missing;
    return {
      ok: true,
      sent: reached,
      message: delivered
        ? `Email delivered to ${delivered} candidate${delivered > 1 ? "s" : ""}`
        : reached
          ? `Email queued for ${reached} candidate${reached > 1 ? "s" : ""} (configure Gmail delivery)`
          : "No candidate email addresses on file — message recorded in-app only",
    };
  });
