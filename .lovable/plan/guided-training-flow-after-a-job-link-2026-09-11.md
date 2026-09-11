# Guided training flow after a job link

Turn "paste a job link" into a full, tracked preparation journey with a live progress rail.

## 1. Get trained

On the external job page, once a posting is analysed, add a primary **Get trained** button.
It saves the parsed job + fit analysis as a *training session* and opens a new page:
`/candidate/training/<session>`.

Everything below happens inside that one page, driven by that saved job — no re-pasting.

## 2. Waypoints rail (dynamic + reactive)

A sticky rail lists the checkpoints and updates live as each one is completed:

```text
Job analysed ✓ → Resume tailored → Cover letter → Portfolio → Interview (voice) → Coding challenge → Ready to apply
```

Each waypoint shows state (locked / in progress / done), its score where one exists, and
overall readiness %. State is stored per session so the candidate can leave and return.

## 3. The checkpoints

**Resume** — tailors the stored resume to this posting, shows the ATS score before/after,
keyword gaps, and saves the tailored version. Reuses the existing resume record and export
(Word/PDF) instead of duplicating it.

**Cover letter** — generated from the same session context; skippable, marked "not needed"
if the posting doesn't ask for one.

**Portfolio** — a gallery of real, officially published open-source portfolio templates
(HTML5 UP, Start Bootstrap, GitHub Pages themes — all permissively licensed, each card links
to its official source). Picking one renders a live preview filled with the candidate's own
profile, projects and skills, and saves the selection.

**Interview questions** — company- and role-specific questions generated from the posting
(company name, seniority, required skills), grouped by round. Answering is **voice only**
(existing speech input), with live transcript, per-answer AI scoring and real session stats.
Every question carries a **Sources** button linking out to official docs, W3Schools,
GeeksforGeeks, MDN and YouTube searches for that exact topic.

**Coding challenge** — easy / medium / hard problems derived from the role's stack. The
candidate types a solution in an in-page code canvas under a countdown timer; on submit the
solution is verified server-side against the problem's test cases and given a verdict plus
feedback. Timer expiry auto-submits.

## 4. Removing placeholder data

Interview scores, session stats ("1m 42s", "12 filler words", overall 87) and the canned
report text are computed from the real session: answer count, spoken duration, filler-word
count from the transcript, and AI scoring. Any remaining hardcoded sample content in the
candidate flow is replaced by live data or an honest empty state.

## 5. Technical notes

- New tables: `training_sessions` (job snapshot, evaluation, waypoint state, scores),
  `training_answers` (per-question transcript + score), `training_challenges` (problem,
  tests, submission, verdict). RLS + grants per user, as in the existing schema.
- New server modules `src/lib/training.server.ts` (AI generation, scoring, code
  verification) and `src/lib/training.functions.ts` (RPC surface), following the existing
  `*.server.ts` / `*.functions.ts` split and the current AI provider router with key
  failover — no new providers.
- Code verification runs in a sandboxed JS/Python-style evaluator on the server with a hard
  timeout; unsupported languages fall back to AI review with the test cases.
- New routes: `src/routes/_app.candidate.training.$sessionId.tsx` plus small components for
  the waypoint rail, code canvas and source links. `_app.candidate.interview.tsx` is
  refactored to consume the shared session-driven interview component.
- Existing external/resume/cover-letter/portfolio pages keep working standalone.

## 6. Local deployment

`docs/RUNNING.md` will document: prerequisites, `bun install`, the required `.env` keys
(Supabase URL + service role, session secret, AI keys, mail settings), applying
`docs/schema.sql` plus the new migration, `bun run dev` on port 8080, and `bun run build`
with the production start command.

## Build order

1. Schema + server modules (sessions, waypoints).
2. Get trained button + training page shell with the live rail.
3. Resume + cover letter + portfolio checkpoints.
4. Voice interview with sources, real scoring, placeholder removal.
5. Coding canvas with timer, difficulty and verification.
6. Docs + full build verification.
