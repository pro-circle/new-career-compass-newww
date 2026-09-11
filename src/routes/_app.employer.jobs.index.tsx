import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard, ScoreBar } from "@/components/dashboard/primitives";
import { ShareLink } from "@/components/share-link";
import { useDataset } from "@/hooks/use-dataset";
import { Plus, Search, LayoutGrid, Rows3, ArrowRight, Users } from "lucide-react";

export const Route = createFileRoute("/_app/employer/jobs/")({
  head: () => ({
    meta: [
      { title: "Job Requisitions · ATS Engine" },
      {
        name: "description",
        content:
          "Every role you've posted, with applicant volume, AI match quality, and a shareable application link.",
      },
    ],
  }),
  component: EmployerJobsList,
});

const STATUSES = ["All", "Open", "Draft", "Paused", "Closed"] as const;

function statusClass(status: string) {
  return status === "Open"
    ? "bg-accent/10 text-accent ring-accent/20"
    : status === "Paused"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : status === "Draft"
        ? "bg-surface text-foreground/70 ring-border"
        : "bg-muted text-muted-foreground ring-border";
}

function EmployerJobsList() {
  const { jobs, loading } = useDataset();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("All");
  const [view, setView] = useState<"cards" | "table">("cards");

  const filtered = jobs.filter(
    (j) =>
      (filter === "All" || j.status === filter) &&
      (j.title.toLowerCase().includes(query.toLowerCase()) ||
        j.department.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Step 1 · Post"
        title="Job requisitions"
        subtitle="Post a role, then open it to screen, compare, and reach out to candidates — all in one flow."
        actions={
          <Link
            to="/employer/jobs/new"
            className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
          >
            <Plus className="size-3.5" /> Post a job
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search jobs…"
            className="w-64 rounded-md border border-border bg-card py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="flex rounded-md border border-border bg-card p-0.5 text-xs">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded px-3 py-1 font-medium ${
                filter === s
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto flex rounded-md border border-border bg-card p-0.5 text-xs">
          <button
            onClick={() => setView("cards")}
            aria-pressed={view === "cards"}
            className={`inline-flex items-center gap-1 rounded px-3 py-1 font-medium ${
              view === "cards" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
            }`}
          >
            <LayoutGrid className="size-3" /> Cards
          </button>
          <button
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            className={`inline-flex items-center gap-1 rounded px-3 py-1 font-medium ${
              view === "table" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
            }`}
          >
            <Rows3 className="size-3" /> Table
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <SectionCard>
          <div className="p-12 text-center text-xs text-muted-foreground">
            {loading ? "Loading requisitions…" : "No jobs match those filters."}
          </div>
        </SectionCard>
      ) : view === "cards" ? (
        <div className="grid gap-4 animate-in fade-in duration-300 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((j) => (
            <Link
              key={j.id}
              to="/employer/jobs/$jobId"
              params={{ jobId: j.id }}
              className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-bold">{j.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {j.id} · {j.department || "—"} · {j.location || "—"}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusClass(j.status)}`}
                >
                  {j.status}
                </span>
              </div>
              <div className="mb-4 flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Users className="size-3.5" />
                  <span className="font-mono font-bold text-foreground">{j.applicants}</span>
                  applicants
                </span>
                <ScoreBar score={j.matchAvg} />
              </div>
              <div className="flex items-center justify-between">
                <ShareLink jobId={j.id} compact />
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand group-hover:gap-2 transition-all">
                  Open pipeline <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <SectionCard className="animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Dept</th>
                  <th className="px-5 py-3">Applicants</th>
                  <th className="px-5 py-3">AI match</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Posted</th>
                  <th className="px-5 py-3">Share link</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((j) => (
                  <tr key={j.id} className="hover:bg-surface/40">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{j.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {j.id} · {j.type} · {j.salary}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs">{j.department}</td>
                    <td className="px-5 py-4 font-mono text-xs">
                      <span className="font-bold">{j.new}</span>
                      <span className="text-muted-foreground"> / {j.applicants}</span>
                    </td>
                    <td className="px-5 py-4">
                      <ScoreBar score={j.matchAvg} />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${statusClass(j.status)}`}
                      >
                        {j.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{j.postedAgo}</td>
                    <td className="px-5 py-4">
                      <ShareLink jobId={j.id} compact />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to="/employer/jobs/$jobId"
                        params={{ jobId: j.id }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        Open <ArrowRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
