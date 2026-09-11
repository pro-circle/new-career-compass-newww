import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicJob, applyToJob } from "@/lib/apply.functions";
import { trackShareView } from "@/lib/share.functions";
import { ThemeToggle } from "@/components/theme-toggle";
import { BackButton } from "@/components/back-button";
import { MapPin, Briefcase, Building2, Check, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/share/$jobId")({
  loader: async ({ params }) => {
    const resolved = await trackShareView({ data: { slugOrId: params.jobId } });
    const id = resolved.jobId ?? params.jobId;
    return getPublicJob({ data: { id } });
  },
  head: () => ({
    meta: [
      { title: "Open role · ATS Engine" },
      {
        name: "description",
        content: "A role shared from ATS Engine. Apply and track your application in one place.",
      },
      { property: "og:title", content: "Open role · ATS Engine" },
      {
        property: "og:description",
        content: "A role shared from ATS Engine. Apply and track your application in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedJob,
});

function SharedJob() {
  const job = Route.useLoaderData();
  const { jobId } = Route.useParams();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function apply() {
    setBusy(true);
    try {
      const res = await applyToJob({ data: { jobId: job?.id ?? jobId } });
      if (res.ok) {
        setDone(true);
        toast.success("Application submitted");
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-2">
          <BackButton className="mr-1" variant="ghost" />
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-brand text-[10px] font-bold text-brand-foreground">
              ATS
            </div>
            <span className="font-display text-lg font-extrabold tracking-tight">ATS Engine</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to="/auth/login"
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        {!job ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <h1 className="font-display text-2xl font-extrabold">Role not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This shared link ({jobId}) is no longer active.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground"
            >
              Back home <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
              Shared role · {job.id}
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">{job.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {job.department && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5" /> {job.department}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {job.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-3.5" /> {job.type}
                {job.salary ? ` · ${job.salary}` : ""}
              </span>
            </div>

            {job.description && (
              <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                {job.description}
              </p>
            )}

            {job.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {job.tags.map((t: string) => (
                  <span
                    key={t}
                    className="rounded bg-surface px-2 py-0.5 text-[10px] font-semibold text-foreground/70 ring-1 ring-border"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <button
                onClick={apply}
                disabled={busy || done}
                className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : done ? (
                  <Check className="size-4" />
                ) : null}
                {done ? "Application submitted" : "Apply for this role"}
              </button>
              <span className="text-xs text-muted-foreground">
                Applications are managed inside ATS Engine — no external forms.
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
