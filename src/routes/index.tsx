import { createFileRoute, Link } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowRight,
  Brain,
  FileText,
  LineChart,
  Mic,
  Sparkles,
  Target,
  Users,
  Workflow,
  Wand2,
  Languages,
  ScanSearch,
  MessagesSquare,
  Rocket,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ATS Engine — The intelligent bridge between talent and opportunity" },
      {
        name: "description",
        content:
          "AI-powered applicant tracking. Neural resume matching, ranking, mock interviews, and an autonomous job-hunt agent — for recruiters and candidates.",
      },
    ],
  }),
  component: Landing,
});

const aiFeatures = [
  {
    icon: ScanSearch,
    title: "Resume Parsing",
    desc: "Extracts skills, education, experience, and projects.",
  },
  {
    icon: Brain,
    title: "Semantic Matching",
    desc: "Matches candidates using AI beyond keyword search.",
  },
  { icon: Target, title: "AI Ranking", desc: "Prioritizes applicants by overall suitability." },
  { icon: FileText, title: "Resume Builder", desc: "Create ATS-friendly professional resumes." },
  { icon: Wand2, title: "Resume Optimizer", desc: "Improve ATS score and job relevance." },
  { icon: Languages, title: "Resume Translator", desc: "Convert resumes into multiple languages." },
  { icon: Mic, title: "AI Mock Interview", desc: "Live voice interview practice with feedback." },
  {
    icon: MessagesSquare,
    title: "Career Assistant",
    desc: "Answers career and job-related queries.",
  },
];

const employerFeatures = [
  "Create & manage job posts",
  "Candidate dashboard with AI summaries",
  "AI ranking & side-by-side compare",
  "Portfolio viewer — GitHub, LinkedIn, sites",
  "Smart search & advanced filters",
  "Guided per-role flow: screen → compare → manage → outreach",
  "Recruitment analytics & trends",
  "Email & in-app outreach to shortlists",
];

const candidateFeatures = [
  "Resume upload, builder & translator",
  "Live ATS optimizer with score",
  "AI-matched job feed with % fit",
  "External job preparation for any posting",
  "One-click apply & auto-apply",
  "AI mock interview + report",
  "Autonomous Job Hunt agent",
  "Portfolio builder from templates",
  "Application tracking + notifications",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur-xl lg:px-10">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight">ATS Engine</span>
        </div>
        <div className="hidden gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#recruiters" className="hover:text-foreground">
            Recruiters
          </a>
          <a href="#candidates" className="hover:text-foreground">
            Candidates
          </a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/auth/login"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            Login
          </Link>
          <Link
            to="/auth/signup"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Get started
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
        <h1 className="mx-auto max-w-3xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight lg:text-6xl">
          The intelligent bridge between <span className="text-brand">talent</span> and{" "}
          <span className="text-accent">opportunity</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Choose your portal to begin. One AI engine — two purpose-built experiences.
        </p>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <Link
            to="/employer"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:bg-brand/10 hover:shadow-2xl dark:hover:bg-brand/15"
          >

            <div className="mb-6 grid size-12 place-items-center rounded-xl bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand/20 group-hover:text-brand">
              <Users className="size-6" />
            </div>
            <h3 className="font-display text-xl font-bold">For Recruiters</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Rank candidates by skill-density, automate screening, and hire 10× faster.
            </p>
            <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand underline underline-offset-4 group-hover:gap-2 transition-all">
              Enter Employer Portal <ArrowRight className="size-4" />
            </div>
          </Link>

          <Link
            to="/candidate"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:bg-accent/10 hover:shadow-2xl dark:hover:bg-accent/15"
          >

            <div className="mb-6 grid size-12 place-items-center rounded-xl bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent/20 group-hover:text-accent">
              <Rocket className="size-6" />
            </div>
            <h3 className="font-display text-xl font-bold">For Candidates</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Optimize your profile, rehearse by voice, and let the agent apply for you.
            </p>
            <div className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-accent underline underline-offset-4 group-hover:gap-2 transition-all">
              Launch Career Suite <ArrowRight className="size-4" />
            </div>
          </Link>
        </div>
      </section>

      {/* Highlighted flagship feature */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-8 lg:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
              <Sparkles className="size-3" /> Flagship feature
            </div>
            <h2 className="font-display text-3xl font-extrabold leading-tight lg:text-4xl">
              The Job Hunt agent
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Set your titles, locations and match bar once. The agent then hunts across sources
              around the clock, tailors your resume and cover letter to each posting, and applies —
              asking for your approval first, or fully on autopilot.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Search,
                  t: "Hunts every source",
                  d: "Boards, careers pages, any pasted link.",
                },
                { icon: Target, t: "Tailors each apply", d: "Resume and cover note per posting." },
                {
                  icon: Rocket,
                  t: "Review or autopilot",
                  d: "It asks first — until you say don't.",
                },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="rounded-xl border border-border bg-card/70 p-4">
                  <Icon className="mb-2 size-4 text-accent" />
                  <div className="text-xs font-bold">{t}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/candidate/job-hunt"
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"
              >
                Start the Job Hunt agent <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/candidate/external"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface"
              >
                Or prep for a pasted job link
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mt-6 overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card p-8 lg:p-12">
          <div className="pointer-events-none absolute -left-16 -bottom-16 size-64 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
              <Sparkles className="size-3" /> Flagship feature
            </div>
            <h2 className="font-display text-3xl font-extrabold leading-tight lg:text-4xl">
              Job link search
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Paste any job URL — a board listing, a company careers page, or a link a friend sent
              you. The engine fetches the posting, parses the real requirements, and turns it into a
              tailored prep plan with your fit score, gaps, and a resume rewrite for that role.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Search,
                  t: "Paste any link",
                  d: "Boards, ATS pages, or raw job text.",
                },
                {
                  icon: ScanSearch,
                  t: "Parsed instantly",
                  d: "Skills, must-haves and seniority extracted.",
                },
                {
                  icon: Wand2,
                  t: "Tailored output",
                  d: "Fit score, gap list, resume + cover letter.",
                },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="rounded-xl border border-border bg-card/70 p-4">
                  <Icon className="mb-2 size-4 text-brand" />
                  <div className="text-xs font-bold">{t}</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                to="/candidate/external"
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90"
              >
                Search a job link <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* AI features grid */}

      <section id="features" className="border-y border-border bg-surface py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex flex-col items-end justify-between gap-4 md:flex-row">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand">
                AI capabilities
              </span>
              <h2 className="mt-2 font-display text-4xl font-bold">
                One engine. Sixteen intelligent features.
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Every workflow — from parsing a resume to running a mock interview — is powered by the
              same reasoning core.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aiFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent/5 hover:shadow-md"
              >
                <div className="mb-4 grid size-9 place-items-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-accent group-hover:text-accent-foreground">

                  <Icon className="size-4" />
                </div>
                <div className="text-sm font-bold">{title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recruiter preview */}
      <section id="recruiters" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-brand">
              Recruiter portal
            </span>
            <h2 className="mt-2 font-display text-4xl font-extrabold leading-[1.1]">
              Neural ranking that actually explains itself.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Stop reading 200 resumes. Our engine ranks, summarizes, and surfaces the signal — with
              rationale you can defend in a hiring committee.
            </p>
            <ul className="mt-8 space-y-3">
              {employerFeatures.map((f, i) => (
                <li key={f} className="flex items-start gap-3">
                  <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-brand/15 font-mono text-[10px] font-bold text-brand">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <span className="text-sm text-foreground/80">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/employer"
              className="mt-10 inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90"
            >
              Enter Employer Portal <ArrowRight className="size-4" />
            </Link>
          </div>

          <MockRecruiterCard />
        </div>
      </section>

      {/* Candidate preview */}
      <section id="candidates" className="border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid items-center gap-16 md:grid-cols-2">
            <MockCandidateCard />

            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-accent">
                Candidate experience
              </span>
              <h2 className="mt-2 font-display text-4xl font-extrabold leading-[1.1]">
                Your job hunt, <span className="text-muted-foreground">on autopilot.</span>
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                We don't just match you — we train you. Real-time resume feedback, voice mock
                interviews, and a step-by-step path to your dream role.
              </p>
              <ul className="mt-8 space-y-3">
                {candidateFeatures.map((f, i) => (
                  <li key={f} className="flex items-start gap-3">
                    <div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-accent/20 font-mono text-[10px] font-bold text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <span className="text-sm text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/candidate"
                className="mt-10 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Launch Career Suite <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl bg-foreground p-12 text-center text-background lg:p-16">
          <Workflow className="mx-auto size-8 text-background/60" />
          <h2 className="mt-6 font-display text-4xl font-extrabold leading-tight lg:text-5xl">
            Ready to hire — or get hired — smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-background/70">
            Pick a portal and explore the entire product. No signup required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/employer"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-5 py-3 text-sm font-medium text-brand-foreground hover:opacity-90"
            >
              I'm a Recruiter <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/candidate"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              I'm a Candidate <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-xs text-muted-foreground">
        <p>The new standard in talent acquisition.</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">

          <Link to="/legal/terms" className="font-semibold hover:text-foreground">
            Terms
          </Link>
          <Link to="/legal/privacy" className="font-semibold hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

function MockRecruiterCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-amber-400/60" />
          <span className="size-2.5 rounded-full bg-accent/60" />
        </div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
          EMPLOYER_PORTAL
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">Senior Product Designer</div>
            <div className="text-xs text-muted-foreground">JOB-4092 · 82 applicants</div>
          </div>
          <div className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
            14 new
          </div>
        </div>

        <div className="space-y-2">
          {[
            { name: "Sarah Chen", role: "Ex-Linear, Uber", score: 98, color: "text-accent" },
            {
              name: "Marcus Thorne",
              role: "Sr. Designer at Stripe",
              score: 94,
              color: "text-brand",
            },
            { name: "Anika Sharma", role: "Notion", score: 86, color: "text-brand" },
          ].map((c, i) => (
            <div
              key={c.name}
              className={`flex items-center justify-between rounded-lg border border-border p-3 ${i === 0 ? "bg-surface" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <div className="text-xs font-bold">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`text-xs font-bold ${c.color}`}>{c.score}%</div>
                <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                  <div
                    className={i === 0 ? "h-full bg-accent" : "h-full bg-brand"}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
          <Search className="size-3.5 shrink-0 text-brand" />
          <span className="text-foreground/80">
            <strong className="text-brand">AI:</strong> Sarah exceeds pool average by 24% on
            design-systems signal.
          </span>
        </div>
      </div>
    </div>
  );
}

function MockCandidateCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between bg-foreground px-5 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive/50" />
          <span className="size-2.5 rounded-full bg-amber-400/60" />
          <span className="size-2.5 rounded-full bg-accent/60" />
        </div>
        <div className="font-mono text-[10px] tracking-widest text-background/60">
          CANDIDATE_PORTAL
        </div>
      </div>
      <div className="space-y-6 p-8">
        <div className="flex items-center justify-between">
          <div className="grid size-16 place-items-center rounded-2xl bg-accent text-xl font-bold text-accent-foreground">
            94
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Resume optimization
            </div>
            <div className="text-lg font-bold">High readiness</div>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: "Quantifiable impact", val: "EXCELLENT", tone: "text-accent" },
            { label: "Tech stack alignment", val: "85% MATCH", tone: "text-amber-500" },
            { label: "Keyword density", val: "STRONG", tone: "text-accent" },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
            >
              <span className="text-xs font-medium">{r.label}</span>
              <span className={`font-mono text-xs font-bold ${r.tone}`}>{r.val}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
          <div className="mb-2 text-[10px] font-bold uppercase text-accent">Next milestone</div>
          <div className="text-sm font-bold">AI Mock Interview · Systems Design</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Complete to unlock the "Elite Applicant" badge on your profile.
          </div>
        </div>
      </div>
    </div>
  );
}
