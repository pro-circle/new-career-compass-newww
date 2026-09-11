/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Server-only implementation of the candidate Job Hunt agent.
 *
 * Safety rules baked in here:
 *  - Nothing is ever written unless the candidate switched the agent on.
 *  - "review" mode never submits an application; it only creates a proposal
 *    the candidate has to approve.
 *  - A per-day cap is enforced server-side, not in the browser.
 *  - Duplicate applications are impossible (existing applications and open
 *    proposals are both excluded from every pass).
 */
import {
  DEFAULT_HUNT_SETTINGS,
  type DraftedApplication,
  type HuntLogEntry,
  type HuntPassResult,
  type HuntProposal,
  type HuntSettings,
  type HuntState,
} from "./jobhunt.types";

type Ctx = { userId: string; db: any | null };

export async function huntCtx(): Promise<Ctx> {
  const { requireUserId } = await import("@/lib/session.server");
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    userId: await requireUserId(),
    db: getSupabaseAdmin(),
  };
}

function rowToSettings(r: any): HuntSettings {
  if (!r) return DEFAULT_HUNT_SETTINGS;
  return {
    enabled: !!r.enabled,
    mode: r.mode === "auto" ? "auto" : "review",
    minScore: r.min_score ?? DEFAULT_HUNT_SETTINGS.minScore,
    dailyLimit: r.daily_limit ?? DEFAULT_HUNT_SETTINGS.dailyLimit,
    titles: r.titles ?? [],
    locations: r.locations ?? [],
    remoteOnly: !!r.remote_only,
    useResume: r.use_resume !== false,
    usePortfolio: r.use_portfolio !== false,
    useGithub: r.use_github !== false,
    githubUrl: r.github_url ?? "",
    portfolioUrl: r.portfolio_url ?? "",
  };
}

function settingsToRow(userId: string, s: HuntSettings) {
  return {
    user_id: userId,
    enabled: s.enabled,
    mode: s.mode,
    min_score: s.minScore,
    daily_limit: s.dailyLimit,
    titles: s.titles,
    locations: s.locations,
    remote_only: s.remoteOnly,
    use_resume: s.useResume,
    use_portfolio: s.usePortfolio,
    use_github: s.useGithub,
    github_url: s.githubUrl,
    portfolio_url: s.portfolioUrl,
    updated_at: new Date().toISOString(),
  };
}

function rowToProposal(r: any): HuntProposal {
  return {
    id: r.id,
    jobId: r.job_id ?? "",
    jobTitle: r.job_title ?? "",
    company: r.company ?? "",
    location: r.location ?? "",
    matchScore: r.match_score ?? 0,
    reason: r.reason ?? "",
    status: (r.status ?? "pending") as HuntProposal["status"],
    createdAt: r.created_at ?? "",
  };
}

function rowToLog(r: any): HuntLogEntry {
  return {
    id: r.id,
    jobTitle: r.job_title ?? "",
    company: r.company ?? "",
    matchScore: r.match_score ?? 0,
    status: (r.status ?? "applied") as HuntLogEntry["status"],
    reason: r.reason ?? "",
    createdAt: r.created_at ?? "",
  };
}

async function loadSettings(db: any, userId: string): Promise<HuntSettings> {
  const { data } = await db
    .from("job_hunt_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return rowToSettings(data);
}

async function loadProfile(db: any, userId: string) {
  const { data } = await db
    .from("profiles")
    .select("full_name,headline,location,skills,target_roles,years_exp,resume_text,links")
    .eq("id", userId)
    .maybeSingle();
  return (data ?? {}) as Record<string, any>;
}

async function notify(db: any, userId: string, title: string, type: string) {
  try {
    await db.from("notifications").insert({
      id: `N-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
      user_id: userId,
      title,
      time: "just now",
      type,
    });
  } catch {
    /* notifications are best-effort */
  }
}

function norm(v: unknown): string {
  return String(v ?? "").toLowerCase();
}

/** Deterministic fit score so the agent works with or without an AI key. */
export function scoreJob(
  job: any,
  profile: Record<string, any>,
  settings: HuntSettings,
): { score: number; reason: string } {
  const title = norm(job.title);
  const location = norm(job.location);
  const haystack = `${title} ${norm(job.description)} ${(job.tags ?? []).map(norm).join(" ")}`;

  const wantedTitles = (
    settings.titles.length ? settings.titles : (profile.target_roles ?? [])
  ).map(norm);
  const skills: string[] = (profile.skills ?? []).map(norm);

  let score = 45;
  const notes: string[] = [];

  const titleHit = wantedTitles.find((t: string) => t && title.includes(t));
  if (titleHit) {
    score += 22;
    notes.push(`title matches "${titleHit}"`);
  } else if (wantedTitles.length) {
    const partial = wantedTitles.some((t: string) =>
      t.split(/\s+/).some((w: string) => w.length > 3 && title.includes(w)),
    );
    if (partial) {
      score += 10;
      notes.push("related title");
    }
  }

  const matchedSkills = skills.filter((s) => s && haystack.includes(s));
  if (skills.length) {
    score += Math.round((matchedSkills.length / skills.length) * 28);
    if (matchedSkills.length) {
      notes.push(`${matchedSkills.length} skill overlap (${matchedSkills.slice(0, 3).join(", ")})`);
    }
  }

  const isRemote = location.includes("remote");
  if (settings.remoteOnly && !isRemote) {
    score -= 30;
    notes.push("not remote");
  }
  if (settings.locations.length) {
    const locHit = settings.locations.map(norm).some((l) => l && location.includes(l));
    if (locHit) {
      score += 6;
      notes.push("preferred location");
    } else if (!isRemote) {
      score -= 12;
      notes.push("outside preferred locations");
    }
  }

  if (profile.resume_text && settings.useResume) score += 4;

  return {
    score: Math.max(0, Math.min(99, score)),
    reason: notes.length ? notes.join(" · ") : "General profile fit",
  };
}

export async function getState(): Promise<HuntState> {
  const { userId, db } = await huntCtx();
  if (!db) {
    return {
      settings: DEFAULT_HUNT_SETTINGS,
      proposals: [],
      log: [],
      backendReady: false,
    };
  }
  const settings = await loadSettings(db, userId);
  const { data: proposals } = await db
    .from("job_hunt_proposals")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("match_score", { ascending: false })
    .limit(20);
  const { data: log } = await db
    .from("job_hunt_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(25);
  return {
    settings,
    proposals: (proposals ?? []).map(rowToProposal),
    log: (log ?? []).map(rowToLog),
    backendReady: true,
  };
}

export async function saveSettings(patch: Partial<HuntSettings>): Promise<HuntSettings> {
  const { userId, db } = await huntCtx();
  if (!db) return { ...DEFAULT_HUNT_SETTINGS, ...patch };
  const current = await loadSettings(db, userId);
  const next: HuntSettings = { ...current, ...patch };
  await db.from("job_hunt_settings").upsert(settingsToRow(userId, next), { onConflict: "user_id" });
  return next;
}

async function submitApplication(
  db: any,
  userId: string,
  job: any,
  score: number,
  note: string,
): Promise<string | null> {
  const appId = `APP-${Date.now().toString(36).toUpperCase()}`;
  const { error } = await db.from("applications").insert({
    id: appId,
    candidate_id: userId,
    job_id: job.id,
    job_title: job.title,
    company: job.department || job.company || "This company",
    logo: String(job.title ?? "AT")
      .slice(0, 2)
      .toUpperCase(),
    applied_on: new Date().toISOString().slice(0, 10),
    stage: "Applied",
    progress: 15,
    match_score: score,
    next_step: note,
  });
  if (error) return null;
  // Counters only exist for jobs posted inside the app.
  if (!job.external) {
    await db
      .from("jobs")
      .update({
        applicants: (job.applicants ?? 0) + 1,
        new_count: (job.new_count ?? 0) + 1,
      })
      .eq("id", job.id);
  }
  return appId;
}

async function writeLog(db: any, userId: string, entry: HuntLogEntry): Promise<void> {
  await db.from("job_hunt_log").insert({
    id: entry.id,
    user_id: userId,
    job_title: entry.jobTitle,
    company: entry.company,
    match_score: entry.matchScore,
    status: entry.status,
    reason: entry.reason,
    created_at: entry.createdAt,
  });
}

/** One agent pass. Safe to call repeatedly; it is idempotent per job. */
export async function runPass(): Promise<HuntPassResult> {
  const empty: HuntPassResult = {
    applied: [],
    proposed: [],
    scanned: 0,
    message: "",
  };
  const { userId, db } = await huntCtx();
  if (!db) return { ...empty, message: "Backend not configured." };

  const settings = await loadSettings(db, userId);
  if (!settings.enabled) return { ...empty, message: "Agent is off." };

  const profile = await loadProfile(db, userId);

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const { count: todayCount } = await db
    .from("job_hunt_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "applied")
    .gte("created_at", midnight.toISOString());
  const remaining = Math.max(0, settings.dailyLimit - (todayCount ?? 0));

  const { data: internalJobs } = await db
    .from("jobs")
    .select("*")
    .eq("status", "Open")
    .order("posted_at", { ascending: false })
    .limit(100);

  // Live postings from public job boards, scored with the same code path.
  let liveJobs: any[] = [];
  try {
    const { fetchLiveJobs } = await import("@/lib/jobsources.server");
    const live = await fetchLiveJobs({
      titles: settings.titles.length ? settings.titles : (profile.target_roles ?? []),
      limit: 40,
    });
    liveJobs = live.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      department: j.company,
      location: j.location,
      type: j.type,
      description: j.description,
      tags: j.tags,
      url: j.url,
      source: j.source,
      external: true,
    }));
  } catch {
    liveJobs = [];
  }

  const jobs = [...(internalJobs ?? []), ...liveJobs];

  const { data: existing } = await db
    .from("applications")
    .select("job_id,job_title")
    .eq("candidate_id", userId);
  const applied = new Set(
    (existing ?? []).flatMap((a: any) => [norm(a.job_id), norm(a.job_title)]),
  );

  const { data: openProps } = await db
    .from("job_hunt_proposals")
    .select("job_id")
    .eq("user_id", userId);
  const known = new Set((openProps ?? []).map((p: any) => norm(p.job_id)));

  const result: HuntPassResult = { ...empty, scanned: jobs.length };

  for (const job of jobs as any[]) {
    if (applied.has(norm(job.id)) || applied.has(norm(job.title))) continue;
    if (known.has(norm(job.id))) continue;

    const { score, reason } = scoreJob(job, profile, settings);
    if (score < settings.minScore) continue;

    if (settings.mode === "auto") {
      if (result.applied.length >= remaining) break;
      const appId = await submitApplication(
        db,
        userId,
        job,
        score,
        "Submitted by your Job Hunt agent",
      );
      if (!appId) continue;
      const entry: HuntLogEntry = {
        id: appId,
        jobTitle: job.title,
        company: job.department || "This company",
        matchScore: score,
        status: "applied",
        reason: `${reason} · ${score}% ≥ ${settings.minScore}%`,
        createdAt: new Date().toISOString(),
      };
      await writeLog(db, userId, entry);
      await notify(db, userId, `Job Hunt applied to ${job.title} (${score}% match)`, "application");
      result.applied.push(entry);
      known.add(norm(job.id));
    } else {
      if (result.proposed.length >= Math.max(remaining, 3)) break;
      const id = `PRP-${Date.now().toString(36).toUpperCase()}-${result.proposed.length}`;
      const proposal: HuntProposal = {
        id,
        jobId: job.id,
        jobTitle: job.title,
        company: job.department || "This company",
        location: job.location ?? "",
        matchScore: score,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      const { error } = await db.from("job_hunt_proposals").insert({
        id,
        user_id: userId,
        job_id: proposal.jobId,
        job_title: proposal.jobTitle,
        company: proposal.company,
        location: proposal.location,
        match_score: proposal.matchScore,
        reason: proposal.reason,
        status: "pending",
        created_at: proposal.createdAt,
      });
      if (error) continue;
      await notify(
        db,
        userId,
        `Job Hunt found ${job.title} (${score}% match) — approval needed`,
        "match",
      );
      result.proposed.push(proposal);
      known.add(norm(job.id));
    }
  }

  result.message = `Scanned ${result.scanned} open roles (${liveJobs.length} live from job boards)`;
  return result;
}

/** Candidate approves or denies a proposal. Approval is the only write path. */
export async function decideProposal(
  proposalId: string,
  decision: "approve" | "deny",
): Promise<{ ok: boolean; message: string }> {
  const { userId, db } = await huntCtx();
  if (!db) return { ok: false, message: "Backend not configured." };

  const { data: p } = await db
    .from("job_hunt_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!p) return { ok: false, message: "Proposal not found." };
  if (p.status !== "pending") {
    return { ok: false, message: "Already handled." };
  }

  if (decision === "deny") {
    await db.from("job_hunt_proposals").update({ status: "denied" }).eq("id", proposalId);
    await writeLog(db, userId, {
      id: `LOG-${Date.now().toString(36)}`,
      jobTitle: p.job_title ?? "",
      company: p.company ?? "",
      matchScore: p.match_score ?? 0,
      status: "denied",
      reason: "Declined by you",
      createdAt: new Date().toISOString(),
    });
    return { ok: true, message: "Dismissed — the agent will not apply." };
  }

  const { data: job } = await db.from("jobs").select("*").eq("id", p.job_id).maybeSingle();
  if (!job) return { ok: false, message: "That role is no longer listed." };

  const { data: dupe } = await db
    .from("applications")
    .select("id")
    .eq("candidate_id", userId)
    .eq("job_id", job.id)
    .maybeSingle();
  if (dupe) {
    await db.from("job_hunt_proposals").update({ status: "applied" }).eq("id", proposalId);
    return { ok: false, message: "You already applied to this role." };
  }

  const appId = await submitApplication(
    db,
    userId,
    job,
    p.match_score ?? 0,
    "Approved by you, submitted by Job Hunt",
  );
  if (!appId) return { ok: false, message: "Could not submit the application." };

  await db.from("job_hunt_proposals").update({ status: "applied" }).eq("id", proposalId);
  await writeLog(db, userId, {
    id: appId,
    jobTitle: p.job_title ?? "",
    company: p.company ?? "",
    matchScore: p.match_score ?? 0,
    status: "applied",
    reason: "Approved by you",
    createdAt: new Date().toISOString(),
  });
  await notify(db, userId, `Application submitted — ${p.job_title}`, "application");
  return { ok: true, message: `Applied to ${p.job_title}.` };
}

/**
 * Agent fills out an arbitrary application. It only drafts — nothing is sent
 * anywhere. The candidate reviews and decides.
 */
export async function draftApplication(input: {
  url?: string;
  jobTitle?: string;
  company?: string;
  questions: string[];
}): Promise<DraftedApplication> {
  const { userId, db } = await huntCtx();
  const profile = db ? await loadProfile(db, userId) : {};
  const settings = db ? await loadSettings(db, userId) : DEFAULT_HUNT_SETTINGS;

  const questions = input.questions.filter((q) => q.trim().length > 0);
  const base: DraftedApplication = {
    jobTitle: input.jobTitle ?? "",
    company: input.company ?? "",
    sourceUrl: input.url ?? "",
    coverNote: "",
    answers: questions.map((q) => ({ question: q, answer: "" })),
    degraded: true,
  };

  const { runAgent, hasAnyProvider } = await import("@/lib/ai-provider.server");
  if (!hasAnyProvider()) return base;

  let posting = "";
  if (input.url) {
    try {
      const { fetchReadableText } = await import("@/lib/linkfetch.server");
      posting = (await fetchReadableText(input.url)).text.slice(0, 8000);
    } catch {
      posting = "";
    }
  }

  const sources = [
    settings.useResume && profile.resume_text
      ? `RESUME:\n${String(profile.resume_text).slice(0, 6000)}`
      : "",
    settings.usePortfolio && settings.portfolioUrl ? `PORTFOLIO: ${settings.portfolioUrl}` : "",
    settings.useGithub && settings.githubUrl ? `GITHUB: ${settings.githubUrl}` : "",
    profile.links ? `LINKS: ${JSON.stringify(profile.links)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { text } = await runAgent({
      kind: "agent",
      system:
        'You fill out job applications on behalf of a candidate. Answer truthfully using ONLY the supplied profile; never invent employers, degrees, or dates. Return ONLY strict JSON: {"jobTitle":"","company":"","coverNote":"","answers":[{"question":"","answer":""}]}. Keep each answer under 120 words and the cover note under 180 words.',
      prompt: [
        input.url ? `Application URL: ${input.url}` : "",
        posting ? `Posting text:\n${posting}` : "",
        `Candidate profile:\n${JSON.stringify(profile).slice(0, 6000)}`,
        sources,
        questions.length
          ? `Answer these questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
          : "Produce the standard fields: why this role, relevant experience, availability.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return base;
    const parsed = JSON.parse(m[0]) as Partial<DraftedApplication>;
    return {
      jobTitle: parsed.jobTitle || base.jobTitle,
      company: parsed.company || base.company,
      sourceUrl: base.sourceUrl,
      coverNote: parsed.coverNote ?? "",
      answers: (parsed.answers ?? []).map((a) => ({
        question: a.question ?? "",
        answer: a.answer ?? "",
      })),
      degraded: false,
    };
  } catch {
    return base;
  }
}
