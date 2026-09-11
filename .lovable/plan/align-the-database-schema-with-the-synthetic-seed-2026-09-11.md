# Align the database schema with the synthetic seed

## Goal
Store the fixture sections that are currently reported as skipped, while preserving the existing app tables and repeatable `npm run seed` behavior.

## Changes
- Extend `docs/schema.sql` with seed-compatible tables for companies, employer profiles, cover letters, pipeline records, outreach messages, portfolio templates, and job-hunt runs.
- Expand existing tables where the fixture contains useful fields that currently have no destination, including applications, jobs, offers, templates, team members, notifications, job-hunt settings/proposals, and account settings.
- Use text ownership/reference columns for synthetic fixture IDs where an authentication UUID is not available; keep `profiles.id` tied to real login accounts.
- Add explicit grants and row-level security for every new table, following the current server-only access model.
- Update `scripts/seed.mjs` to transform and upsert every newly supported section in dependency-safe order.
- Keep authentication users and validation/checklist metadata source-only; passwords remain excluded.
- Update the seeding guide so existing databases apply the revised schema before rerunning the seed.

## Verification
- Run the seed dry-run and confirm the newly mapped tables appear with the expected counts.
- Validate the seed script syntax and verify that only authentication identities and descriptive metadata remain skipped.

## Technical notes
- The SQL remains idempotent with `create table if not exists` and `add column if not exists` statements.
- This change only updates repository SQL and seed tooling; it will not connect to or modify a live database.
