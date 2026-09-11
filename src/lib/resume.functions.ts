import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ResumeContent = {
  fullName: string;
  headline: string;
  location: string;
  email: string;
  summary: string;
  experience: { company: string; title: string; dates: string; bullets: string[] }[];
  education: { school: string; degree: string; dates: string }[];
  skills: string[];
};

export type ResumeInsightRow = { title: string; body: string; done: boolean };

export type ResumeRecord = {
  id: string;
  title: string;
  content: ResumeContent;
  plainText: string;
  atsScore: number;
  insights: ResumeInsightRow[];
  language: string;
};

export const EMPTY_CONTENT: ResumeContent = {
  fullName: "",
  headline: "",
  location: "",
  email: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
};

const contentSchema = z.object({
  fullName: z.string().max(160).default(""),
  headline: z.string().max(200).default(""),
  location: z.string().max(160).default(""),
  email: z.string().max(200).default(""),
  summary: z.string().max(6000).default(""),
  experience: z
    .array(
      z.object({
        company: z.string().max(160).default(""),
        title: z.string().max(160).default(""),
        dates: z.string().max(80).default(""),
        bullets: z.array(z.string().max(600)).max(12).default([]),
      }),
    )
    .max(20)
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string().max(160).default(""),
        degree: z.string().max(160).default(""),
        dates: z.string().max(80).default(""),
      }),
    )
    .max(10)
    .default([]),
  skills: z.array(z.string().max(60)).max(60).default([]),
});

function toRecord(r: Record<string, unknown> | null | undefined): ResumeRecord | null {
  if (!r) return null;
  return {
    id: String(r.id),
    title: String(r.title ?? "My resume"),
    content: { ...EMPTY_CONTENT, ...((r.content as Partial<ResumeContent>) ?? {}) },
    plainText: String(r.plain_text ?? ""),
    atsScore: Number(r.ats_score ?? 0),
    insights: ((r.insights as ResumeInsightRow[]) ?? []).slice(0, 12),
    language: String(r.language ?? "English"),
  };
}

/** Renders the structured resume into ATS-safe plain text. */
export function renderPlainText(c: ResumeContent): string {
  const lines: string[] = [];
  if (c.fullName) lines.push(c.fullName.toUpperCase());
  const meta = [c.headline, c.location, c.email].filter(Boolean).join(" · ");
  if (meta) lines.push(meta);
  if (c.summary) lines.push("", "SUMMARY", c.summary);
  if (c.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const e of c.experience) {
      lines.push(`${[e.title, e.company].filter(Boolean).join(" — ")} (${e.dates})`);
      for (const b of e.bullets) lines.push(`• ${b}`);
    }
  }
  if (c.education.length) {
    lines.push("", "EDUCATION");
    for (const e of c.education)
      lines.push(`${[e.degree, e.school].filter(Boolean).join(" — ")} (${e.dates})`);
  }
  if (c.skills.length) lines.push("", "SKILLS", c.skills.join(", "));
  return lines.join("\n");
}

function jsonFrom(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function loadOrCreate(client: NonNullable<Awaited<ReturnType<typeof import("./workspace.server").db>>>, userId: string) {
  const { newId } = await import("./workspace.server");
  const { data } = await client
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) return data as Record<string, unknown>;

  // Bootstrap from the profile so the studio is never empty.
  const { data: p } = await client
    .from("profiles")
    .select("full_name, headline, location, email, skills, resume_text, resume_json")
    .eq("id", userId)
    .maybeSingle();
  const parsed = (p?.resume_json as Partial<ResumeContent> | null) ?? null;
  const content: ResumeContent = {
    ...EMPTY_CONTENT,
    fullName: String(p?.full_name ?? ""),
    headline: String(p?.headline ?? ""),
    location: String(p?.location ?? ""),
    email: String(p?.email ?? ""),
    summary: String(parsed?.summary ?? ""),
    experience: (parsed?.experience as ResumeContent["experience"]) ?? [],
    education: (parsed?.education as ResumeContent["education"]) ?? [],
    skills: (parsed?.skills as string[]) ?? (p?.skills as string[]) ?? [],
  };
  const row = {
    id: newId("RES"),
    user_id: userId,
    title: "My resume",
    content,
    plain_text: String(p?.resume_text ?? renderPlainText(content)),
    ats_score: 0,
    insights: [],
    language: "English",
    updated_at: new Date().toISOString(),
  };
  await client.from("resumes").insert(row);
  return row as unknown as Record<string, unknown>;
}

export const getResume = createServerFn({ method: "GET" }).handler(
  async (): Promise<ResumeRecord | null> => {
    const { db, currentUserId } = await import("./workspace.server");
    const client = await db();
    if (!client) return null;
    const userId = await currentUserId();
    return toRecord(await loadOrCreate(client, userId));
  },
);

export const saveResume = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ title: z.string().max(160).default("My resume"), content: contentSchema }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; plainText?: string }> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const existing = await loadOrCreate(client, userId);
    const plainText = renderPlainText(data.content as ResumeContent);
    const { error } = await client
      .from("resumes")
      .update({
        title: data.title,
        content: data.content,
        plain_text: plainText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(existing.id));
    if (error) return { ok: false, message: error.message };
    await client
      .from("profiles")
      .update({ resume_text: plainText, resume_json: data.content })
      .eq("id", userId);
    return { ok: true, message: "Resume saved", plainText };
  });

/** Parses pasted / uploaded resume text into the structured resume. */
export const importResumeText = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ text: z.string().min(20).max(60000), fileName: z.string().max(200).default("") }).parse(d),
  )
  .handler(
    async ({ data }): Promise<{ ok: boolean; message: string; resume?: ResumeRecord | null }> => {
      const { db, currentUserId, NO_DB } = await import("./workspace.server");
      const client = await db();
      if (!client) return { ok: false, message: NO_DB };
      const userId = await currentUserId();
      const existing = await loadOrCreate(client, userId);

      let content: ResumeContent = { ...EMPTY_CONTENT };
      try {
        const { runAgent } = await import("./ai-provider.server");
        const { text } = await runAgent({
          kind: "agent",
          system:
            'Extract a resume into strict JSON: {"fullName","headline","location","email","summary","experience":[{"company","title","dates","bullets":[]}],"education":[{"school","degree","dates"}],"skills":[]}. Return ONLY JSON.',
          prompt: data.text.slice(0, 20000),
          maxOutputTokens: 2000,
        });
        const parsed = jsonFrom(text);
        if (parsed) content = { ...EMPTY_CONTENT, ...(parsed as Partial<ResumeContent>) };
      } catch {
        /* fall through to heuristics */
      }

      if (!content.fullName) {
        const firstLine = data.text.trim().split(/\r?\n/)[0]?.slice(0, 80) ?? "";
        content.fullName = firstLine;
      }
      if (!content.summary) content.summary = data.text.trim().slice(0, 400);

      const plainText = renderPlainText(content) || data.text.slice(0, 20000);
      const { error } = await client
        .from("resumes")
        .update({
          title: data.fileName || "Imported resume",
          content,
          plain_text: plainText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(existing.id));
      if (error) return { ok: false, message: error.message };

      await client
        .from("profiles")
        .update({ resume_text: data.text.slice(0, 20000), resume_json: content })
        .eq("id", userId);

      const { data: fresh } = await client
        .from("resumes")
        .select("*")
        .eq("id", String(existing.id))
        .maybeSingle();
      return { ok: true, message: "Resume parsed and saved", resume: toRecord(fresh) };
    },
  );

/** Scores + rewrites the resume, persisting both the score and the rewrite. */
export const optimizeResume = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ apply: z.boolean().default(true) }).parse(d))
  .handler(
    async ({ data }): Promise<{ ok: boolean; message: string; resume?: ResumeRecord | null }> => {
      const { db, currentUserId, NO_DB } = await import("./workspace.server");
      const client = await db();
      if (!client) return { ok: false, message: NO_DB };
      const userId = await currentUserId();
      const existing = await loadOrCreate(client, userId);
      const current = toRecord(existing)!;
      const source = current.plainText || renderPlainText(current.content);
      if (source.trim().length < 40) {
        return { ok: false, message: "Add or import a resume first — there is nothing to optimize." };
      }

      let score = 0;
      let insights: ResumeInsightRow[] = [];
      let optimized: ResumeContent | null = null;

      try {
        const { runAgent } = await import("./ai-provider.server");
        const { text } = await runAgent({
          kind: "agent",
          system:
            'You are an ATS resume auditor. Return ONLY JSON: {"score": 0-100, "insights":[{"title","body","done":false}], "optimized": {"fullName","headline","location","email","summary","experience":[{"company","title","dates","bullets":[]}],"education":[{"school","degree","dates"}],"skills":[]}}. The optimized resume must keep every fact truthful, use strong action verbs and quantified bullets.',
          prompt: `Current resume JSON:\n${JSON.stringify(current.content).slice(0, 12000)}\n\nPlain text:\n${source.slice(0, 8000)}`,
          maxOutputTokens: 2600,
        });
        const parsed = jsonFrom(text) as {
          score?: number;
          insights?: ResumeInsightRow[];
          optimized?: Partial<ResumeContent>;
        } | null;
        if (parsed) {
          score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
          insights = (parsed.insights ?? []).slice(0, 8);
          if (parsed.optimized) optimized = { ...EMPTY_CONTENT, ...parsed.optimized };
        }
      } catch {
        /* deterministic fallback below */
      }

      if (!score) {
        // Deterministic heuristic scoring when no AI provider is reachable.
        const c = current.content;
        const bullets = c.experience.flatMap((e) => e.bullets);
        const quantified = bullets.filter((b) => /\d/.test(b)).length;
        score = Math.min(
          98,
          30 +
            (c.summary ? 12 : 0) +
            Math.min(20, c.skills.length * 2) +
            Math.min(20, c.experience.length * 5) +
            Math.min(16, quantified * 4),
        );
        insights = [
          {
            title: "Add quantifiable impact metrics",
            body: `${quantified} of ${bullets.length || 0} bullets contain numbers. Aim for most of them.`,
            done: bullets.length > 0 && quantified >= bullets.length / 2,
          },
          {
            title: "Strengthen keyword coverage",
            body: `${c.skills.length} skills listed. Mirror the exact keywords from your target job posts.`,
            done: c.skills.length >= 10,
          },
          {
            title: "Write a targeted summary",
            body: c.summary ? "Summary present — keep it under 4 lines." : "No summary yet — add 2-3 lines.",
            done: !!c.summary,
          },
        ];
      }

      const nextContent = data.apply && optimized ? optimized : current.content;
      const plainText = renderPlainText(nextContent);
      await client
        .from("resumes")
        .update({
          content: nextContent,
          plain_text: plainText,
          ats_score: score,
          insights,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id);
      await client
        .from("profiles")
        .update({ resume_text: plainText, resume_json: nextContent })
        .eq("id", userId);

      const { data: fresh } = await client
        .from("resumes")
        .select("*")
        .eq("id", current.id)
        .maybeSingle();
      return {
        ok: true,
        message: optimized && data.apply ? `Resume rewritten · ATS ${score}` : `ATS score: ${score}`,
        resume: toRecord(fresh),
      };
    },
  );

/** Translates the stored resume and returns the translated plain text. */
export const translateResume = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ language: z.string().min(2).max(40) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; text?: string }> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const current = toRecord(await loadOrCreate(client, userId))!;
    const source = current.plainText || renderPlainText(current.content);
    if (source.trim().length < 20) {
      return { ok: false, message: "Add or import a resume first." };
    }
    try {
      const { runAgent } = await import("./ai-provider.server");
      const { text } = await runAgent({
        kind: "agent",
        system: `Translate the resume into ${data.language}. Keep the plain-text ATS layout, section headings and bullet markers. Return only the translated resume.`,
        prompt: source.slice(0, 12000),
        maxOutputTokens: 2600,
      });
      if (!text.trim()) return { ok: false, message: "Translation came back empty — try again." };
      return { ok: true, message: `Translated to ${data.language}`, text: text.trim() };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Translation failed" };
    }
  });
