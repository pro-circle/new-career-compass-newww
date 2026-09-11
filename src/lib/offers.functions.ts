import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Offer = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  salary: string;
  equity: string;
  startDate: string;
  body: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

const offerInput = z.object({
  id: z.string().min(1).optional(),
  candidateId: z.string().max(120).default(""),
  candidateName: z.string().min(1).max(160),
  candidateEmail: z.string().max(200).default(""),
  role: z.string().max(160).default(""),
  salary: z.string().max(60).default(""),
  equity: z.string().max(40).default(""),
  startDate: z.string().max(40).default(""),
  body: z.string().max(20000).default(""),
});

function map(r: Record<string, unknown>): Offer {
  return {
    id: String(r.id),
    candidateId: String(r.candidate_id ?? ""),
    candidateName: String(r.candidate_name ?? ""),
    candidateEmail: String(r.candidate_email ?? ""),
    role: String(r.role ?? ""),
    salary: String(r.salary ?? ""),
    equity: String(r.equity ?? ""),
    startDate: String(r.start_date ?? ""),
    body: String(r.body ?? ""),
    status: String(r.status ?? "Drafted"),
    sentAt: r.sent_at ? String(r.sent_at) : null,
    createdAt: String(r.created_at ?? ""),
  };
}

export const listOffers = createServerFn({ method: "GET" }).handler(async (): Promise<Offer[]> => {
  const { db, currentUserId } = await import("./workspace.server");
  const client = await db();
  if (!client) return [];
  const userId = await currentUserId();
  const { data } = await client
    .from("offers")
    .select("*")
    .eq("employer_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(map);
});

export const saveOffer = createServerFn({ method: "POST" })
  .validator((d: unknown) => offerInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; message: string }> => {
    const { db, currentUserId, newId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const id = data.id ?? newId("OFR");
    const { error } = await client.from("offers").upsert({
      id,
      employer_id: userId,
      candidate_id: data.candidateId || null,
      candidate_name: data.candidateName,
      candidate_email: data.candidateEmail,
      role: data.role,
      salary: data.salary,
      equity: data.equity,
      start_date: data.startDate,
      body: data.body,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, id, message: "Offer draft saved" };
  });

/** Persists the offer, emails it to the candidate, and notifies them in-app. */
export const sendOffer = createServerFn({ method: "POST" })
  .validator((d: unknown) => offerInput.parse(d))
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; id?: string; delivered?: boolean; message: string }> => {
      const { db, currentUserId, newId, NO_DB } = await import("./workspace.server");
      const client = await db();
      if (!client) return { ok: false, message: NO_DB };
      const userId = await currentUserId();

      let email = data.candidateEmail.trim();
      if (!email && data.candidateId) {
        const { data: c } = await client
          .from("candidates")
          .select("email")
          .eq("id", data.candidateId)
          .maybeSingle();
        email = String(c?.email ?? "");
      }
      if (!email) {
        return { ok: false, message: "Add the candidate's email address before sending." };
      }

      const id = data.id ?? newId("OFR");
      const subject = `Your offer for ${data.role || "the role"}`;
      const { sendEmail } = await import("./mailer.server");
      const mail = await sendEmail({ to: email, subject, body: data.body });

      const { error } = await client.from("offers").upsert({
        id,
        employer_id: userId,
        candidate_id: data.candidateId || null,
        candidate_name: data.candidateName,
        candidate_email: email,
        role: data.role,
        salary: data.salary,
        equity: data.equity,
        start_date: data.startDate,
        body: data.body,
        status: mail.ok ? "Sent" : "Drafted",
        sent_at: mail.ok ? new Date().toISOString() : null,
      });
      if (error) return { ok: false, message: error.message };

      if (data.candidateId) {
        await client.from("notifications").insert({
          id: newId("NTF"),
          user_id: null,
          candidate_id: data.candidateId,
          title: subject,
          time: "just now",
          type: "offer",
          created_at: new Date().toISOString(),
        });
        await client.from("candidates").update({ status: "Offer" }).eq("id", data.candidateId);
      }

      return { ok: mail.ok, id, delivered: mail.delivered, message: mail.message };
    },
  );

export const setOfferStatus = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        status: z.enum(["Drafted", "Sent", "Signed", "Declined"]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const { error } = await client
      .from("offers")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("employer_id", userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `Offer marked ${data.status}` };
  });
