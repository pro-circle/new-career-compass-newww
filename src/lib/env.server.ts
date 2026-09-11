/**
 * Server-only environment access.
 *
 * Why this exists: Vite only exposes `VITE_*` variables through
 * `import.meta.env`, and in local `vite dev` the Node process is NOT
 * populated from `.env` for server-side code. That made keys placed in
 * `.env` (GROQ_API_KEY_1, OPENROUTER_API_KEY_1, SUPABASE_SERVICE_ROLE_KEY…)
 * look "missing" even though they were configured.
 *
 * `serverEnv()` reads `process.env` first (hosted runtime secrets) and falls
 * back to parsing the project's single `.env` file once, which only succeeds
 * in local dev where a real filesystem exists.
 *
 * There is exactly ONE env file in this project: `.env` at the repo root.
 * No `.env.local`, no `.env.production`. `.env.example` is the template.
 */

import fs from "node:fs";

let dotenvLoaded = false;
let dotenvValues: Record<string, string> = {};

function loadDotEnvOnce() {
  if (dotenvLoaded) return;
  dotenvLoaded = true;
  try {
    let raw: string;
    try {
      raw = fs.readFileSync(".env", "utf8");
    } catch {
      return;
    }
    {
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq < 1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (value && dotenvValues[key] === undefined) dotenvValues[key] = value;
      }
    }
  } catch {
    dotenvValues = {};
  }
}

/** Reads a server-side env var, with a local `.env` fallback in dev. */
export function serverEnv(name: string): string | undefined {
  const fromProcess = typeof process !== "undefined" ? process.env?.[name] : undefined;
  if (fromProcess) return fromProcess;
  loadDotEnvOnce();
  return dotenvValues[name];
}

/** First non-empty value among the given env var names. */
export function firstEnv(...names: string[]): string | undefined {
  for (const n of names) {
    const v = serverEnv(n);
    if (v) return v;
  }
  return undefined;
}
