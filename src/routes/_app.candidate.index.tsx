import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/routes/_app";
import { SectionCard, StatTile } from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";
import { useProfile } from "@/hooks/use-profile";
import {
  ArrowRight,
  Bell,
  FileText,
  ImageIcon,
  Link2,
  Mic,
  Rocket,
  Sparkles,
  Wand2,
} from "lucide-react";

export const Route = createFileRoute("/_app/candidate/")({
  head: () => ({
    meta: [
      { title: "Candidate Overview · ATS Engine" },
      {
        name: "description",
        content:
          "Follow one guided flow: upload your resume, pick a job, let the agent tailor and prepare you, then apply.",
      },
    ],
  }),
  component: CandidateHome,
});

const FLOW = [
  {
    step: "01",
    title: "Upload resume & profile",
    detail: "Parse your experience once — every later step reuses it.",
    to: "/candidate/resume" as const,
    icon: FileText,
  },
  {
    step: "02",
    title: "Pick a job or paste a link",
    detail: "Choose a match, or drop any job URL and we'll read it.",
    to: "/candidate/external" as const,
    icon: Link2,
  },
  {
    step: "03",
    title: "Tailor resume & cover letter",
    detail: "The agent rewrites both against that exact posting.",
    to: "/candidate/cover-letter" as const,
    icon: Wand2,
  },
  {
    step: "04",
    title: "Practice the interview",
    detail: "Voice-led mock, with a coding round when the role needs it.",
    to: "/candidate/interview" as const,
    icon: Mic,
  },
  {
    step: "05",
    title: "Apply — or let the agent do it",
    detail: "Review each match, or hand the hunt to the Job Hunt agent.",
    to: "/candidate/job-hunt" as const,
    icon: Rocket,
  },
];

function CandidateHome() {
  const { applications, jobMatches, notifications } = useDataset();
  const { profile } = useProfile();
  const activeApps = applications.filter((a) => a.stage !== "Rejected");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Candidate portal"
        title={`Welcome back${profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}`}
        subtitle="One flow, start to offer. Pick up wherever you left off."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="ATS resume score" value="—" delta="Open resume studio" positive />
        <StatTile
          label="Active applications"
          value={String(activeApps.length)}
           delta={activeApps.length ? "In progress" : "Start applying"}
          positive
        />
       <StatTile label="Interview readiness" value="—" delta="Practice an interview" positive />
       <StatTile label="New matches" value={String(jobMatches.length)} delta={jobMatches.length ? "Review matches" : "No matches yet"} positive />
      </div>

      <SectionCard title="Your flow" className="animate-ats-fade-up mb-6">
        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-5">
          {FLOW.map((f) => (
            <Link
              key={f.step}
              to={f.to}
              className="group bg-card p-5 transition-colors hover:bg-surface/60"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  {f.step}
                </span>
                <f.icon className="size-4 text-accent" />
              </div>
              <div className="text-sm font-bold">{f.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                Continue <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </SectionCard>

      <div className="animate-ats-fade-up grid gap-6 lg:grid-cols-3 [animation-delay:100ms]">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Top matches for you"
            action={
              <Link
                to="/candidate/jobs"
                className="text-xs font-medium text-accent hover:underline"
              >
                See all matches
              </Link>
            }
          >
            <div className="divide-y divide-border">
              {jobMatches.slice(0, 3).map((m) => (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <div className="grid size-11 place-items-center rounded-lg bg-surface font-display text-sm font-bold">
                    {m.logo}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{m.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.company} · {m.location} · {m.salary}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Match
                    </div>
                    <div className="font-mono text-sm font-bold text-accent">{m.matchScore}%</div>
                  </div>
                  <button className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-foreground p-6 text-background">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-background/60">
                Job Hunt agent
              </h4>
              <Sparkles className="size-4 text-accent" />
            </div>
            <p className="text-xs text-background/70">
              Let the agent scan sources, tailor each application, and apply on your behalf — in
              review mode it asks first.
            </p>
            <Link
              to="/candidate/job-hunt"
              className="mt-5 inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90"
            >
              <Rocket className="size-3.5" /> Open Job Hunt
            </Link>
          </div>

          <SectionCard title="Notifications">
            <div className="divide-y divide-border">
              {notifications.slice(0, 4).map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-4">
                  <Bell className="mt-0.5 size-4 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{n.title}</div>
                    <div className="text-[10px] text-muted-foreground">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/candidate/resume"
              className="rounded-xl border border-border bg-card p-4 hover:border-accent/40"
            >
              <Wand2 className="size-4 text-accent" />
              <div className="mt-2 text-xs font-bold">Optimize resume</div>
              <div className="text-[10px] text-muted-foreground">Improve ATS score</div>
            </Link>
            <Link
              to="/candidate/portfolio"
              className="rounded-xl border border-border bg-card p-4 hover:border-accent/40"
            >
              <ImageIcon className="size-4 text-accent" />
              <div className="mt-2 text-xs font-bold">Portfolio</div>
              <div className="text-[10px] text-muted-foreground">Build from templates</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
