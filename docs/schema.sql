-- ATS Engine — complete database schema (Supabase / Postgres).
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent DDL).
-- No seed / demo rows: every row in this app is created by real users.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.app_role as enum ('employer', 'candidate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum ('Open','Draft','Closed','Paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_stage as enum ('Applied','Screening','Interview','Offer','Rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.app_role not null,
  full_name text,
  headline text,
  summary text default '',
  location text,
  years_exp int default 0,
  target_roles text[] default '{}',
  skills text[] default '{}',
  links jsonb default '[]'::jsonb,
  resume_text text,
  resume_json jsonb,
  onboarded boolean default false,
  created_at timestamptz default now()
);
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table if not exists public.jobs (
  id text primary key,
  employer_id uuid,
  title text not null,
  department text,
  location text,
  type text default 'Full-time',
  posted_at timestamptz default now(),
  status public.job_status default 'Open',
  applicants int default 0,
  new_count int default 0,
  match_avg int default 0,
  salary text,
  description text,
  tags text[] default '{}'
);
grant all on public.jobs to service_role;
grant select on public.jobs to anon;
alter table public.jobs enable row level security;
drop policy if exists "public read jobs" on public.jobs;
create policy "public read jobs" on public.jobs for select to anon using (true);

create table if not exists public.candidates (
  id text primary key,
  name text, title text, company text, location text,
  years int default 0, match_score int default 0,
  skills text[] default '{}', strengths text[] default '{}', gaps text[] default '{}',
  status text default 'New', applied_for text, ai_insight text,
  portfolio jsonb default '[]'::jsonb, initials text, email text
);
grant all on public.candidates to service_role;
alter table public.candidates enable row level security;

create table if not exists public.applications (
  id text primary key, candidate_id uuid, job_id text,
  job_title text, company text, logo text, applied_on text,
  stage public.application_stage default 'Applied',
  progress int default 0, match_score int default 0, next_step text
);
alter table public.applications add column if not exists job_id text;
grant all on public.applications to service_role;
alter table public.applications enable row level security;

create table if not exists public.job_matches (
  id text primary key, candidate_id uuid,
  title text, company text, location text, salary text,
  match_score int default 0, posted_ago text,
  skills text[] default '{}', reason text, logo text
);
grant all on public.job_matches to service_role;
alter table public.job_matches enable row level security;

create table if not exists public.notifications (
  id text primary key, user_id uuid,
  title text, time text, type text, created_at timestamptz default now()
);
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create table if not exists public.skill_radar (
  candidate_id uuid, skill text, you int, target int,
  primary key (candidate_id, skill)
);
grant all on public.skill_radar to service_role;
alter table public.skill_radar enable row level security;

create table if not exists public.roadmap (
  id text primary key, candidate_id uuid,
  week text, title text, detail text, done boolean default false, ord int default 0
);
grant all on public.roadmap to service_role;
alter table public.roadmap enable row level security;

create table if not exists public.analytics_metrics (
  label text primary key, value text, delta text, positive boolean
);
grant all on public.analytics_metrics to service_role;
grant select on public.analytics_metrics to anon;
alter table public.analytics_metrics enable row level security;
drop policy if exists "public read analytics" on public.analytics_metrics;
create policy "public read analytics" on public.analytics_metrics for select to anon using (true);

create table if not exists public.funnel (stage text primary key, count int, ord int);
grant all on public.funnel to service_role;
alter table public.funnel enable row level security;

create table if not exists public.hiring_trend (
  month text primary key, hires int, applications int, ord int
);
grant all on public.hiring_trend to service_role;
alter table public.hiring_trend enable row level security;

create table if not exists public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text default 'New chat',
  created_at timestamptz default now()
);
grant all on public.assistant_threads to service_role;
alter table public.assistant_threads enable row level security;

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.assistant_threads(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);
grant all on public.assistant_messages to service_role;
alter table public.assistant_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Interviews + question bank (employer interviews page, candidate mock loop)
-- ---------------------------------------------------------------------------
create table if not exists public.interviews (
  id text primary key,
  candidate_name text,
  role text,
  type text,
  round text,
  scheduled_at timestamptz
);
alter table public.interviews enable row level security;
grant all on public.interviews to service_role;

create table if not exists public.interview_questions (
  id bigserial primary key,
  category text not null check (category in ('behavioral','technical','system')),
  question text not null,
  role text,
  ord int default 0
);
alter table public.interview_questions enable row level security;
grant all on public.interview_questions to service_role;

-- ---------------------------------------------------------------------------
-- Auto-apply agent (candidate)
-- ---------------------------------------------------------------------------
create table if not exists public.auto_apply_settings (
  user_id uuid primary key,
  enabled boolean not null default false,
  min_score int not null default 85,
  daily_limit int not null default 5,
  updated_at timestamptz default now()
);
alter table public.auto_apply_settings enable row level security;
grant all on public.auto_apply_settings to service_role;

create table if not exists public.auto_apply_log (
  id text primary key,
  user_id uuid not null,
  job_title text,
  company text,
  match_score int,
  status text not null default 'applied',
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists auto_apply_log_user_idx
  on public.auto_apply_log (user_id, created_at desc);
alter table public.auto_apply_log enable row level security;
grant all on public.auto_apply_log to service_role;

-- Auto-apply writes applications on behalf of a candidate.
alter table public.applications add column if not exists user_id uuid;

-- ---------------------------------------------------------------------------
-- Job Hunt agent (candidate) — replaces the older auto_apply_* tables
-- ---------------------------------------------------------------------------
create table if not exists public.job_hunt_settings (
  user_id uuid primary key,
  enabled boolean not null default false,
  mode text not null default 'review',          -- 'review' | 'auto'
  min_score int not null default 75,
  daily_limit int not null default 5,
  titles text[] not null default '{}',
  locations text[] not null default '{}',
  remote_only boolean not null default false,
  use_resume boolean not null default true,
  use_portfolio boolean not null default true,
  use_github boolean not null default true,
  github_url text default '',
  portfolio_url text default '',
  updated_at timestamptz default now()
);
alter table public.job_hunt_settings enable row level security;
grant all on public.job_hunt_settings to service_role;

create table if not exists public.job_hunt_proposals (
  id text primary key,
  user_id uuid not null,
  job_id text,
  job_title text,
  company text,
  location text,
  match_score int,
  reason text,
  status text not null default 'pending',        -- pending | applied | denied
  created_at timestamptz not null default now()
);
create index if not exists job_hunt_proposals_user_idx
  on public.job_hunt_proposals (user_id, status, match_score desc);
alter table public.job_hunt_proposals enable row level security;
grant all on public.job_hunt_proposals to service_role;

create table if not exists public.job_hunt_log (
  id text primary key,
  user_id uuid not null,
  job_title text,
  company text,
  match_score int,
  status text not null default 'applied',        -- applied | denied | skipped
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists job_hunt_log_user_idx
  on public.job_hunt_log (user_id, created_at desc);
alter table public.job_hunt_log enable row level security;
grant all on public.job_hunt_log to service_role;

-- ---------------------------------------------------------------------------
-- Backfill for existing installs
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists summary text default '';

-- ---------------------------------------------------------------------------
-- Access model
-- ---------------------------------------------------------------------------
-- The app never talks to PostgREST from the browser. Every read/write goes
-- through TanStack server functions using the service-role key, so RLS stays
-- ON with no permissive policies except the two public ones above
-- (jobs + analytics_metrics, used by the public careers / share pages).
--
-- If you later expose tables directly to the browser, add per-user policies:
--   create policy "own rows" on public.applications
--     for all to authenticated using (user_id = auth.uid())
--     with check (user_id = auth.uid());
-- and grant select/insert/update/delete on that table to authenticated.

-- ---------------------------------------------------------------------------
-- Workspace features (v2): templates, offers, resumes, portfolio, settings,
-- team invites, share links and the email outbox.
-- User ids are TEXT here so the offline demo accounts work alongside real
-- Supabase auth uuids.
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  id text primary key,
  owner_id text not null,
  name text not null,
  category text default 'General',
  subject text default '',
  body text default '',
  updated_at timestamptz not null default now()
);
create index if not exists email_templates_owner_idx on public.email_templates (owner_id, updated_at desc);
alter table public.email_templates enable row level security;
grant all on public.email_templates to service_role;

create table if not exists public.offers (
  id text primary key,
  employer_id text not null,
  candidate_id text,
  candidate_name text,
  candidate_email text,
  role text,
  salary text,
  equity text,
  start_date text,
  body text,
  status text not null default 'Drafted',   -- Drafted | Sent | Signed | Declined
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists offers_employer_idx on public.offers (employer_id, created_at desc);
alter table public.offers enable row level security;
grant all on public.offers to service_role;

create table if not exists public.resumes (
  id text primary key,
  user_id text not null,
  title text default 'My resume',
  content jsonb not null default '{}'::jsonb,   -- {fullName,headline,location,summary,experience,education,skills}
  plain_text text default '',
  ats_score int default 0,
  insights jsonb not null default '[]'::jsonb,  -- [{title, body, done}]
  language text default 'English',
  updated_at timestamptz not null default now()
);
create index if not exists resumes_user_idx on public.resumes (user_id, updated_at desc);
alter table public.resumes enable row level security;
grant all on public.resumes to service_role;

create table if not exists public.portfolio_projects (
  id text primary key,
  user_id text not null,
  title text not null,
  role text default '',
  year text default '',
  tags text[] not null default '{}',
  description text default '',
  gradient text default 'from-brand/60 to-accent/60',
  url text default '',
  ord int default 0,
  created_at timestamptz not null default now()
);
create index if not exists portfolio_user_idx on public.portfolio_projects (user_id, ord, created_at desc);
alter table public.portfolio_projects enable row level security;
grant all on public.portfolio_projects to service_role;

create table if not exists public.user_settings (
  user_id text primary key,
  full_name text default '',
  email text default '',
  company text default '',
  notifications jsonb not null default '{}'::jsonb,
  floating_assistant boolean not null default true,
  theme text default 'system',
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
grant all on public.user_settings to service_role;

create table if not exists public.team_invites (
  id text primary key,
  owner_id text not null,
  email text not null,
  role text not null default 'Recruiter',
  status text not null default 'Invited',   -- Invited | Active | Revoked
  created_at timestamptz not null default now()
);
create index if not exists team_invites_owner_idx on public.team_invites (owner_id, created_at desc);
alter table public.team_invites enable row level security;
grant all on public.team_invites to service_role;

create table if not exists public.job_shares (
  job_id text primary key,
  slug text unique,
  views int not null default 0,
  created_at timestamptz not null default now(),
  last_viewed_at timestamptz
);
alter table public.job_shares enable row level security;
grant all on public.job_shares to service_role;

create table if not exists public.email_outbox (
  id text primary key,
  to_email text not null,
  subject text default '',
  body text default '',
  status text not null default 'queued',   -- queued | sent | failed
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists email_outbox_created_idx on public.email_outbox (created_at desc);
alter table public.email_outbox enable row level security;
grant all on public.email_outbox to service_role;

-- Notifications can target a candidate row as well as an auth user.
alter table public.notifications add column if not exists candidate_id text;

-- ---------------------------------------------------------------------------
-- Guided training journey (job link → resume → cover letter → portfolio →
-- voice interview → coding challenge). All rows are user-created.
-- ---------------------------------------------------------------------------

create table if not exists public.training_sessions (
  id text primary key,
  user_id text not null,
  url text default '',
  job jsonb not null default '{}'::jsonb,
  evaluation jsonb,
  questions jsonb not null default '[]'::jsonb,
  waypoints jsonb not null default '{}'::jsonb,
  cover_letter text default '',
  template_id text default '',
  resume_before int default 0,
  resume_after int default 0,
  keyword_gaps text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists training_sessions_user_idx
  on public.training_sessions (user_id, created_at desc);
alter table public.training_sessions enable row level security;
grant all on public.training_sessions to service_role;

create table if not exists public.training_answers (
  id text primary key,
  session_id text not null references public.training_sessions(id) on delete cascade,
  user_id text not null,
  question_id text default '',
  question text default '',
  round text default '',
  transcript text default '',
  score int default 0,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  feedback text default '',
  words int default 0,
  fillers int default 0,
  wpm int default 0,
  duration_sec int default 0,
  created_at timestamptz not null default now()
);
create index if not exists training_answers_session_idx
  on public.training_answers (session_id, created_at);
alter table public.training_answers enable row level security;
grant all on public.training_answers to service_role;

create table if not exists public.training_challenges (
  id text primary key,
  session_id text not null references public.training_sessions(id) on delete cascade,
  user_id text not null,
  difficulty text not null default 'easy',
  title text default '',
  prompt text default '',
  function_name text default '',
  signature text default '',
  starter text default '',
  time_limit_sec int default 600,
  tests jsonb not null default '[]'::jsonb,
  code text default '',
  verdict jsonb,
  elapsed_sec int default 0,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists training_challenges_session_idx
  on public.training_challenges (session_id, created_at);
alter table public.training_challenges enable row level security;
grant all on public.training_challenges to service_role;

-- ---------------------------------------------------------------------------
-- Synthetic fixture coverage
-- These tables retain source records that do not fit the app's compact view
-- models. Text identifiers intentionally support deterministic fixture IDs.
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id text primary key,
  name text not null,
  industry text default '',
  location text default '',
  website text default '',
  description text default '',
  team_size text default '',
  logo_placeholder text default '',
  created_at timestamptz default now()
);
grant all on public.companies to service_role;
alter table public.companies enable row level security;

create table if not exists public.employer_profiles (
  id text primary key,
  source_user_id text,
  company_id text references public.companies(id) on delete set null,
  recruiter_profile jsonb not null default '{}'::jsonb,
  notification_settings jsonb not null default '{}'::jsonb,
  subscription_plan text default '',
  plan_status text default ''
);
grant all on public.employer_profiles to service_role;
alter table public.employer_profiles enable row level security;

create table if not exists public.cover_letters (
  id text primary key,
  candidate_id text not null,
  job_id text references public.jobs(id) on delete set null,
  hiring_manager_name text default '',
  company_name text default '',
  job_title text default '',
  job_description text default '',
  candidate_highlights text[] not null default '{}',
  tone text default 'professional',
  length text default 'medium',
  generated_content text default '',
  draft_status text default 'draft',
  final_status text default 'not_final',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
grant all on public.cover_letters to service_role;
alter table public.cover_letters enable row level security;

create table if not exists public.pipeline_records (
  id text primary key,
  employer_id text,
  candidate_id text not null,
  job_id text references public.jobs(id) on delete set null,
  stage text default 'New',
  candidate_notes text default '',
  internal_tags text[] not null default '{}',
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  assigned_recruiter_user_id text,
  stage_history jsonb not null default '[]'::jsonb
);
grant all on public.pipeline_records to service_role;
alter table public.pipeline_records enable row level security;

create table if not exists public.outreach_messages (
  id text primary key,
  employer_id text,
  recipient_candidate_id text not null,
  subject text default '',
  message text default '',
  template_used_id text,
  delivery_status text default 'draft',
  opened boolean not null default false,
  replied boolean not null default false,
  sent_at timestamptz,
  follow_up_at timestamptz,
  failure_message text default ''
);
grant all on public.outreach_messages to service_role;
alter table public.outreach_messages enable row level security;

create table if not exists public.portfolio_templates (
  id text primary key,
  name text not null,
  category text default '',
  sections jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  active boolean not null default true
);
grant all on public.portfolio_templates to service_role;
alter table public.portfolio_templates enable row level security;

create table if not exists public.job_hunt_runs (
  id text primary key,
  candidate_id text not null,
  started_at timestamptz,
  completed_at timestamptz,
  status text default '',
  jobs_scanned int not null default 0,
  jobs_matched int not null default 0,
  applications_submitted int not null default 0,
  applications_skipped int not null default 0,
  failure_message text default ''
);
grant all on public.job_hunt_runs to service_role;
alter table public.job_hunt_runs enable row level security;

create table if not exists public.account_settings (
  id text primary key,
  owner_type text not null check (owner_type in ('candidate', 'employer')),
  owner_id text not null,
  profile_settings jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  privacy_preferences jsonb not null default '{}'::jsonb,
  security_settings jsonb not null default '{}'::jsonb,
  email_preferences jsonb not null default '{}'::jsonb,
  marketing_preferences jsonb not null default '{}'::jsonb,
  application_visibility text default '',
  availability_status text default ''
);
grant all on public.account_settings to service_role;
alter table public.account_settings enable row level security;

-- Preserve the full source payload on compact tables used by the app.
alter table public.jobs add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.candidates add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.applications alter column candidate_id type text using candidate_id::text;
alter table public.applications add column if not exists resume_used_id text;
alter table public.applications add column if not exists cover_letter_used_id text;
alter table public.applications add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists message text default '';
alter table public.notifications add column if not exists read_status boolean not null default false;
alter table public.notifications add column if not exists archived boolean not null default false;
alter table public.notifications add column if not exists urgent boolean not null default false;
alter table public.notifications add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.resumes add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.portfolio_projects add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.offers add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.offers add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.email_templates add column if not exists status text default '';
alter table public.email_templates add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.team_invites add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table public.team_invites add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.training_sessions add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.training_answers add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.training_challenges add column if not exists source_payload jsonb not null default '{}'::jsonb;
alter table public.interview_questions add column if not exists source_payload jsonb not null default '{}'::jsonb;

-- Existing installs originally used UUID ownership here. Text still accepts
-- real auth UUIDs and also permits deterministic synthetic candidate IDs.
alter table public.job_hunt_settings alter column user_id type text using user_id::text;
alter table public.job_hunt_settings add column if not exists source_id text unique;
alter table public.job_hunt_settings add column if not exists salary_min jsonb;
alter table public.job_hunt_settings add column if not exists resume_selection_id text;
alter table public.job_hunt_settings add column if not exists cover_letter_preference text;
alter table public.job_hunt_settings add column if not exists approval_required boolean;
alter table public.job_hunt_proposals alter column user_id type text using user_id::text;
alter table public.job_hunt_proposals add column if not exists generated_proposal text default '';
alter table public.job_hunt_proposals add column if not exists candidate_feedback text;
alter table public.job_hunt_proposals add column if not exists updated_at timestamptz;
alter table public.job_hunt_log alter column user_id type text using user_id::text;
