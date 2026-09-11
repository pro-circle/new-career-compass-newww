# Running ATS Engine locally

## 1. Prerequisites

- [Bun](https://bun.sh) 1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- A Supabase project (free tier is enough) — Postgres + Auth
- At least one AI key: Groq and/or OpenRouter (both have free tiers)

## 2. Install

```bash
bun install
```

## 3. Environment

Copy the example file and fill it in:

```bash
cp .env.example .env
```

| Variable | Required | What it is |
|---|---|---|
| `SUPABASE_URL` | yes | Project URL from Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Service role key (server-only, never `VITE_`-prefixed) |
| `SESSION_SECRET` | yes | Any long random string; signs the session cookie |
| `GROQ_API_KEY_1` … `_3` | recommended | Agent model (parsing, scoring, tailoring, challenges) |
| `OPENROUTER_API_KEY_1` / `_2` | recommended | Chat model (assistant, cover letters, streaming) |
| `APP_URL` | no | Public URL, used as the OpenRouter referer |
| `SMTP_*` / Gmail app password | no | Outbound email (recruiter outreach, resume delivery) |

Without AI keys the app still runs: every AI step falls back to deterministic
scoring and locally generated content, and says so in the UI.

## 4. Database

Open the Supabase SQL editor and run the whole of `docs/schema.sql`. It is
idempotent, contains no demo rows, and includes the training tables
(`training_sessions`, `training_answers`, `training_challenges`). Re-run it
after pulling changes that add tables.

## 5. Develop

```bash
bun run dev          # http://localhost:8080
```

Sign up, pick the candidate role, complete onboarding, then paste a job link in
**External Job Prep → Get trained**.

## 6. Production build

```bash
bun run build        # type-checked production bundle
bun run start        # serves the built app
```

Deployment targets (Firebase Hosting + Functions) are configured in
`firebase.json`; `bun run build` output is what gets deployed.

## 7. Troubleshooting

- **"Backend not configured"** — `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
  missing from `.env`; restart the dev server after adding them.
- **Voice input does nothing** — the Web Speech API needs Chrome or Edge over
  `localhost` or HTTPS, with microphone permission granted.
- **AI steps return heuristic results** — no reachable AI key; each provider key
  is put on a 60-second cooldown after a failure.
