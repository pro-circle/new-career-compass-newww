# Synthetic dataset seeding

The versioned fixture at `scripts/fixtures/ats_engine_synthetic_dataset.json`
contains fictional ATS data for local and test environments. Its records use
reserved, non-functional domains and must not be treated as real accounts.

## Validate without a database

```bash
npm run seed:dry-run
```

This validates required sections and duplicate IDs, transforms the records,
prints destination counts, and reports unsupported data. It never opens a
database connection.

## Seed a Supabase database

1. Apply `docs/schema.sql` to an empty or compatible Supabase project.
2. Put these server-only values in the repository root `.env`:

   ```dotenv
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. Run:

   ```bash
   npm run seed
   ```

The script upserts rows by their primary keys, so rerunning it updates the
same fixture records instead of duplicating them. Never commit `.env`, expose
the service-role key through a `VITE_` variable, or run the seed against a
production database without reviewing the fixture and target first.

## Mapping notes

The import populates companies, employer records, jobs, candidates,
applications, cover letters, recruiter pipelines, outreach messages,
notifications, resumes, portfolio projects and templates, offers, email
templates, team invites, job-hunt settings/runs/proposals, account settings,
training sessions and answers, coding challenges, interview questions,
analytics metrics, the funnel, and hiring trends.

Authentication users and `profiles` remain source-only during the normal
seed because their IDs must belong to real authentication accounts. Apply the
latest `docs/schema.sql` before rerunning the seed against an existing database;
it adds the destination tables and columns required by the full fixture.

Password placeholders are never read into destination rows.
## Demo sign-in accounts

`npm run seed:accounts` runs the normal seed and, before it, creates real
sign-in accounts (email already confirmed) plus a matching `profiles` row for
each one:

Candidates: alex.rivera@demo.com, maya.chen@demo.com, samira.okafor@demo.com,
noah.patel@demo.com

Recruiters (employer role): recruiter@northstar-works-demo.com,
noah.patel@demo.org, team_003@synthetic.example.com,
talent@blueorbit-labs-demo.com, maya.chen@demo.org

samira.okafor@demo.com appears in both source lists; one address can only be
one account, so it is kept as a candidate and reported as a duplicate.

The password is taken from `SEED_DEMO_PASSWORD` in `.env` and falls back to
`DemoPass!2026`. Re-running the command reuses existing accounts and resets
their password to the same value. Use demo passwords in demo projects only.
