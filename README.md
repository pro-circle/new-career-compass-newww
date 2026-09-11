# ATS Engine — Career Compass AI

AI career platform with two sides: a candidate cockpit (resume studio, cover
letters, voice mock interviews, autonomous job hunt + auto-apply) and a
recruiter workspace (post a job → screen → compare → manage → reach out).

- **Framework:** TanStack Start v1 (React 19 + Vite 7, SSR)
- **Database / auth:** Supabase (Postgres, service-role access from the server)
- **Chat AI:** OpenRouter — `google/gemma-4-26b-a4b-it:free` (streaming)
- **Agent AI:** Groq — `openai/gpt-oss-120b` (parsing, matching, drafting)
- **Live jobs:** Remotive + Arbeitnow public APIs (no key required)

---

## 1. Prerequisites

- Node.js 20+ (or Bun 1.1+)
- A Supabase project
- An OpenRouter account (1–2 API keys)
- A Groq account (1–3 API keys)

## 2. Install

```bash
npm install       # or: bun install
```

## 3. Environment — one file only

This project reads **exactly one env file: `.env` at the repo root.**
There is no `.env.local`, no `.env.production`. `.env.example` is the template.

```bash
cp .env.example .env
```

Fill it in:

| Variable | Where to get it | Used by |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API | server |
| `SUPABASE_SERVICE_ROLE_KEY` | same page, **service_role** key | server only |
| `VITE_SUPABASE_URL` | same URL as above | browser |
| `VITE_SUPABASE_ANON_KEY` | same page, **anon** key | browser |
| `OPENROUTER_API_KEY_1` / `_2` | openrouter.ai → Keys | assistant chat |
| `GROQ_API_KEY_1` / `_2` / `_3` | console.groq.com → API Keys | agent tasks |
| `SESSION_SECRET` | any 64+ random chars (`openssl rand -hex 32`) | cookie signing |
| `APP_URL` | `http://localhost:5173` locally | OpenRouter referer |

Server-side code never reads `import.meta.env`; it goes through
`src/lib/env.server.ts`, which checks `process.env` first and falls back to
parsing `.env` — so keys work in `vite dev` without extra tooling.

> Only `VITE_*` values ever reach the browser. Service-role and AI keys stay
> on the server.

## 4. Database

Run the schema once in the Supabase SQL editor:

```
docs/schema.sql
```

It creates: `profiles`, `jobs`, `applications`, `candidates`, `notifications`,
`job_hunt_settings`, `job_hunt_proposals`, `job_hunt_log`, `auto_apply_settings`,
`auto_apply_log`, plus grants and RLS policies. No demo rows are inserted —
the app runs on real data only.

## 5. Run locally

```bash
npm run dev        # http://localhost:5173
```

Then:

1. Sign up at `/auth/signup`, pick a role (candidate or recruiter).
2. Candidates: complete onboarding (resume text → parsed by Groq).
3. Recruiters: post a job at `/employer/jobs/new`.

## 6. Verifying the AI wiring

| Surface | Endpoint | Provider |
| --- | --- | --- |
| Career Assistant | `POST /api/chat` (streaming) | OpenRouter gemma → Groq failover |
| Resume / cover letter / interview coach | `POST /api/generate` (streaming) | OpenRouter gemma → Groq failover |
| Resume parsing, job-link extraction, match scoring, auto-apply drafts | server functions | Groq → OpenRouter failover |

If a key is missing or rate-limited, the router marks it for a 60s cooldown
and moves to the next key; when every key fails, the UI shows the real error
message instead of failing silently.

## 7. Useful scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run preview  # preview the build
npm run lint     # eslint
npm run format   # prettier
```

## 8. Deploying

See `docs/DEPLOY.md` (Firebase + Supabase) and `docs/ARCHITECTURE.md`
(system diagram, auto-apply flow, models, costs).

## 9. Troubleshooting

| Symptom | Fix |
| --- | --- |
| "No AI provider configured" | `.env` missing `OPENROUTER_API_KEY_1` / `GROQ_API_KEY_1`; restart `npm run dev` |
| 401 from OpenRouter | key revoked, or free-tier model quota exhausted — add the 2nd key |
| Empty dashboards | schema not applied, or you have no data yet — this app ships zero mock data |
| Auth loops | `SESSION_SECRET` empty or changed between restarts |
| Voice input does nothing | Web Speech API needs Chrome/Edge over `localhost` or HTTPS |
