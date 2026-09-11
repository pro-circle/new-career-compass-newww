/**
 * Server-only job-link pipeline.
 *
 * Fetching is the reliable half (plain HTTP + readable-text extraction) and
 * always runs. The AI half is best-effort: if no provider is configured, or a
 * provider errors / returns non-JSON, we fall back to deterministic heuristics
 * so the feature still produces a useful result instead of failing.
 */
import {
  fetchReadableText,
  type EmbeddedJob,
  type JsonLdJob,
  type LinkPreview,
} from "./linkfetch.server";

export type ParsedJob = {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  preferences: string[];
  tags: string[];
  companyDetails: string;
  aiUsed: boolean;
  /** True when the page gated or withheld most of the posting body. */
  partial: boolean;
};

export type Evaluation = {
  matchScore: number;
  strengths: string[];
  gaps: string[];
  summary: string;
  interviewPlan: { stage: string; focus: string; questions: string[] }[];
  preparationTips: string[];
  aiUsed: boolean;
};

const JOB_HINTS = [
  "responsibilities",
  "qualifications",
  "requirements",
  "apply now",
  "job description",
  "what you'll do",
  "what you will do",
  "years of experience",
  "full-time",
  "part-time",
  "internship",
  "we're hiring",
  "we are hiring",
  "benefits",
  "salary",
  "compensation",
  "job id",
  "employment type",
];

const SKILL_WORDS = [
  "react","typescript","javascript","node","python","java","go","rust","sql","postgres","mysql",
  "mongodb","aws","gcp","azure","docker","kubernetes","terraform","graphql","rest","figma",
  "design systems","ux","ui","product","agile","scrum","ci/cd","testing","machine learning",
  "data analysis","tailwind","next.js","django","spring","kotlin","swift","php","laravel",
];

const ATS_HOSTS =
  /(greenhouse\.io|lever\.co|workday(jobs)?\.com|myworkdayjobs\.com|smartrecruiters\.com|zohorecruit|careers\.|jobs\.|recruit(ee|ment)?\.|ashbyhq\.com|jobvite\.com|icims\.com|taleo\.net|bamboohr\.com|workable\.com|naukri\.com|indeed\.|linkedin\.com\/jobs|glassdoor\.)/i;

const JOB_PATH = /\/(jobs?|careers?|vacanc(y|ies)|opening|position|apply|recruit)([\/\-_?.]|$)/i;

/**
 * Heuristic: does this page look like a single job posting?
 *
 * Many career sites render the posting client-side, so body text can be almost
 * empty. In that case the URL shape (ATS host / job-style path) plus a role-ish
 * title is enough evidence to continue instead of bailing out.
 */
export function looksLikeJob(text: string, title: string, url = ""): boolean {
  const t = `${title} ${text}`.toLowerCase();
  const hits = JOB_HINTS.filter((h) => t.includes(h)).length;
  const titleHit =
    /(engineer|developer|designer|manager|analyst|scientist|executive|specialist|associate|consultant|architect|lead|intern|hiring|careers?|job|vacancy|recruit|officer|sales|marketing|support|technician|accountant)/i.test(
      title,
    );
  // Dedicated hiring hosts are job pages by definition; generic paths need one
  // more corroborating signal so blog posts about "careers" don't slip through.
  if (ATS_HOSTS.test(url)) return true;
  if (JOB_PATH.test(url) && (titleHit || hits >= 1 || text.length < 1500)) return true;
  return hits >= 3 || (titleHit && hits >= 2);

}


export async function fetchJobPage(url: string): Promise<{
  text: string;
  preview: LinkPreview;
  jsonLd: JsonLdJob | null;
  embedded: EmbeddedJob | null;
}> {
  const { text, preview, jsonLd, embedded } = await fetchReadableText(url);
  return { text: text.slice(0, 18000), preview, jsonLd, embedded };
}


function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|•|\u2022|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && s.length < 260);
}

function pickTags(text: string): string[] {
  const t = text.toLowerCase();
  return SKILL_WORDS.filter((s) => t.includes(s)).slice(0, 12);
}

/** Deterministic extraction used whenever the AI path is unavailable. */
export function extractJobHeuristic(text: string, preview: LinkPreview): ParsedJob {
  const rawTitle = preview.title || "";
  const parts = rawTitle
    .split(/\s+[-–|@]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const site = (preview.siteName || "").toLowerCase();
  // Titles come in both "Role - Company" and "Company - Role" orders.
  const companyFirst =
    parts.length > 1 && !!site && parts[0].toLowerCase().includes(site.split(" ")[0] ?? "");
  const titlePart = (companyFirst ? parts[1] : parts[0]) ?? rawTitle;
  const companyPart = (companyFirst ? parts[0] : parts[1]) ?? preview.siteName;
  const sents = sentences(text);
  const reqRe = /(experience|proficien|familiar|knowledge of|degree|years|must have|ability to)/i;
  const prefRe = /(nice to have|bonus|preferred|plus if|advantage)/i;

  return {
    title: (titlePart || rawTitle || "Job posting").replace(/\s+in\s*$/i, "").trim().slice(0, 120),
    company: (companyPart || preview.siteName || "").trim().slice(0, 80),

    location: (text.match(/\b(remote|hybrid|on-?site)\b[^.]{0,40}/i)?.[0] ?? "").trim(),
    type:
      text.match(/\b(full-?time|part-?time|contract|internship|temporary)\b/i)?.[0] ?? "Full-time",
    salary: text.match(/(?:[$€£₹]\s?[\d,.]+\s?(?:k|000)?(?:\s?[-–]\s?[$€£₹]?[\d,.]+k?)?)/)?.[0] ?? "",
    description: preview.description || sents.slice(0, 4).join(" "),
    requirements: sents.filter((s) => reqRe.test(s) && !prefRe.test(s)).slice(0, 8),
    preferences: sents.filter((s) => prefRe.test(s)).slice(0, 5),
    tags: pickTags(text),
    companyDetails: preview.siteName ? `Source: ${preview.siteName} (${preview.finalUrl})` : "",
    aiUsed: false,
    partial: false,
  };
}

/** AI extraction with an automatic heuristic fallback. Never throws. */
export async function extractJob(
  url: string,
  text: string,
  preview: LinkPreview,
  jsonLd: JsonLdJob | null = null,
  embedded: EmbeddedJob | null = null,
): Promise<ParsedJob> {
  const base = extractJobHeuristic(text, preview);
  // Priority: schema.org JSON-LD > mined inline payload > scraped guesses.
  const merged: ParsedJob = {
    ...base,
    title: jsonLd?.title || embedded?.title || base.title,
    company: jsonLd?.company || embedded?.company || base.company,
    location: jsonLd?.location || embedded?.location || base.location,
    type: jsonLd?.type || embedded?.type || base.type,
    salary: jsonLd?.salary || embedded?.salary || base.salary,
    description: jsonLd?.description || embedded?.description || base.description,
  };
  const body = `${merged.description} ${text}`.trim();
  const fallback: ParsedJob = {
    ...merged,
    partial: !!embedded?.gated || body.length < 500 || !merged.description,
  };

  try {
    const { runAgent, hasAnyProvider } = await import("@/lib/ai-provider.server");
    if (!hasAnyProvider()) return fallback;
    const { text: out } = await runAgent({
      kind: "agent",
      system:
        "You extract job postings from page text. Return ONLY strict JSON, no prose. Schema: {title, company, location, type, salary, description, requirements:[], preferences:[], tags:[], companyDetails}. Use empty strings/arrays when unknown.",
      prompt: `Source URL: ${url}\n\nPage text:\n${text}`,
    });
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const p = JSON.parse(match[0]) as Partial<ParsedJob>;
    return {
      title: p.title || fallback.title,
      company: p.company || fallback.company,
      location: p.location || fallback.location,
      type: p.type || fallback.type,
      salary: p.salary || fallback.salary,
      description: p.description || fallback.description,
      requirements: p.requirements?.length ? p.requirements : fallback.requirements,
      preferences: p.preferences?.length ? p.preferences : fallback.preferences,
      tags: p.tags?.length ? p.tags : fallback.tags,
      companyDetails: p.companyDetails || fallback.companyDetails,
      aiUsed: true,
      partial: fallback.partial && !p.description,
    };
  } catch {
    return fallback;
  }
}

function profileText(profile: Record<string, unknown>): string {
  return JSON.stringify(profile).toLowerCase();
}

/** Deterministic scoring used whenever the AI path is unavailable. */
export function evaluateHeuristic(
  job: ParsedJob,
  profile: Record<string, unknown>,
): Evaluation {
  const p = profileText(profile);
  const needed = job.tags.length ? job.tags : pickTags(job.description);
  const strengths = needed.filter((t) => p.includes(t.toLowerCase()));
  const gaps = needed.filter((t) => !p.includes(t.toLowerCase()));
  const score = needed.length
    ? Math.round((strengths.length / needed.length) * 100)
    : 55;

  return {
    matchScore: Math.min(95, Math.max(25, score)),
    strengths: strengths.map((s) => `Your profile shows experience with ${s}`),
    gaps: gaps.map((g) => `The posting mentions ${g} — no clear evidence in your profile`),
    summary: `Matched ${strengths.length} of ${needed.length || 0} skill signals found in the posting for ${job.title}${job.company ? ` at ${job.company}` : ""}. This is a keyword-based estimate.`,
    interviewPlan: [
      {
        stage: "Recruiter screen",
        focus: "Motivation, availability, compensation range",
        questions: [
          `Why this role at ${job.company || "this company"}?`,
          "Walk me through your most relevant recent project.",
          "What compensation range are you targeting?",
        ],
      },
      {
        stage: "Technical / craft round",
        focus: needed.slice(0, 4).join(", ") || "Core role skills",
        questions: [
          `How have you applied ${needed[0] ?? "your core skill"} in production?`,
          "Describe a tradeoff you made under a tight deadline.",
          "How do you validate the quality of your work?",
        ],
      },
      {
        stage: "Final / team fit",
        focus: "Collaboration, ownership, long-term goals",
        questions: [
          "Tell me about a conflict you resolved on a team.",
          "What does the first 90 days look like for you here?",
        ],
      },
    ],
    preparationTips: [
      ...gaps.slice(0, 3).map((g) => `Prepare a concrete story that covers ${g}.`),
      "Re-read the posting and mirror its exact vocabulary in your resume.",
      "Prepare two questions about the team's roadmap and success metrics.",
    ],
    aiUsed: false,
  };
}

/** AI evaluation with an automatic heuristic fallback. Never throws. */
export async function evaluateFit(
  job: ParsedJob,
  profile: Record<string, unknown>,
): Promise<Evaluation> {
  const fallback = evaluateHeuristic(job, profile);
  try {
    const { runAgent, hasAnyProvider } = await import("@/lib/ai-provider.server");
    if (!hasAnyProvider()) return fallback;
    const { text: out } = await runAgent({
      kind: "agent",
      system:
        "Evaluate a candidate for a job posting. Return ONLY strict JSON: {matchScore:0-100, strengths:[], gaps:[], summary, interviewPlan:[{stage,focus,questions:[]}], preparationTips:[]}",
      prompt: `Job:\n${JSON.stringify(job)}\n\nCandidate:\n${JSON.stringify(profile).slice(0, 8000)}`,
    });
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return fallback;
    const parsed = JSON.parse(m[0]) as Partial<Evaluation>;
    return {
      matchScore: Number(parsed.matchScore ?? fallback.matchScore),
      strengths: parsed.strengths?.length ? parsed.strengths : fallback.strengths,
      gaps: parsed.gaps?.length ? parsed.gaps : fallback.gaps,
      summary: parsed.summary || fallback.summary,
      interviewPlan: parsed.interviewPlan?.length
        ? parsed.interviewPlan.map((s) => ({
            stage: s.stage ?? "",
            focus: s.focus ?? "",
            questions: s.questions ?? [],
          }))
        : fallback.interviewPlan,
      preparationTips: parsed.preparationTips?.length
        ? parsed.preparationTips
        : fallback.preparationTips,
      aiUsed: true,
    };
  } catch {
    return fallback;
  }
}
