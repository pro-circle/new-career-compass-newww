import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const FIXTURE_PATH = resolve("scripts/fixtures/ats_engine_synthetic_dataset.json");
const ENV_PATH = resolve(".env");
const dryRun = process.argv.includes("--dry-run");

const REQUIRED_SECTIONS = [
  "metadata",
  "1. Users",
  "2. Candidate profiles",
  "4. Companies",
  "5. Resumes",
  "6. Portfolio projects",
  "7. Jobs",
  "8. Applications",
  "10. Training sessions",
  "11. Interview questions",
  "12. Interview answers",
  "13. Coding challenges",
  "14. Coding submissions",
  "17. Offers",
  "18. Templates",
  "19. Team members",
  "20. Notifications",
  "21. Job-hunt settings",
  "22. Job-hunt runs",
  "23. Proposal drafts",
];

function text(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function initials(name) {
  return text(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function salaryLabel(range) {
  if (!range || typeof range !== "object") return "";
  const currency = text(range.currency);
  const min = number(range.min);
  const max = number(range.max);
  return [currency, min && max ? `${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")}` : ""]
    .filter(Boolean)
    .join(" ");
}

function parseEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadEnvironment() {
  let fileValues = {};
  try {
    fileValues = parseEnv(await readFile(ENV_PATH, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return { ...fileValues, ...process.env };
}

function validateFixture(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Seed fixture must be a JSON object.");
  }
  const missing = REQUIRED_SECTIONS.filter((section) => !(section in data));
  if (missing.length) throw new Error(`Seed fixture is missing sections: ${missing.join(", ")}`);
  if (data.metadata?.fictional_only !== true) {
    throw new Error("Refusing to seed a fixture not explicitly marked fictional_only.");
  }

  const duplicates = [];
  for (const [section, records] of Object.entries(data)) {
    if (!Array.isArray(records)) continue;
    const ids = records.map((record) => record?.id).filter(Boolean);
    const repeated = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (repeated.length) duplicates.push(`${section}: ${repeated.join(", ")}`);
  }
  if (duplicates.length) throw new Error(`Duplicate fixture IDs found:\n${duplicates.join("\n")}`);
}

function buildSeed(data) {
  const users = new Map(list(data["1. Users"]).map((row) => [row.id, row]));
  const candidates = list(data["2. Candidate profiles"]);
  const candidateById = new Map(candidates.map((row) => [row.id, row]));
  const companies = new Map(list(data["4. Companies"]).map((row) => [row.id, row]));
  const jobs = list(data["7. Jobs"]);
  const jobById = new Map(jobs.map((row) => [row.id, row]));
  const sessions = list(data["10. Training sessions"]);
  const sessionsByCandidate = new Map();
  for (const session of sessions) {
    if (!sessionsByCandidate.has(session.candidate_id)) sessionsByCandidate.set(session.candidate_id, []);
    sessionsByCandidate.get(session.candidate_id).push(session);
  }
  const interviewQuestions = new Map(list(data["11. Interview questions"]).map((row) => [row.id, row]));
  const challenges = new Map(list(data["13. Coding challenges"]).map((row) => [row.id, row]));

  const jobRows = jobs.map((row) => {
    const company = companies.get(row.company_id);
    const scores = Object.values(row.match_scores_by_candidate ?? {}).map(Number).filter(Number.isFinite);
    const statusMap = { open: "Open", draft: "Draft", closed: "Closed", paused: "Paused" };
    return {
      id: row.id,
      employer_id: null,
      title: text(row.title, "Untitled role"),
      department: text(company?.industry),
      location: text(row.location),
      type: text(row.employment_type, "Full-time"),
      posted_at: row.created_date ?? null,
      status: statusMap[text(row.status).toLowerCase()] ?? "Draft",
      applicants: list(data["8. Applications"]).filter((application) => application.job_id === row.id).length,
      new_count: 0,
      match_avg: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
      salary: salaryLabel(row.salary_range),
      description: [text(row.description), ...list(row.responsibilities)].filter(Boolean).join("\n\n"),
      tags: [...new Set([...list(row.required_skills), ...list(row.preferred_skills)])],
    };
  });

  const candidateRows = candidates.map((row) => ({
    id: row.id,
    name: text(row.full_name),
    title: text(row.headline),
    company: text(row.work_experience?.[0]?.company_name),
    location: text(row.location),
    years: number(row.years_experience),
    match_score: Math.max(0, ...jobs.map((job) => number(job.match_scores_by_candidate?.[row.id]))),
    skills: list(row.skills),
    strengths: list(row.achievements),
    gaps: list(row.flags),
    status: row.profile_completion_status === "complete" ? "Qualified" : "New",
    applied_for: text(jobById.get(list(data["8. Applications"]).find((item) => item.candidate_id === row.id)?.job_id)?.title),
    ai_insight: text(row.professional_summary),
    portfolio: list(data["6. Portfolio projects"]).filter((project) => project.candidate_id === row.id),
    initials: initials(row.full_name),
    email: text(users.get(row.user_id)?.email),
  }));

  const stageMap = {
    applied: "Applied",
    screening: "Screening",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
    withdrawn: "Rejected",
  };
  const progressMap = { Applied: 20, Screening: 40, Interview: 70, Offer: 90, Rejected: 100 };
  const applicationRows = list(data["8. Applications"]).map((row) => {
    const job = jobById.get(row.job_id);
    const company = companies.get(job?.company_id);
    const stage = stageMap[text(row.current_status).toLowerCase()] ?? "Applied";
    return {
      id: row.id,
      candidate_id: null,
      user_id: null,
      job_id: row.job_id ?? null,
      job_title: text(job?.title),
      company: text(company?.name),
      logo: text(company?.logo_placeholder),
      applied_on: text(row.applied_date),
      stage,
      progress: progressMap[stage],
      match_score: number(row.match_score),
      next_step: text(row.next_action),
    };
  });

  const resumeRows = list(data["5. Resumes"]).map((row) => {
    const candidate = candidateById.get(row.candidate_id);
    return {
      id: row.id,
      user_id: row.candidate_id,
      title: text(row.title, "My resume"),
      content: {
        fullName: text(candidate?.full_name),
        headline: text(candidate?.headline),
        location: text(candidate?.location),
        summary: text(row.professional_summary),
        experience: list(row.experience_entries),
        education: list(row.education_entries),
        skills: list(row.skills),
      },
      plain_text: text(row.optimized_resume_text) || text(row.original_resume_text),
      ats_score: number(row.ats_score),
      insights: list(row.ats_recommendations).map((body, index) => ({ title: `Recommendation ${index + 1}`, body, done: false })),
      language: "English",
      updated_at: row.updated_at ?? row.created_at ?? null,
    };
  });

  const portfolioRows = [...list(data["6. Portfolio projects"]), ...list(data.portfolio_drafts)].map((row, index) => ({
    id: row.id,
    user_id: row.candidate_id,
    title: text(row.title, "Untitled project"),
    role: text(row.role),
    year: String(row.year ?? ""),
    tags: list(row.tags),
    description: text(row.description),
    gradient: text(row.image_or_gradient_placeholder, "from-brand/60 to-accent/60"),
    url: text(row.project_url) || text(row.github_url),
    ord: index,
  }));

  const notificationRows = list(data["20. Notifications"]).map((row) => ({
    id: row.id,
    user_id: null,
    candidate_id: row.recipient_type === "candidate" ? row.recipient_id : null,
    title: text(row.title),
    time: text(row.created_at),
    type: text(row.type),
    created_at: row.created_at ?? null,
  }));

  const offerRows = list(data["17. Offers"]).map((row) => {
    const candidate = candidateById.get(row.candidate_id);
    const job = jobById.get(row.job_id);
    return {
      id: row.id,
      employer_id: text(job?.company_id, "synthetic-employer"),
      candidate_id: row.candidate_id ?? null,
      candidate_name: text(candidate?.full_name),
      candidate_email: text(users.get(candidate?.user_id)?.email),
      role: text(job?.title),
      salary: typeof row.salary === "object" ? salaryLabel(row.salary) : text(row.salary),
      equity: text(row.equity),
      start_date: text(row.start_date),
      body: text(row.benefits_summary),
      status: ({ draft: "Drafted", sent: "Sent", accepted: "Signed", declined: "Declined" })[text(row.offer_status).toLowerCase()] ?? "Drafted",
      sent_at: row.offer_status === "sent" ? row.candidate_response_date ?? null : null,
    };
  });

  const templateRows = list(data["18. Templates"]).map((row) => ({
    id: row.id,
    owner_id: text(row.employer_id),
    name: text(row.name),
    category: text(row.type, "General"),
    subject: text(row.name),
    body: text(row.body),
  }));

  const teamInviteRows = list(data["19. Team members"]).map((row) => ({
    id: row.id,
    owner_id: text(row.employer_id),
    email: text(users.get(row.user_id)?.email, `${row.id}@synthetic.example.invalid`),
    role: text(row.role, "Recruiter"),
    status: row.status === "active" ? "Active" : "Invited",
  }));

  const sessionRows = sessions.map((row) => {
    const job = jobById.get(row.job_id);
    return {
      id: row.id,
      user_id: row.candidate_id,
      url: text(job?.application_url) || text(job?.external_application_url),
      job: { id: row.job_id, title: row.target_role ?? job?.title, company: row.target_company ?? companies.get(job?.company_id)?.name },
      evaluation: { progress: number(row.progress_percentage), status: row.status, currentStep: row.current_step },
      questions: list(data["11. Interview questions"]).filter((question) => !question.source_context?.job_id || question.source_context.job_id === row.job_id),
      waypoints: Object.fromEntries(list(data.training_steps).filter((step) => step.session_id === row.id).map((step) => [step.step_type, step.status])),
      created_at: row.created_date ?? null,
      updated_at: row.updated_date ?? row.created_date ?? null,
    };
  });

  const answerRows = list(data["12. Interview answers"]).flatMap((row) => {
    const session = sessionsByCandidate.get(row.candidate_id)?.[0];
    if (!session) return [];
    const question = interviewQuestions.get(row.question_id);
    return [{
      id: row.id,
      session_id: session.id,
      user_id: row.candidate_id,
      question_id: row.question_id,
      question: text(question?.question),
      round: text(question?.round),
      transcript: text(row.transcript),
      score: Math.round(number(row.score)),
      strengths: list(row.strengths),
      improvements: list(row.improvements),
      feedback: text(row.feedback),
      words: Math.round(number(row.word_count)),
      fillers: Math.round(number(row.filler_word_count)),
      wpm: Math.round(number(row.words_per_minute)),
      duration_sec: Math.round(number(row.duration_seconds)),
      created_at: row.submission_timestamp ?? null,
    }];
  });

  const challengeRows = list(data["14. Coding submissions"]).flatMap((submission) => {
    const challenge = challenges.get(submission.challenge_id);
    const session = sessionsByCandidate.get(submission.candidate_id)?.[0];
    if (!challenge || !session) return [];
    return [{
      id: submission.id,
      session_id: session.id,
      user_id: submission.candidate_id,
      difficulty: text(challenge.difficulty, "easy"),
      title: text(challenge.title),
      prompt: text(challenge.prompt),
      function_name: text(challenge.function_signature).match(/(?:function\s+)?([\w$]+)\s*\(/)?.[1] ?? "solution",
      signature: text(challenge.function_signature),
      starter: text(challenge.starter_code),
      time_limit_sec: number(challenge.time_limit_seconds, 600),
      tests: list(challenge.test_cases),
      code: text(submission.candidate_submission),
      verdict: {
        verdict: submission.verdict,
        passed: number(submission.passed_test_count),
        total: number(submission.total_test_count),
        feedback: submission.feedback,
        complexityReview: submission.complexity_review,
        timedOut: Boolean(submission.timed_out),
      },
      submitted_at: submission.submitted_at ?? null,
    }];
  });

  const interviewQuestionRows = list(data["11. Interview questions"]).map((row, index) => ({
    id: 900000 + index,
    category: row.round === "system_design" ? "system" : row.round === "technical" ? "technical" : "behavioral",
    question: text(row.question),
    role: text(row.source_context?.target_role),
    ord: index,
  }));

  const statuses = applicationRows.reduce((counts, row) => ({ ...counts, [row.stage]: (counts[row.stage] ?? 0) + 1 }), {});
  const funnelOrder = ["Applied", "Screening", "Interview", "Offer", "Rejected"];
  const months = new Map();
  for (const row of list(data["8. Applications"])) {
    if (!row.applied_date) continue;
    const month = row.applied_date.slice(0, 7);
    const current = months.get(month) ?? { applications: 0, hires: 0 };
    current.applications += 1;
    if (["hired", "accepted"].includes(text(row.current_status).toLowerCase())) current.hires += 1;
    months.set(month, current);
  }
  const openJobs = jobRows.filter((row) => row.status === "Open").length;
  const averageMatch = applicationRows.length
    ? Math.round(applicationRows.reduce((sum, row) => sum + row.match_score, 0) / applicationRows.length)
    : 0;

  return {
    operations: [
      ["jobs", jobRows],
      ["candidates", candidateRows],
      ["applications", applicationRows],
      ["notifications", notificationRows],
      ["resumes", resumeRows],
      ["portfolio_projects", portfolioRows],
      ["offers", offerRows],
      ["email_templates", templateRows],
      ["team_invites", teamInviteRows],
      ["training_sessions", sessionRows],
      ["training_answers", answerRows],
      ["training_challenges", challengeRows],
      ["interview_questions", interviewQuestionRows],
      ["analytics_metrics", [
        { label: "Open roles", value: String(openJobs), delta: "Synthetic fixture", positive: true },
        { label: "Applications", value: String(applicationRows.length), delta: "Synthetic fixture", positive: true },
        { label: "Average match", value: `${averageMatch}%`, delta: "Synthetic fixture", positive: averageMatch >= 70 },
        { label: "Candidates", value: String(candidateRows.length), delta: "Synthetic fixture", positive: true },
      ]],
      ["funnel", funnelOrder.map((stage, ord) => ({ stage, count: statuses[stage] ?? 0, ord }))],
      ["hiring_trend", [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, values], ord) => ({ month, ...values, ord }))],
    ],
    skipped: [
      ["users / authentication accounts", list(data["1. Users"]).length, "synthetic identities and password placeholders are never imported"],
      ["candidate profiles", candidates.length, "profiles.id requires a real authentication UUID; candidates are imported instead"],
      ["employer profiles and companies", list(data["3. Employer profiles"]).length + list(data["4. Companies"]).length, "no matching app tables; company fields are embedded into jobs"],
      ["cover letters", list(data["9. Cover letters"]).length, "no matching app table"],
      ["pipeline and outreach records", list(data["15. Pipeline records"]).length + list(data["16. Outreach messages"]).length, "no matching app tables"],
      ["job-hunt settings, runs, and proposals", list(data["21. Job-hunt settings"]).length + list(data["22. Job-hunt runs"]).length + list(data["23. Proposal drafts"]).length, "destination ownership requires real authentication UUIDs"],
      ["application/account settings", Object.values(data["24. Application and account settings"] ?? {}).flat().length, "source settings do not safely map without authentication accounts"],
      ["portfolio templates", list(data.portfolio_templates).length, "no matching app table"],
    ],
  };
}

function printSummary(operations, skipped, mode) {
  console.log(`\nATS synthetic seed ${mode}`);
  console.log("Imported/mapped:");
  for (const [table, rows] of operations) console.log(`  ${table.padEnd(24)} ${rows.length}`);
  console.log("Skipped/source-only:");
  for (const [name, count, reason] of skipped) console.log(`  ${name}: ${count} (${reason})`);
}

async function main() {
  const data = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  validateFixture(data);
  const { operations, skipped } = buildSeed(data);
  printSummary(operations, skipped, dryRun ? "dry run" : "import");
  if (dryRun) {
    console.log("\nDry run complete. No database connection was made.");
    return;
  }

  const env = await loadEnvironment();
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env or the process environment.");
  }

  const db = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  for (const [table, rows] of operations) {
    if (!rows.length) continue;
    const { error } = await db.from(table).upsert(rows);
    if (error) throw new Error(`Failed to seed ${table}: ${error.message}`);
    console.log(`Seeded ${rows.length} row(s) into ${table}.`);
  }
  console.log("\nSeed complete.");
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});