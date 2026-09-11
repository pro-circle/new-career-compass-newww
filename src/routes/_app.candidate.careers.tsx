import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { listOpenJobs, applyToJob } from "@/lib/apply.functions";
import type { Job } from "@/lib/types";
import { Search, MapPin, Briefcase, Loader2, Check, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/candidate/careers")({
  head: () => ({
    meta: [
      { title: "Careers · ATS Engine" },
      {
        name: "description",
        content:
          "Browse every open role posted by recruiters on ATS Engine and apply in one click.",
      },
    ],
  }),
  component: CandidateCareers,
});

function CandidateCareers() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listOpenJobs()
      .then((rows) => !cancelled && setJobs(rows))
      .catch((error) => {
        if (!cancelled) {
          setJobs([]);
          toast.error(error instanceof Error ? error.message : "Could not load open roles");
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply(job: Job) {
    setApplying(job.id);
    try {
      const res = await applyToJob({ data: { jobId: job.id } });
      if (res.ok) {
        setApplied((a) => [...a, job.id]);
        toast.success(`Applied to ${job.title}`);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply");
    } finally {
      setApplying(null);
    }
  }

  const filtered = jobs.filter((j) =>
    `${j.title} ${j.department} ${j.location} ${j.tags.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Open roles"
        title="Careers"
        subtitle="Every role posted by recruiters on this ATS. Apply directly — your profile and resume are attached automatically."
      />

      <div className="mb-5 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles, teams, locations…"
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} open</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading open roles…
        </div>
      ) : filtered.length === 0 ? (
        <SectionCard>
          <div className="p-12 text-center text-sm text-muted-foreground">
            No open roles right now. Check back soon — new requisitions appear here the moment a
            recruiter publishes them.
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((job) => {
            const done = applied.includes(job.id);
            return (
              <div
                key={job.id}
                className="animate-ats-fade-up flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="font-display text-base font-bold leading-snug">{job.title}</div>
                  <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent ring-1 ring-accent/20">
                    {job.type}
                  </span>
                </div>
                <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                  {job.department && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="size-3" /> {job.department}
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3" /> {job.location}
                    </div>
                  )}
                  {job.salary && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="size-3" /> {job.salary}
                    </div>
                  )}
                </div>
                {job.description && (
                  <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-foreground/70">
                    {job.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{job.id}</span>
                  <button
                    onClick={() => apply(job)}
                    disabled={done || applying === job.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {applying === job.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : done ? (
                      <Check className="size-3" />
                    ) : null}
                    {done ? "Applied" : "Apply now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
