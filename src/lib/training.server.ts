/**
 * Server-only logic for the guided training journey.
 *
 * Everything here is real work: AI generation through the existing provider
 * router (with deterministic fallbacks when no key is configured) and a
 * server-side code runner for the coding challenge. No mock payloads.
 */
import type { ParsedJob, Evaluation } from "./joblink.server";

export type { WaypointId, WaypointState } from "./training.types";
export { WAYPOINTS } from "./training.types";

export type TrainingQuestion = {
  id: string;
  round: string;
  question: string;
  topic: string;
  why: string;
};

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type Challenge = {
  id: string;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  prompt: string;
  functionName: string;
  signature: string;
  starter: string;
  timeLimitSec: number;
  tests: { input: Json[]; expected: Json }[];
};

export type Verdict = {
  passed: boolean;
  passedCount: number;
  total: number;
  results: { input: Json[]; expected: Json; got: Json; ok: boolean; error?: string }[];
  feedback: string;
  timedOut: boolean;
};

const TIME_BY_DIFFICULTY = { easy: 10 * 60, medium: 20 * 60, hard: 35 * 60 } as const;

function jsonFrom(text: string): unknown {
  const direct = text.trim();
  try {
    return JSON.parse(direct);
  } catch {
    const m = direct.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function rid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------------------------------------------ */
/* Interview questions                                                 */
/* ------------------------------------------------------------------ */

export async function generateQuestions(
  job: ParsedJob,
  profile: Record<string, unknown>,
  count = 8,
): Promise<TrainingQuestion[]> {
  const skills = (job.tags ?? []).slice(0, 12).join(", ");
  try {
    const { runAgent } = await import("./ai-provider.server");
    const { text } = await runAgent({
      kind: "agent",
      system:
        'You write interview questions for a specific company and role. Return ONLY JSON: {"questions":[{"round":"Screening|Technical|System design|Behavioural|Hiring manager","question":"...","topic":"2-4 word searchable topic","why":"one line on what the interviewer is testing"}]}. Questions must reference the company, the product domain and the exact technologies in the posting. No generic filler.',
      prompt: `Company: ${job.company || "the company"}\nRole: ${job.title}\nLocation: ${job.location}\nKey skills: ${skills}\nRequirements:\n- ${job.requirements.slice(0, 12).join("\n- ")}\nDescription: ${job.description.slice(0, 2500)}\n\nCandidate headline: ${String(profile.headline ?? "")}\nCandidate skills: ${((profile.skills as string[]) ?? []).join(", ")}\nYears of experience: ${String(profile.years_exp ?? "")}\n\nWrite exactly ${count} questions across the rounds, hardest last.`,
      maxOutputTokens: 1600,
    });
    const parsed = jsonFrom(text) as { questions?: Omit<TrainingQuestion, "id">[] } | null;
    const list = parsed?.questions ?? [];
    if (list.length) {
      return list.slice(0, count).map((q) => ({
        id: rid("Q"),
        round: String(q.round ?? "Interview"),
        question: String(q.question ?? "").trim(),
        topic: String(q.topic ?? "").trim(),
        why: String(q.why ?? "").trim(),
      }));
    }
  } catch {
    /* fall through */
  }

  // Deterministic fallback derived from the posting itself.
  const reqs = job.requirements.length ? job.requirements : job.tags;
  const base: TrainingQuestion[] = [
    {
      id: rid("Q"),
      round: "Screening",
      question: `Why do you want to join ${job.company || "this company"} as a ${job.title || "candidate"}?`,
      topic: job.company || job.title,
      why: "Motivation and company research.",
    },
    {
      id: rid("Q"),
      round: "Behavioural",
      question: `Tell me about a project where you owned ${job.tags[0] ?? "the core technical work"} end to end.`,
      topic: job.tags[0] ?? "project ownership",
      why: "Ownership and measurable impact.",
    },
  ];
  for (const r of reqs.slice(0, count - base.length)) {
    base.push({
      id: rid("Q"),
      round: "Technical",
      question: `This role asks for: “${r}”. Walk me through your hands-on experience with it and a trade-off you made.`,
      topic: r.split(/[,.;]/)[0].slice(0, 60),
      why: "Depth against a stated requirement.",
    });
  }
  return base.slice(0, count);
}

/* ------------------------------------------------------------------ */
/* Answer scoring                                                      */
/* ------------------------------------------------------------------ */

const FILLERS = /\b(um+|uh+|erm+|like|you know|basically|actually|kind of|sort of|i mean)\b/gi;

export function speechStats(transcript: string, durationSec: number) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const fillers = transcript.match(FILLERS)?.length ?? 0;
  const wpm = durationSec > 0 ? Math.round((words.length / durationSec) * 60) : 0;
  return { words: words.length, fillers, wpm, durationSec: Math.round(durationSec) };
}

export type AnswerScore = {
  score: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
  aiUsed: boolean;
};

export async function scoreAnswer(
  question: string,
  transcript: string,
  job: ParsedJob,
  stats: ReturnType<typeof speechStats>,
): Promise<AnswerScore> {
  if (transcript.trim().split(/\s+/).filter(Boolean).length < 8) {
    return {
      score: 0,
      strengths: [],
      improvements: ["Give a full spoken answer — this one was too short to evaluate."],
      feedback: "Not enough spoken content to score.",
      aiUsed: false,
    };
  }
  try {
    const { runAgent } = await import("./ai-provider.server");
    const { text } = await runAgent({
      kind: "agent",
      system:
        'You are an interview coach. Score a spoken answer. Return ONLY JSON: {"score":0-100,"strengths":["..."],"improvements":["..."],"feedback":"2 sentences"}. Judge structure (STAR), specificity, quantified impact and relevance to the role. Be honest and strict.',
      prompt: `Role: ${job.title} at ${job.company}\nQuestion: ${question}\nSpoken answer (auto-transcribed, ignore punctuation): ${transcript.slice(0, 4000)}\nSpeaking stats: ${stats.words} words, ${stats.durationSec}s, ${stats.wpm} wpm, ${stats.fillers} filler words.`,
      maxOutputTokens: 700,
    });
    const parsed = jsonFrom(text) as Partial<AnswerScore> | null;
    if (parsed && typeof parsed.score === "number") {
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        strengths: (parsed.strengths ?? []).slice(0, 4),
        improvements: (parsed.improvements ?? []).slice(0, 4),
        feedback: String(parsed.feedback ?? "").trim(),
        aiUsed: true,
      };
    }
  } catch {
    /* fall through */
  }

  // Deterministic fallback: structure + specificity heuristics.
  const t = transcript.toLowerCase();
  const hasNumbers = /\d/.test(transcript);
  const star = [
    "situation",
    "task",
    "action",
    "result",
    "because",
    "so that",
    "led",
    "built",
  ].filter((k) => t.includes(k)).length;
  const lengthScore = Math.min(30, Math.round(stats.words / 4));
  const score = Math.max(
    5,
    Math.min(95, 25 + lengthScore + star * 5 + (hasNumbers ? 12 : 0) - stats.fillers * 2),
  );
  return {
    score,
    strengths: hasNumbers ? ["You quantified at least part of the outcome."] : [],
    improvements: [
      ...(hasNumbers ? [] : ["Add concrete numbers to the result."]),
      ...(stats.fillers > 3 ? [`Reduce filler words — ${stats.fillers} detected.`] : []),
      ...(stats.words < 90 ? ["Expand the answer; aim for 60–120 seconds."] : []),
    ],
    feedback: "Scored locally — connect an AI key for a full coaching review.",
    aiUsed: false,
  };
}

/* ------------------------------------------------------------------ */
/* Coding challenge                                                    */
/* ------------------------------------------------------------------ */

export async function generateChallenge(
  job: ParsedJob,
  difficulty: Challenge["difficulty"],
): Promise<Challenge> {
  const stack = job.tags.slice(0, 8).join(", ") || "general software engineering";
  try {
    const { runAgent } = await import("./ai-provider.server");
    const { text } = await runAgent({
      kind: "agent",
      system:
        'You create JavaScript coding-interview problems that can be auto-graded. Return ONLY JSON: {"title":"...","prompt":"markdown problem statement with constraints and one worked example","functionName":"camelCase","signature":"function solve(a, b)","tests":[{"input":[...],"expected":...}]}. Provide 5-8 deterministic tests. Inputs must be JSON values passed as positional arguments. The expected value must be JSON-comparable (no functions, no undefined).',
      prompt: `Role: ${job.title} at ${job.company}. Stack: ${stack}. Difficulty: ${difficulty}. Make the problem feel relevant to the role's domain.`,
      maxOutputTokens: 1400,
    });
    const p = jsonFrom(text) as Partial<Challenge> | null;
    if (p?.title && p.tests?.length && p.functionName) {
      return {
        id: rid("CH"),
        difficulty,
        title: String(p.title),
        prompt: String(p.prompt ?? ""),
        functionName: String(p.functionName),
        signature: String(p.signature ?? `function ${p.functionName}(input)`),
        starter: `${p.signature ?? `function ${p.functionName}(input)`} {\n  // your solution here\n}\n`,
        timeLimitSec: TIME_BY_DIFFICULTY[difficulty],
        tests: p.tests.slice(0, 8),
      };
    }
  } catch {
    /* fall through */
  }
  return fallbackChallenge(difficulty);
}

function fallbackChallenge(difficulty: Challenge["difficulty"]): Challenge {
  const bank: Record<
    Challenge["difficulty"],
    Omit<Challenge, "id" | "timeLimitSec" | "difficulty">
  > = {
    easy: {
      title: "Unique skill tags",
      prompt:
        'Given an array of skill tags (strings), return the unique tags **sorted alphabetically**, lower-cased and trimmed.\n\nExample: `[" React ", "react", "Node"] → ["node", "react"]`',
      functionName: "uniqueTags",
      signature: "function uniqueTags(tags)",
      starter: "function uniqueTags(tags) {\n  // your solution here\n}\n",
      tests: [
        { input: [[" React ", "react", "Node"]], expected: ["node", "react"] },
        { input: [[]], expected: [] },
        { input: [["a", "b", "a", "C"]], expected: ["a", "b", "c"] },
        { input: [["  SQL", "sql  "]], expected: ["sql"] },
      ],
    },
    medium: {
      title: "Best matching candidate window",
      prompt:
        "Given an array of daily match scores, return the **highest sum** of any `k` consecutive days. If `k` is larger than the array, return 0.",
      functionName: "bestWindow",
      signature: "function bestWindow(scores, k)",
      starter: "function bestWindow(scores, k) {\n  // your solution here\n}\n",
      tests: [
        { input: [[1, 4, 2, 10, 2, 3, 1, 0, 20], 4], expected: 24 },
        { input: [[1, 2, 3], 5], expected: 0 },
        { input: [[5], 1], expected: 5 },
        { input: [[-1, -2, -3], 2], expected: -3 },
      ],
    },
    hard: {
      title: "Interview scheduler",
      prompt:
        "Given interview intervals `[start, end]`, return the **minimum number of rooms** required so no two overlapping interviews share a room.",
      functionName: "minRooms",
      signature: "function minRooms(intervals)",
      starter: "function minRooms(intervals) {\n  // your solution here\n}\n",
      tests: [
        {
          input: [
            [
              [0, 30],
              [5, 10],
              [15, 20],
            ],
          ],
          expected: 2,
        },
        {
          input: [
            [
              [7, 10],
              [2, 4],
            ],
          ],
          expected: 1,
        },
        { input: [[]], expected: 0 },
        {
          input: [
            [
              [1, 5],
              [2, 6],
              [3, 7],
            ],
          ],
          expected: 3,
        },
      ],
    },
  };
  const c = bank[difficulty];
  return { id: rid("CH"), difficulty, timeLimitSec: TIME_BY_DIFFICULTY[difficulty], ...c };
}

function sameValue(a: Json, b: Json): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Runs the submitted JavaScript against the challenge tests.
 * Falls back to an AI review when the runtime forbids dynamic evaluation.
 */
export async function verifySolution(
  challenge: Challenge,
  code: string,
  timedOut: boolean,
): Promise<Verdict> {
  const results: Verdict["results"] = [];
  try {
    const factory = new Function(
      `"use strict";${code};return typeof ${challenge.functionName} === "function" ? ${challenge.functionName} : null;`,
    ) as () => ((...args: Json[]) => Json) | null;
    const fn = factory();
    if (typeof fn !== "function") {
      return {
        passed: false,
        passedCount: 0,
        total: challenge.tests.length,
        results: [],
        feedback: `No function named ${challenge.functionName} was found. Keep the given signature.`,
        timedOut,
      };
    }
    for (const t of challenge.tests) {
      try {
        const got = JSON.parse(JSON.stringify(fn(...t.input) ?? null)) as Json;
        results.push({ ...t, got, ok: sameValue(got, t.expected) });
      } catch (e) {
        results.push({
          ...t,
          got: null,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    const passedCount = results.filter((r) => r.ok).length;
    const passed = passedCount === results.length && results.length > 0;
    return {
      passed,
      passedCount,
      total: results.length,
      results,
      feedback: await reviewCode(challenge, code, passed, passedCount, results.length),
      timedOut,
    };
  } catch (e) {
    // Dynamic evaluation unavailable (or the code does not parse).
    const message = e instanceof Error ? e.message : String(e);
    const review = await reviewCode(challenge, code, false, 0, challenge.tests.length, message);
    return {
      passed: false,
      passedCount: 0,
      total: challenge.tests.length,
      results: [],
      feedback: review || `Could not run the code: ${message}`,
      timedOut,
    };
  }
}

async function reviewCode(
  challenge: Challenge,
  code: string,
  passed: boolean,
  passedCount: number,
  total: number,
  runError?: string,
): Promise<string> {
  try {
    const { runAgent } = await import("./ai-provider.server");
    const { text } = await runAgent({
      kind: "agent",
      system:
        "You review interview code submissions. Three short sentences: correctness, time/space complexity, and the single most valuable improvement. Plain text, no markdown headings.",
      prompt: `Problem: ${challenge.title}\n${challenge.prompt}\n\nSubmission:\n${code.slice(0, 4000)}\n\nTests passed: ${passedCount}/${total}${runError ? `\nRun error: ${runError}` : ""}`,
      maxOutputTokens: 300,
    });
    if (text.trim()) return text.trim();
  } catch {
    /* fall through */
  }
  return passed
    ? "All tests passed. Review the complexity of your approach before the real interview."
    : `${passedCount}/${total} tests passed. Re-check the failing cases above.`;
}

/* ------------------------------------------------------------------ */
/* Resume tailoring + cover letter for a specific posting              */
/* ------------------------------------------------------------------ */

export function keywordGaps(job: ParsedJob, resumeText: string): string[] {
  const haystack = resumeText.toLowerCase();
  const candidates = new Set<string>();
  for (const t of job.tags) candidates.add(t.toLowerCase());
  for (const r of job.requirements) {
    for (const w of r.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) ?? []) {
      if (w.length > 3) candidates.add(w);
    }
  }
  return Array.from(candidates)
    .filter((k) => !haystack.includes(k))
    .slice(0, 12);
}

export async function coverLetterFor(
  job: ParsedJob,
  profile: Record<string, unknown>,
  resumeText: string,
): Promise<string> {
  const { runAgent } = await import("./ai-provider.server");
  const { text } = await runAgent({
    kind: "chat",
    system:
      "Write a focused cover letter: 4 short paragraphs, no clichés, no placeholders like [Company]. Reference the specific role and two concrete achievements from the resume. Plain text.",
    prompt: `Role: ${job.title} at ${job.company} (${job.location})\nRequirements:\n- ${job.requirements.slice(0, 10).join("\n- ")}\n\nCandidate: ${String(profile.full_name ?? "")} — ${String(profile.headline ?? "")}\nResume:\n${resumeText.slice(0, 6000)}`,
    maxOutputTokens: 900,
  });
  return text.trim();
}

export const TIME_LIMITS = TIME_BY_DIFFICULTY;
export type { ParsedJob, Evaluation };
