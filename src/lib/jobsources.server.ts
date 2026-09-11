/**
 * Server-only live job feed.
 *
 * Pulls real, currently-open postings from public job APIs that need no key
 * (Remotive and Arbeitnow). Results are normalised into the same shape the
 * internal `jobs` table uses so the Job Hunt agent can score them with one
 * code path. Every source is best-effort: a source that fails or times out is
 * skipped instead of breaking the pass.
 */

export type ExternalJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  tags: string[];
  url: string;
  source: string;
  postedAt: string;
};

const TIMEOUT_MS = 8000;

async function getJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "ATS-Engine/1.0" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function strip(html: string): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

async function fromRemotive(query: string, limit: number): Promise<ExternalJob[]> {
  const url = `https://remotive.com/api/remote-jobs?limit=${limit}${
    query ? `&search=${encodeURIComponent(query)}` : ""
  }`;
  const data = await getJson<{ jobs?: Record<string, unknown>[] }>(url);
  return (data?.jobs ?? []).map((j) => ({
    id: `remotive-${String(j["id"] ?? "")}`,
    title: String(j["title"] ?? ""),
    company: String(j["company_name"] ?? ""),
    location: String(j["candidate_required_location"] ?? "Remote"),
    type: String(j["job_type"] ?? "Full-time"),
    description: strip(String(j["description"] ?? "")),
    tags: Array.isArray(j["tags"]) ? (j["tags"] as string[]).map(String) : [],
    url: String(j["url"] ?? ""),
    source: "Remotive",
    postedAt: String(j["publication_date"] ?? new Date().toISOString()),
  }));
}

async function fromArbeitnow(limit: number): Promise<ExternalJob[]> {
  const data = await getJson<{ data?: Record<string, unknown>[] }>(
    "https://www.arbeitnow.com/api/job-board-api",
  );
  return (data?.data ?? []).slice(0, limit).map((j) => ({
    id: `arbeitnow-${String(j["slug"] ?? "")}`,
    title: String(j["title"] ?? ""),
    company: String(j["company_name"] ?? ""),
    location: j["remote"] ? "Remote" : String(j["location"] ?? ""),
    type: Array.isArray(j["job_types"]) ? String((j["job_types"] as string[])[0] ?? "Full-time") : "Full-time",
    description: strip(String(j["description"] ?? "")),
    tags: Array.isArray(j["tags"]) ? (j["tags"] as string[]).map(String) : [],
    url: String(j["url"] ?? ""),
    source: "Arbeitnow",
    postedAt: String(j["created_at"] ?? new Date().toISOString()),
  }));
}

/** Fetch live postings matching any of the given titles. Never throws. */
export async function fetchLiveJobs(opts: {
  titles?: string[];
  limit?: number;
}): Promise<ExternalJob[]> {
  const limit = opts.limit ?? 40;
  const titles = (opts.titles ?? []).filter(Boolean).slice(0, 3);
  const queries = titles.length ? titles : [""];

  const batches = await Promise.all([
    ...queries.map((q) => fromRemotive(q, Math.ceil(limit / queries.length))),
    fromArbeitnow(limit),
  ]);

  const seen = new Set<string>();
  const out: ExternalJob[] = [];
  for (const job of batches.flat()) {
    if (!job.title || !job.url) continue;
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out.slice(0, limit);
}
