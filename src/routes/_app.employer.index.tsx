import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/routes/_app";
import {
  Avatar,
  ScoreBar,
  SectionCard,
  StatTile,
  StatusPill,
} from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";
import { ArrowRight, Plus, Sparkles, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/employer/")({
  head: () => ({ meta: [{ title: "Employer Dashboard · ATS Engine" }] }),
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const { analyticsMetrics, candidates, jobs } = useDataset();
  const openJobs = jobs.filter((j) => j.status === "Open");
  const topCandidates = [...candidates].sort((a, b) => b.matchScore - a.matchScore).slice(0, 4);
  const top = topCandidates[0];
  const avgScore = candidates.length
    ? Math.round(candidates.reduce((s, c) => s + c.matchScore, 0) / candidates.length)
    : 0;
  const lead = top && avgScore ? Math.round(((top.matchScore - avgScore) / avgScore) * 100) : 0;
  const newCount = candidates.filter((c) => c.status === "New").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Employer portal"
        title="Active pipeline"
        subtitle={`Tracking ${openJobs.length} open roles across ${new Set(openJobs.map((j) => j.department)).size} departments.`}
        actions={
          <>
            <Link
              to="/employer/jobs"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-surface"
            >
              View all jobs
            </Link>
            <Link
              to="/employer/jobs/new"
              className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
            >
              <Plus className="size-3.5" /> New requisition
            </Link>
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analyticsMetrics.map((m) => (
          <StatTile key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard
            title="Priority roles"
            action={
              <Link to="/employer/jobs" className="text-xs font-medium text-brand hover:underline">
                View all
              </Link>
            }
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-center">Applicants</th>
                  <th className="px-5 py-3">AI match avg</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {openJobs.slice(0, 4).map((job) => (
                  <tr key={job.id} className="group transition-colors hover:bg-surface/50">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{job.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {job.department} · {job.location}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-mono text-xs">
                      <span className="font-bold text-brand">{job.new}</span>
                      <span className="text-muted-foreground"> / {job.applicants}</span>
                    </td>
                    <td className="px-5 py-4">
                      <ScoreBar score={job.matchAvg} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to="/employer/jobs/$jobId"
                        params={{ jobId: job.id }}
                        className="text-xs font-medium text-muted-foreground group-hover:text-brand"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard
            title="Top ranked candidates (all roles)"
            action={
              <Link
                to="/employer/candidates"
                className="text-xs font-medium text-brand hover:underline"
              >
                Compare top 3
              </Link>
            }
          >
            <div className="divide-y divide-border">
              {topCandidates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-surface/30"
                >
                  <Avatar initials={c.initials} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.name}</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.title} · {c.company} · {c.years}y
                    </div>
                  </div>
                  <div className="hidden gap-1.5 md:flex">
                    {c.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="rounded bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground/70 ring-1 ring-border"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Match
                    </div>
                    <div
                      className={`font-mono text-sm font-bold ${c.matchScore >= 95 ? "text-accent" : "text-brand"}`}
                    >
                      {c.matchScore}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-accent p-6 text-accent-foreground shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-accent-foreground/70">
                AI insight
              </h4>
              <Sparkles className="size-4 text-accent-foreground/70" />
            </div>
            <p className="text-sm leading-relaxed">
              {top ? (
                <>
                  <strong className="underline decoration-accent-foreground/40 underline-offset-4">
                    {top.name}
                  </strong>{" "}
                  leads the pool at{" "}
                  <strong>{top.matchScore}%</strong>
                  {lead > 0 ? (
                    <>
                      {" "}
                      — <strong>{lead}%</strong> above the {avgScore}% average
                    </>
                  ) : null}
                  . Review the shortlist in the role workspace.
                </>
              ) : (
                "No applicants yet. Post a role and the agent will start ranking candidates as they apply."
              )}
            </p>
            <div className="mt-5 flex items-center gap-2 border-t border-accent-foreground/15 pt-4">
              <TrendingUp className="size-4 text-accent-foreground/80" />
              <span className="text-xs text-accent-foreground/80">
                Pipeline health{" "}
                <strong className="text-accent-foreground">
                  {avgScore >= 80 ? "strong" : avgScore >= 60 ? "steady" : "building"}
                </strong>{" "}
                — {newCount} new applicant{newCount === 1 ? "" : "s"} awaiting screening.
              </span>
            </div>
          </div>

          <SectionCard title="Jump back into a role">
            <div className="divide-y divide-border">
              {openJobs.slice(0, 5).map((job) => (
                <Link
                  key={job.id}
                  to="/employer/jobs/$jobId"
                  params={{ jobId: job.id }}
                  className="flex items-center gap-3 p-4 hover:bg-surface/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{job.title}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {job.new} new of {job.applicants} applicants
                    </div>
                  </div>
                  <ArrowRight className="size-3 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
