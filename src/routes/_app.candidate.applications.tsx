import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";

export const Route = createFileRoute("/_app/candidate/applications")({
  head: () => ({ meta: [{ title: "Applications · ATS Engine" }] }),
  component: Applications,
});

const stageColor: Record<string, string> = {
  Applied: "bg-surface text-foreground/70 ring-border",
  Screening: "bg-blue-50 text-blue-700 ring-blue-200",
  Interview: "bg-brand/10 text-brand ring-brand/20",
  Offer: "bg-accent/10 text-accent ring-accent/20",
  Rejected: "bg-red-50 text-red-600 ring-red-200",
};

function Applications() {
  const { applications } = useDataset();
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Application tracker"
        title="Your active applications"
        subtitle="Follow every application from apply to offer — updates in real time."
      />

      <div className="grid gap-4">
        {applications.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:bg-surface/40"
          >
            <div className="flex flex-wrap items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface font-display font-bold">
                {a.logo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-bold">{a.jobTitle}</h3>
                  <span className="text-sm text-muted-foreground">at {a.company}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${stageColor[a.stage]}`}
                  >
                    {a.stage}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {a.id} · applied {a.appliedOn} · match {a.matchScore}%
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Pipeline progress</span>
                    <span className="font-mono">{a.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <div
                      className={`h-full ${a.stage === "Rejected" ? "bg-red-500" : a.stage === "Offer" ? "bg-accent" : "bg-brand"}`}
                      style={{ width: `${a.progress}%` }}
                    />
                  </div>
                </div>

                {a.nextStep && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
                    <strong className="text-brand">Next:</strong>
                    <span>{a.nextStep}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
