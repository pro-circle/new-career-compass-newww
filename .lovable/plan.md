# Add the synthetic ATS seed dataset

## Goal
Add the uploaded fictional dataset to the repository and make `npm run seed` populate the app’s existing database tables without executing the import now.

## Implementation
- Store the JSON as a versioned seed fixture under `scripts/fixtures/`.
- Add a Node-compatible seed script and a `seed` package command.
- Load `.env`, require the server database URL and service-role key, and fail clearly when either is missing.
- Validate the fixture’s top-level sections and transform supported records into the app’s current table shapes.
- Upsert records in dependency order so rerunning the command is safe and does not create duplicates.
- Seed the existing app surfaces: jobs, candidates, applications, notifications, resumes, portfolio projects, offers, templates, training sessions/answers/challenges, interview questions, job-hunt settings/proposals/logs, team invites, analytics, funnel, and hiring trend where source data supports them.
- Skip source-only entities that have no matching app table, and print a clear imported/skipped summary instead of silently discarding them.
- Never import password placeholders or treat synthetic user IDs as real authentication accounts.
- Add concise seed instructions and mapping notes to the project documentation.

## Safety and verification
- Do not connect to or modify any hosted database during implementation.
- Add a dry-run mode and run it locally to verify parsing, mappings, counts, and duplicate IDs.
- Check the seed script itself without exposing environment values.

## Technical notes
- The current schema uses service-role server access and several user columns accept text IDs, but `profiles.id` references real authentication UUIDs. Candidate fixture rows will therefore seed the `candidates` table and related text-ID tables; they will not create login accounts or `profiles` rows.
- Existing tables do not represent every source concept one-to-one. The script will make deterministic conversions only where the app has a compatible destination and report the remainder.
- To use this with a hosted Supabase project later: create the schema from `docs/schema.sql`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a local `.env`, then run `npm run seed`. The service key must stay local/server-only and must never be exposed in browser variables or committed.
