import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type EmailTemplate = {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
};

/** Templates every new workspace starts with (written to the DB on first load). */
const STARTERS: Omit<EmailTemplate, "id">[] = [
  {
    name: "Cold outreach",
    category: "Sourcing",
    subject: "Loved your work at {{previousCompany}} — {{roleTitle}}?",
    body: "Hi {{firstName}},\n\nYour work on {{portfolioHighlight}} caught our eye. We would love 15 minutes to share what we're building.\n\nAre you open to a chat this week?\n\n— {{recruiterName}}",
  },
  {
    name: "Screening invitation",
    category: "Screening",
    subject: "Next step: 30-min chat with {{recruiterName}}",
    body: "Hi {{firstName}},\n\nThanks for applying to the {{roleTitle}} position. We'd love to set up a 30-minute intro call.\n\nPlease pick a time: {{schedulingLink}}\n\n— {{recruiterName}}",
  },
  {
    name: "Respectful rejection",
    category: "Rejection",
    subject: "Update on your application",
    body: "Hi {{firstName}},\n\nThank you for the time you invested with our team. We've decided to move forward with other candidates for this role.\n\nWe were genuinely impressed by {{strength}} and would love to stay in touch.",
  },
];

const templateInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(120),
  category: z.string().max(60).default("General"),
  subject: z.string().max(300).default(""),
  body: z.string().max(20000).default(""),
});

export const listTemplates = createServerFn({ method: "GET" }).handler(
  async (): Promise<EmailTemplate[]> => {
    const { db, currentUserId, newId } = await import("./workspace.server");
    const client = await db();
    if (!client) return [];
    const userId = await currentUserId();
    const { data } = await client
      .from("email_templates")
      .select("*")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });

    let rows = data ?? [];
    if (!rows.length) {
      const seeded = STARTERS.map((t) => ({ id: newId("TPL"), owner_id: userId, ...t }));
      await client.from("email_templates").insert(seeded);
      rows = seeded as never[];
    }
    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      category: String(r.category ?? "General"),
      subject: String(r.subject ?? ""),
      body: String(r.body ?? ""),
    }));
  },
);

export const saveTemplate = createServerFn({ method: "POST" })
  .validator((d: unknown) => templateInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; message: string }> => {
    const { db, currentUserId, newId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const id = data.id ?? newId("TPL");
    const { error } = await client.from("email_templates").upsert({
      id,
      owner_id: userId,
      name: data.name,
      category: data.category,
      subject: data.subject,
      body: data.body,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, id, message: data.id ? "Template saved" : "Template created" };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const { error } = await client
      .from("email_templates")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Template deleted" };
  });
