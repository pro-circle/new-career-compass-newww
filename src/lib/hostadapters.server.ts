/**
 * Server-only adapters for career sites that render their posting client-side.
 *
 * Pages like Zoho Recruit, Workday, Greenhouse embeds and Next.js job boards
 * ship the real posting inside inline script payloads rather than the rendered
 * body. These helpers mine those payloads for the canonical fields so the rest
 * of the pipeline gets structured data instead of scraped guesses.
 */

export type EmbeddedJob = {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  /** True when the page clearly gated the full description behind a login. */
  gated: boolean;
};

function unescapeJson(v: string): string {
  try {
    return JSON.parse(`"${v}"`) as string;
  } catch {
    return v.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\//g, "/");
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** First string value in the HTML for any of the given JSON keys. */
function jsonValue(html: string, keys: string[], minLen = 1): string {
  for (const key of keys) {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "i");
    const m = html.match(re);
    if (!m?.[1]) continue;
    const v = stripHtml(unescapeJson(m[1])).trim();
    if (v.length >= minLen) return v;
  }
  return "";
}

/** Longest embedded string that reads like a job description body. */
function longestDescription(html: string): string {
  const keys = [
    "Job_Description",
    "job_description",
    "jobDescription",
    "descriptionHtml",
    "description_html",
    "jobDetails",
    "requisitionDescription",
  ];
  let best = "";
  for (const key of keys) {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.){120,})"`, "gi");
    for (const m of html.matchAll(re)) {
      const v = stripHtml(unescapeJson(m[1]));
      if (v.length > best.length) best = v;
    }
  }
  return best.slice(0, 12000);
}

const LOGIN_WALL =
  /(sign in to (?:view|continue|see)|log ?in to (?:view|continue|see)|create an account to (?:view|apply)|you must be signed in|please sign in to)/i;

/**
 * Mines a page's inline payloads for job fields. Returns null when nothing
 * usable was found so callers can fall back to their own heuristics.
 */
export function mineEmbeddedJob(rawHtml: string, url = ""): EmbeddedJob | null {
  if (!rawHtml) return null;

  // Some boards (Zoho Recruit) embed their payload inside a JS string, so every
  // quote arrives as \x22 / \u0022. Normalise those so field mining can see the
  // JSON; collapse the doubly-escaped inner quotes of HTML attributes first.
  const html = /\\x22|\\u0022/.test(rawHtml)
    ? rawHtml
        .replace(/\\{2,}x22/g, "'")
        .replace(/\\{2,}u0022/g, "'")
        .replace(/\\x22/g, '"')
        .replace(/\\u0022/g, '"')
    : rawHtml;

  const title = jsonValue(
    html,
    ["Job_Opening_Name", "jobTitle", "job_title", "Posting_Title", "postingTitle", "requisitionTitle"],
    3,
  );
  const company = jsonValue(
    html,
    ["company_name", "companyName", "organizationName", "hiringOrganization", "orgName", "employer"],
    2,
  );
  const city = jsonValue(html, ["City1", "City", "job_city", "locationName", "jobLocation"], 2);
  const state = jsonValue(html, ["State1", "State", "job_state", "region"], 2);
  const country = jsonValue(html, ["Country1", "Country", "job_country", "countryName"], 2);
  const type = jsonValue(html, ["Job_Type", "jobType", "employmentType", "employment_type"], 3);
  const salary = jsonValue(html, ["Salary", "salary", "payRange", "compensation"], 2);
  const description = longestDescription(html);

  const gated = LOGIN_WALL.test(html.slice(0, 200000)) && description.length < 400;

  const location = [city, state, country]
    .filter((v, i, a) => v && a.indexOf(v) === i)
    .join(", ");

  // Only report a mined posting when a job-specific field was present; generic
  // page JSON (blogs, wikis, marketing sites) must not masquerade as a job.
  if (!title && description.length < 200) return null;

  return {
    title,
    company: company || (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "").split(".")[0] ?? "";
      } catch {
        return "";
      }
    })(),
    location,
    type,
    salary,
    description,
    gated,
  };
}
