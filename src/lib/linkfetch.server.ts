/**
 * Server-only page fetcher. Follows redirects (including share.google-style
 * wrappers and meta-refresh hops) and returns readable text plus link preview
 * metadata for any URL — job posting or not.
 */
import { mineEmbeddedJob, type EmbeddedJob } from "./hostadapters.server";
export type { EmbeddedJob };

export type LinkPreview = {
  requestedUrl: string;
  finalUrl: string;
  siteName: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
};

function attr(html: string, re: RegExp): string {
  const m = html.match(re);
  return m?.[1]?.trim() ?? "";
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function meta(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"),
  ];
  for (const p of patterns) {
    const v = attr(html, p);
    if (v) return decode(v);
  }
  return "";
}

function absolute(base: string, href: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return "";
  }
}

const UAS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

/**
 * Accepts anything a user might paste: bare hosts, links wrapped in quotes or
 * angle brackets, trailing punctuation, zero-width characters from rich copies,
 * "URL:" prefixes, or a sentence with a link inside it.
 */
export function normalizeUrl(input: string): string {
  let s = (input || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  s = s.replace(/^[<"'`(\[]+/, "").replace(/[>"'`)\]]+$/, "");
  s = s.replace(/^(?:url|link|source)\s*[:=]\s*/i, "").trim();
  const inSentence = s.match(/https?:\/\/\S+/i);
  if (inSentence) s = inSentence[0];
  s = s.replace(/[.,;:!?]+$/, "");
  if (!/^https?:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
  try {
    const u = new URL(s);
    if (!u.hostname.includes(".")) throw new Error("bad host");
    return u.toString();
  } catch {
    throw new Error("That does not look like a valid link. Paste the full page URL.");
  }
}

async function tryFetch(url: string, ua: string): Promise<Response> {
  return fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": ua,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.google.com/",
    },
  });
}

/** Last-resort reader for pages that block bots or need JS to render. */
async function viaTextProxy(url: string): Promise<string> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "User-Agent": UAS[0], Accept: "text/plain" },
    });
    if (!res.ok) return "";
    return (await res.text()).slice(0, 40000);
  } catch {
    return "";
  }
}

async function get(url: string): Promise<{ html: string; finalUrl: string; kind: string }> {
  let lastStatus = 0;
  for (const ua of UAS) {
    let res: Response;
    try {
      res = await tryFetch(url, ua);
    } catch {
      continue;
    }
    if (!res.ok) {
      lastStatus = res.status;
      // 4xx bot-blocks are worth retrying with another identity; 5xx is not.
      if (res.status >= 500) break;
      continue;
    }
    const kind = (res.headers.get("content-type") || "").toLowerCase();
    return { html: await res.text(), finalUrl: res.url || url, kind };
  }

  const proxied = await viaTextProxy(url);
  if (proxied) return { html: proxied, finalUrl: url, kind: "text/plain" };

  throw new Error(
    lastStatus
      ? `Could not open that link (HTTP ${lastStatus}). It may require a login.`
      : "Could not reach that link. Check the URL and try again.",
  );
}


/** Resolves wrapper/shortener pages that redirect via meta-refresh or JS. */
function nextHop(html: string, currentUrl: string): string | null {
  const refresh = attr(
    html,
    /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"']+)["']/i,
  );
  if (refresh) {
    const abs = absolute(currentUrl, decode(refresh));
    if (abs && abs !== currentUrl) return abs;
  }
  const js = attr(
    html,
    /(?:location\.(?:replace|href\s*=)|window\.location\s*=)\s*["']([^"']+)["']/i,
  );
  if (js) {
    const abs = absolute(currentUrl, decode(js));
    if (abs && abs !== currentUrl) return abs;
  }
  // Google/LinkedIn share wrappers often keep the destination in a canonical tag.
  try {
    const host = new URL(currentUrl).hostname;
    if (/(^|\.)(share\.google|goo\.gl|lnkd\.in|t\.co|bit\.ly|l\.facebook\.com)$/i.test(host)) {
      const canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      const abs = canonical ? absolute(currentUrl, decode(canonical)) : "";
      if (abs && new URL(abs).hostname !== host) return abs;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Many career sites (Zoho Recruit, Workday, SPA job boards) render the posting
 * client-side, so the static HTML body is nearly empty. Their content usually
 * still exists as strings inside inline script payloads — pull the sentence-like
 * ones out so downstream analysis has something to work with.
 */
function embeddedText(html: string): string {
  const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of scripts) {
    for (const m of s.matchAll(/"((?:[^"\\]|\\.){50,})"/g)) {
      let v: string;
      try {
        v = JSON.parse(`"${m[1]}"`) as string;
      } catch {
        continue;
      }
      v = decode(v.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      if (v.length < 50 || seen.has(v)) continue;
      if (/https?:|[{}<>\\]|\.(js|css|less|png|jpe?g|svg|map|json|woff2?)\b|\//.test(v)) continue;
      if (v.split(" ").length < 7) continue;
      seen.add(v);
      out.push(v);
      if (out.length > 400) break;
    }
  }
  return out.join(" ");
}

/** Structured JobPosting data when the page ships schema.org JSON-LD. */
export type JsonLdJob = {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
};

function walkForJobPosting(node: unknown): Record<string, any> | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const hit = walkForJobPosting(n);
      if (hit) return hit;
    }
    return null;
  }
  const o = node as Record<string, any>;
  const type = o["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && /jobposting/i.test(t))) return o;
  for (const v of Object.values(o)) {
    const hit = walkForJobPosting(v);
    if (hit) return hit;
  }
  return null;
}

export function extractJsonLdJob(html: string): JsonLdJob | null {
  const blocks = html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const b of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(decode(b[1].trim()));
    } catch {
      continue;
    }
    const job = walkForJobPosting(parsed);
    if (!job) continue;
    const loc = job.jobLocation;
    const addr = (Array.isArray(loc) ? loc[0] : loc)?.address ?? {};
    const pay = job.baseSalary?.value ?? {};
    return {
      title: String(job.title ?? ""),
      company: String(job.hiringOrganization?.name ?? ""),
      location:
        [addr.addressLocality, addr.addressRegion, addr.addressCountry]
          .filter((x: unknown) => typeof x === "string")
          .join(", ") || (job.jobLocationType ? "Remote" : ""),
      type: String(
        Array.isArray(job.employmentType) ? job.employmentType[0] : (job.employmentType ?? ""),
      ),
      salary: [pay.minValue, pay.maxValue].filter(Boolean).join(" - "),
      description: toText(String(job.description ?? "")),
    };
  }
  return null;
}

export async function fetchReadableText(
  url: string,
): Promise<{
  text: string;
  preview: LinkPreview;
  jsonLd: JsonLdJob | null;
  embedded: EmbeddedJob | null;
}> {
  let current = normalizeUrl(url);
  let page = await get(current);
  current = page.finalUrl;

  // Wrapper/shortener chains can be several hops deep.
  const visited = new Set([current]);
  for (let i = 0; i < 4; i++) {
    const hop = nextHop(page.html, current);
    if (!hop || visited.has(hop)) break;
    visited.add(hop);
    try {
      page = await get(hop);
    } catch {
      break;
    }
    current = page.finalUrl;
  }

  const html = page.html;
  const isHtml = /<[a-z!]/i.test(html.slice(0, 2000));
  let host = "";
  try {
    host = new URL(current).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  const rawTitle = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const image = meta(html, "og:image") || meta(html, "twitter:image");
  const icon =
    attr(html, /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i) ||
    "/favicon.ico";
  const jsonLd = isHtml ? extractJsonLdJob(html) : null;

  const preview: LinkPreview = {
    requestedUrl: url,
    finalUrl: current,
    siteName: meta(html, "og:site_name") || host,
    title:
      meta(html, "og:title") ||
      decode(rawTitle) ||
      jsonLd?.title ||
      // Plain-text/proxy responses start with a "Title: ..." line.
      (html.match(/^\s*Title:\s*(.+)$/im)?.[1] ?? "").trim() ||
      host,
    description: meta(html, "og:description") || meta(html, "description") || "",
    image: image ? absolute(current, image) : "",
    favicon: absolute(current, icon),
  };

  let text = isHtml ? toText(html) : html.replace(/\s+/g, " ").trim();
  if (text.length < 1200) {
    text = [preview.title, preview.description, jsonLd?.description, text, embeddedText(html)]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  // Still nothing readable (JS-only page, bot wall): try the text proxy.
  if (text.length < 400) {
    const proxied = await viaTextProxy(current);
    if (proxied.length > text.length) text = `${text} ${proxied}`.trim();
  }

  const embedded = isHtml ? mineEmbeddedJob(html, current) : null;
  if (embedded && text.length < 1200 && embedded.description) {
    text = `${text} ${embedded.description}`.replace(/\s+/g, " ").trim();
  }

  return { text: text.slice(0, 18000), preview, jsonLd, embedded };
}

