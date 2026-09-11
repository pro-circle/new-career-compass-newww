import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ParsedJob, Evaluation } from "./joblink.server";
import type {
  Challenge,
  TrainingQuestion,
  Verdict,
  WaypointId,
  WaypointState,
} from "./training.server";

export type TrainingSession = {
  id: string;
  url: string;
  job: ParsedJob;
  evaluation: Evaluation | null;
  questions: TrainingQuestion[];
  waypoints: Record<string, WaypointState>;
  coverLetter: string;
  templateId: string;
  resumeBefore: number;
  resumeAfter: number;
  keywordGaps: string[];
  createdAt: string;
};

export type TrainingAnswer = {
  id: string;
  questionId: string;
  question: string;
  round: string;
  transcript: string;
  score: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  words: number;
  fillers: number;
  wpm: number;
  durationSec: number;
};

export type TrainingChallenge = Challenge & {
  code: string;
  verdict: Verdict | null;
  elapsedSec: number;
};

export type TrainingBundle = {
  session: TrainingSession | null;
  answers: TrainingAnswer[];
  challenges: TrainingChallenge[];
  message?: string;
};

const jobSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  location: z.string().default(""),
  type: z.string().default(""),
  salary: z.string().default(""),
  description: z.string().default(""),
  requirements: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  companyDetails: z.string().default(""),
  aiUsed: z.boolean().default(false),
  partial: z.boolean().default(false),
});

function toSession(r: Record<string, unknown>): TrainingSession {
  return {
    id: String(r.id),
    url: String(r.url ?? ""),
    job: r.job as ParsedJob,
    evaluation: (r.evaluation as Evaluation | null) ?? null,
    questions: (r.questions as TrainingQuestion[]) ?? [],
    waypoints: (r.waypoints as Record<string, WaypointState>) ?? {},
    coverLetter: String(r.cover_letter ?? ""),
    templateId: String(r.template_id ?? ""),
    resumeBefore: Number(r.resume_before ?? 0),
    resumeAfter: Number(r.resume_after ?? 0),
    keywordGaps: (r.keyword_gaps as string[]) ?? [],
    createdAt: String(r.created_at ?? ""),
  };
}

function toAnswer(r: Record<string, unknown>): TrainingAnswer {
  return {
    id: String(r.id),
    questionId: String(r.question_id ?? ""),
    question: String(r.question ?? ""),
    round: String(r.round ?? ""),
    transcript: String(r.transcript ?? ""),
    score: Number(r.score ?? 0),
    strengths: (r.strengths as string[]) ?? [],
    improvements: (r.improvements as string[]) ?? [],
    feedback: String(r.feedback ?? ""),
    words: Number(r.words ?? 0),
    fillers: Number(r.fillers ?? 0),
    wpm: Number(r.wpm ?? 0),
    durationSec: Number(r.duration_sec ?? 0),
  };
}

function toChallenge(r: Record<string, unknown>): TrainingChallenge {
  return {
    id: String(r.id),
    difficulty: String(r.difficulty ?? "easy") as Challenge["difficulty"],
    title: String(r.title ?? ""),
    prompt: String(r.prompt ?? ""),
    functionName: String(r.function_name ?? ""),
    signature: String(r.signature ?? ""),
    starter: String(r.starter ?? ""),
    timeLimitSec: Number(r.time_limit_sec ?? 600),
    tests: (r.tests as Challenge["tests"]) ?? [],
    code: String(r.code ?? ""),
    verdict: (r.verdict as Verdict | null) ?? null,
    elapsedSec: Number(r.elapsed_sec ?? 0),
  };
}

/* ------------------------------------------------------------------ */

export const startTraining = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        url: z.string().min(3),
        job: jobSchema,
        evaluation: z.any().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; message: string }> => {
    const { db, currentUserId, newId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };
    const userId = await currentUserId();
    const id = newId("TRN");
    const { error } = await client.from("training_sessions").insert({
      id,
      user_id: userId,
      url: data.url,
      job: data.job,
      evaluation: data.evaluation ?? null,
      questions: [],
      waypoints: { analysis: { status: "done", score: data.evaluation?.matchScore ?? undefined } },
      keyword_gaps: [],
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, id, message: "Training session created" };
  });

export const getTraining = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<TrainingBundle> => {
    const { db, currentUserId, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { session: null, answers: [], challenges: [], message: NO_DB };
    const userId = await currentUserId();
    const { data: row } = await client
      .from("training_sessions")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return { session: null, answers: [], challenges: [], message: "Session not found" };
    const [{ data: answers }, { data: challenges }] = await Promise.all([
      client
        .from("training_answers")
        .select("*")
        .eq("session_id", data.id)
        .order("created_at", { ascending: true }),
      client
        .from("training_challenges")
        .select("*")
        .eq("session_id", data.id)
        .order("created_at", { ascending: true }),
    ]);
    return {
      session: toSession(row),
      answers: (answers ?? []).map(toAnswer),
      challenges: (challenges ?? []).map(toChallenge),
    };
  });

export const listTrainings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; title: string; company: string; createdAt: string }[]> => {
    const { db, currentUserId } = await import("./workspace.server");
    const client = await db();
    if (!client) return [];
    const userId = await currentUserId();
    const { data } = await client
      .from("training_sessions")
      .select("id, job, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      title: String((r.job as ParsedJob)?.title ?? "Role"),
      company: String((r.job as ParsedJob)?.company ?? ""),
      createdAt: String(r.created_at),
    }));
  },
);

async function loadSession(id: string) {
  const { db, currentUserId } = await import("./workspace.server");
  const client = await db();
  if (!client) return null;
  const userId = await currentUserId();
  const { data } = await client
    .from("training_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { client, userId, session: toSession(data) };
}

async function setWaypoint(
  client: NonNullable<Awaited<ReturnType<typeof import("./workspace.server").db>>>,
  session: TrainingSession,
  step: WaypointId,
  state: WaypointState,
  extra: Record<string, unknown> = {},
) {
  const waypoints = { ...session.waypoints, [step]: state };
  const done = ["resume", "cover", "portfolio", "interview", "coding"].every(
    (k) => waypoints[k]?.status === "done" || waypoints[k]?.status === "skipped",
  );
  if (done) waypoints.ready = { status: "done" };
  await client
    .from("training_sessions")
    .update({ waypoints, updated_at: new Date().toISOString(), ...extra })
    .eq("id", session.id);
  return waypoints;
}

export const updateWaypoint = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        step: z.string().min(1),
        status: z.enum(["todo", "active", "done", "skipped"]),
        score: z.number().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const loaded = await loadSession(data.id);
    if (!loaded) return { ok: false, message: "Session not found" };
    await setWaypoint(loaded.client, loaded.session, data.step as WaypointId, {
      status: data.status,
      ...(data.score !== undefined ? { score: data.score } : {}),
    });
    return { ok: true, message: "Progress saved" };
  });

/* ---------------------------- resume ------------------------------ */

export const tailorResumeForJob = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(
    async ({
      data,
    }): Promise<{
      ok: boolean;
      message: string;
      before?: number;
      after?: number;
      gaps?: string[];
    }> => {
      const loaded = await loadSession(data.id);
      if (!loaded) return { ok: false, message: "Session not found" };
      const { client, userId, session } = loaded;

      const { data: resumeRow } = await client
        .from("resumes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!resumeRow) {
        return { ok: false, message: "Add a resume in Resume Studio first." };
      }
      const before = Number(resumeRow.ats_score ?? 0);
      const plain = String(resumeRow.plain_text ?? "");
      if (plain.trim().length < 40) {
        return { ok: false, message: "Your resume is empty — import or write it first." };
      }

      const { keywordGaps } = await import("./training.server");
      const gaps = keywordGaps(session.job, plain);

      let after = before;
      let content = resumeRow.content;
      try {
        const { runAgent } = await import("./ai-provider.server");
        const { text } = await runAgent({
          kind: "agent",
          system:
            'You tailor a resume to one specific job posting. Return ONLY JSON: {"score":0-100,"optimized":{"fullName","headline","location","email","summary","experience":[{"company","title","dates","bullets":[]}],"education":[{"school","degree","dates"}],"skills":[]}}. Keep every fact truthful — rephrase, reorder and surface relevant work; never invent employers, dates or credentials. Mirror the posting\'s exact keywords where the candidate genuinely has them. score = ATS match of the OPTIMIZED resume against this posting.',
          prompt: `Posting: ${session.job.title} at ${session.job.company}\nRequirements:\n- ${session.job.requirements.slice(0, 14).join("\n- ")}\nKeywords: ${session.job.tags.join(", ")}\n\nCurrent resume JSON:\n${JSON.stringify(resumeRow.content).slice(0, 10000)}`,
          maxOutputTokens: 2600,
        });
        const m = text.match(/\{[\s\S]*\}/);
        const parsed = m ? (JSON.parse(m[0]) as { score?: number; optimized?: unknown }) : null;
        if (parsed?.optimized) {
          content = parsed.optimized;
          after = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? before))));
        }
      } catch {
        // Deterministic fallback: coverage of the posting's keywords.
        const total = session.job.tags.length || 1;
        const hit = session.job.tags.filter((t) => plain.toLowerCase().includes(t.toLowerCase()));
        after = Math.round((hit.length / total) * 100);
      }

      const { renderPlainText } = await import("./resume.functions");
      const plainText = renderPlainText(content as Parameters<typeof renderPlainText>[0]);
      await client
        .from("resumes")
        .update({
          content,
          plain_text: plainText,
          ats_score: after,
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(resumeRow.id));
      await client
        .from("profiles")
        .update({ resume_text: plainText, resume_json: content })
        .eq("id", userId);

      await setWaypoint(
        client,
        session,
        "resume",
        { status: "done", score: after },
        { resume_before: before, resume_after: after, keyword_gaps: gaps },
      );
      return { ok: true, message: `Resume tailored · ATS ${after}`, before, after, gaps };
    },
  );

/* -------------------------- cover letter -------------------------- */

export const makeCoverLetter = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; letter?: string }> => {
    const loaded = await loadSession(data.id);
    if (!loaded) return { ok: false, message: "Session not found" };
    const { client, userId, session } = loaded;

    const { data: profile } = await client
      .from("profiles")
      .select("full_name, headline, resume_text")
      .eq("id", userId)
      .maybeSingle();

    try {
      const { coverLetterFor } = await import("./training.server");
      const letter = await coverLetterFor(
        session.job,
        (profile ?? {}) as Record<string, unknown>,
        String(profile?.resume_text ?? ""),
      );
      if (!letter) return { ok: false, message: "The draft came back empty — try again." };
      await setWaypoint(client, session, "cover", { status: "done" }, { cover_letter: letter });
      return { ok: true, message: "Cover letter drafted", letter };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Draft failed" };
    }
  });

/* --------------------------- portfolio ---------------------------- */

export type PortfolioFill = {
  templateId: string;
  fullName: string;
  headline: string;
  location: string;
  email: string;
  summary: string;
  skills: string[];
  projects: { title: string; role: string; year: string; desc: string; tags: string[] }[];
  experience: { company: string; title: string; dates: string; bullets: string[] }[];
};

export const applyPortfolioTemplate = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.string().min(1), templateId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; fill?: PortfolioFill }> => {
    const loaded = await loadSession(data.id);
    if (!loaded) return { ok: false, message: "Session not found" };
    const { client, userId, session } = loaded;

    const [{ data: profile }, { data: projects }, { data: resumeRow }] = await Promise.all([
      client
        .from("profiles")
        .select("full_name, headline, location, email, skills, resume_json")
        .eq("id", userId)
        .maybeSingle(),
      client
        .from("portfolio_projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      client
        .from("resumes")
        .select("content")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const resumeContent = (resumeRow?.content ?? profile?.resume_json ?? {}) as {
      summary?: string;
      experience?: PortfolioFill["experience"];
      skills?: string[];
    };

    const fill: PortfolioFill = {
      templateId: data.templateId,
      fullName: String(profile?.full_name ?? ""),
      headline: String(profile?.headline ?? ""),
      location: String(profile?.location ?? ""),
      email: String(profile?.email ?? ""),
      summary: String(resumeContent.summary ?? ""),
      skills: ((profile?.skills as string[]) ?? resumeContent.skills ?? []).slice(0, 24),
      projects: (projects ?? []).slice(0, 8).map((p) => ({
        title: String(p.title ?? ""),
        role: String(p.role ?? ""),
        year: String(p.year ?? ""),
        desc: String(p.description ?? ""),
        tags: (p.tags as string[]) ?? [],
      })),
      experience: (resumeContent.experience ?? []).slice(0, 6),
    };

    await setWaypoint(
      client,
      session,
      "portfolio",
      { status: "done" },
      { template_id: data.templateId },
    );
    return { ok: true, message: "Template selected", fill };
  });

/* --------------------------- interview ---------------------------- */

export const makeQuestions = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.string().min(1), count: z.number().min(3).max(12).default(8) }).parse(d),
  )
  .handler(
    async ({ data }): Promise<{ ok: boolean; message: string; questions?: TrainingQuestion[] }> => {
      const loaded = await loadSession(data.id);
      if (!loaded) return { ok: false, message: "Session not found" };
      const { client, userId, session } = loaded;
      const { data: profile } = await client
        .from("profiles")
        .select("headline, skills, years_exp")
        .eq("id", userId)
        .maybeSingle();

      const { generateQuestions } = await import("./training.server");
      const questions = await generateQuestions(
        session.job,
        (profile ?? {}) as Record<string, unknown>,
        data.count,
      );
      await client
        .from("training_sessions")
        .update({ questions, updated_at: new Date().toISOString() })
        .eq("id", session.id);
      await setWaypoint(client, session, "interview", { status: "active" });
      return { ok: true, message: `${questions.length} questions ready`, questions };
    },
  );

export const submitAnswer = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        questionId: z.string().min(1),
        question: z.string().min(1),
        round: z.string().default("Interview"),
        transcript: z.string().max(20000),
        durationSec: z.number().min(0).max(3600),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; answer?: TrainingAnswer }> => {
    const loaded = await loadSession(data.id);
    if (!loaded) return { ok: false, message: "Session not found" };
    const { client, userId, session } = loaded;

    const { speechStats, scoreAnswer } = await import("./training.server");
    const stats = speechStats(data.transcript, data.durationSec);
    const scored = await scoreAnswer(data.question, data.transcript, session.job, stats);

    const { newId } = await import("./workspace.server");
    const row = {
      id: newId("ANS"),
      session_id: session.id,
      user_id: userId,
      question_id: data.questionId,
      question: data.question,
      round: data.round,
      transcript: data.transcript,
      score: scored.score,
      strengths: scored.strengths,
      improvements: scored.improvements,
      feedback: scored.feedback,
      words: stats.words,
      fillers: stats.fillers,
      wpm: stats.wpm,
      duration_sec: stats.durationSec,
    };
    const { error } = await client.from("training_answers").insert(row);
    if (error) return { ok: false, message: error.message };

    const { data: all } = await client
      .from("training_answers")
      .select("score")
      .eq("session_id", session.id);
    const scores = (all ?? []).map((a) => Number(a.score ?? 0));
    const avg = scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0;
    const answeredAll =
      (all ?? []).length >= session.questions.length && session.questions.length > 0;
    await setWaypoint(client, session, "interview", {
      status: answeredAll ? "done" : "active",
      score: avg,
    });

    return { ok: true, message: `Scored ${scored.score}/100`, answer: toAnswer(row) };
  });

/* ---------------------------- coding ------------------------------ */

export const makeChallenge = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.string().min(1), difficulty: z.enum(["easy", "medium", "hard"]) }).parse(d),
  )
  .handler(
    async ({ data }): Promise<{ ok: boolean; message: string; challenge?: TrainingChallenge }> => {
      const loaded = await loadSession(data.id);
      if (!loaded) return { ok: false, message: "Session not found" };
      const { client, userId, session } = loaded;

      const { generateChallenge } = await import("./training.server");
      const c = await generateChallenge(session.job, data.difficulty);
      const row = {
        id: c.id,
        session_id: session.id,
        user_id: userId,
        difficulty: c.difficulty,
        title: c.title,
        prompt: c.prompt,
        function_name: c.functionName,
        signature: c.signature,
        starter: c.starter,
        time_limit_sec: c.timeLimitSec,
        tests: c.tests,
        code: c.starter,
        elapsed_sec: 0,
      };
      const { error } = await client.from("training_challenges").insert(row);
      if (error) return { ok: false, message: error.message };
      await setWaypoint(client, session, "coding", { status: "active" });
      return {
        ok: true,
        message: `${data.difficulty} challenge ready`,
        challenge: toChallenge(row),
      };
    },
  );

export const submitChallenge = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().min(1),
        challengeId: z.string().min(1),
        code: z.string().max(20000),
        elapsedSec: z.number().min(0).max(7200),
        timedOut: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; verdict?: Verdict }> => {
    const loaded = await loadSession(data.id);
    if (!loaded) return { ok: false, message: "Session not found" };
    const { client, userId, session } = loaded;

    const { data: row } = await client
      .from("training_challenges")
      .select("*")
      .eq("id", data.challengeId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return { ok: false, message: "Challenge not found" };

    const challenge = toChallenge(row);
    const { verifySolution } = await import("./training.server");
    const verdict = await verifySolution(challenge, data.code, data.timedOut);

    await client
      .from("training_challenges")
      .update({
        code: data.code,
        verdict,
        elapsed_sec: Math.round(data.elapsedSec),
        submitted_at: new Date().toISOString(),
      })
      .eq("id", challenge.id);

    const pct = verdict.total ? Math.round((verdict.passedCount / verdict.total) * 100) : 0;
    await setWaypoint(client, session, "coding", {
      status: verdict.passed ? "done" : "active",
      score: pct,
    });
    return {
      ok: true,
      message: verdict.passed
        ? "All tests passed"
        : `${verdict.passedCount}/${verdict.total} tests passed`,
      verdict,
    };
  });
