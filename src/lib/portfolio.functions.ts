import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Project = {
  id: string;
  title: string;
  role: string;
  year: string;
  tags: string[];
  desc: string;
  gradient: string;
  url: string;
};

export const PORTFOLIO_TEMPLATES: {
  id: string;
  name: string;
  blurb: string;
  gradient: string;
  tags: string[];
}[] = [
  {
    id: "case-study",
    name: "Product case study",
    blurb: "Problem, approach, outcome — the format hiring managers scan fastest.",
    gradient: "from-brand/70 to-brand/30",
    tags: ["Case study", "Product"],
  },
  {
    id: "engineering",
    name: "Engineering deep dive",
    blurb: "Architecture, trade-offs and measurable performance wins.",
    gradient: "from-accent/70 to-accent/30",
    tags: ["Engineering", "Architecture"],
  },
  {
    id: "design-system",
    name: "Design system",
    blurb: "Tokens, components and adoption metrics across teams.",
    gradient: "from-brand/60 to-accent/50",
    tags: ["Design system", "UI"],
  },
  {
    id: "data",
    name: "Data / ML project",
    blurb: "Dataset, model, evaluation and the decision it changed.",
    gradient: "from-accent/60 to-brand/40",
    tags: ["Data", "ML"],
  },
];

const projectInput = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).max(160),
  role: z.string().max(160).default(""),
  year: z.string().max(20).default(""),
  tags: z.array(z.string().max(40)).max(12).default([]),
  desc: z.string().max(4000).default(""),
  gradient: z.string().max(120).default("from-brand/60 to-accent/60"),
  url: z.string().max(400).default(""),
});

function map(r: Record<string, unknown>): Project {
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    role: String(r.role ?? ""),
    year: String(r.year ?? ""),
    tags: (r.tags as string[]) ?? [],
    desc: String(r.description ?? ""),
    gradient: String(r.gradient ?? "from-brand/60 to-accent/60"),
    url: String(r.url ?? ""),
  };
}

export const listProjects = createServerFn({ method: "GET" }).handler(
  async (): Promise<Project[]> => {
    const { db, currentUserId } = await import("./workspace.server");
    const client = await db();
    if (!client) return [];
    const userId = await currentUserId();
    const { data } = await client
      .from("portfolio_projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data ?? []).map(map);
  },
);

export const saveProject = createServerFn({ method: "POST" })
  .validator((d: unknown) => projectInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; message: string }> => {
    const { db, currentUserId, newId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const id = data.id ?? newId("PRJ");
    const { error } = await client.from("portfolio_projects").upsert({
      id,
      user_id: userId,
      title: data.title,
      role: data.role,
      year: data.year,
      tags: data.tags,
      description: data.desc,
      gradient: data.gradient,
      url: data.url,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, id, message: data.id ? "Project updated" : "Project added" };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const { error } = await client
      .from("portfolio_projects")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: "Project removed" };
  });

/** Drafts a project from one of the templates using the candidate's profile. */
export const draftFromTemplate = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        templateId: z.string().min(1),
        title: z.string().max(160).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; message: string }> => {
    const { db, currentUserId, newId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const tpl =
      PORTFOLIO_TEMPLATES.find((t) => t.id === data.templateId) ?? PORTFOLIO_TEMPLATES[0];

    const { data: profile } = await client
      .from("profiles")
      .select("full_name, headline, skills, resume_text")
      .eq("id", userId)
      .maybeSingle();

    const title = data.title || `${tpl.name} — ${profile?.headline || "New project"}`;
    let desc = `${tpl.blurb}`;
    try {
      const { runAgent } = await import("./ai-provider.server");
      const { text } = await runAgent({
        kind: "agent",
        system:
          "You write concise portfolio project summaries. 3 sentences max: the problem, what the person built, the measurable outcome. No headings, no markdown.",
        prompt: `Template: ${tpl.name} (${tpl.blurb})\nCandidate headline: ${profile?.headline ?? ""}\nSkills: ${(profile?.skills ?? []).join(", ")}\nResume excerpt: ${String(profile?.resume_text ?? "").slice(0, 2000)}`,
        maxOutputTokens: 300,
      });
      if (text.trim()) desc = text.trim();
    } catch {
      /* fall back to the template blurb */
    }

    const id = newId("PRJ");
    const { error } = await client.from("portfolio_projects").insert({
      id,
      user_id: userId,
      title,
      role: profile?.headline ?? "",
      year: String(new Date().getFullYear()),
      tags: tpl.tags,
      description: desc,
      gradient: tpl.gradient,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, id, message: `Drafted from “${tpl.name}”` };
  });
