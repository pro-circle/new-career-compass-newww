import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";
import { Globe, ExternalLink, Monitor, Smartphone, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/employer/careers")({
  head: () => ({ meta: [{ title: "Careers Page · ATS Engine" }] }),
  component: CareersPage,
});

function CareersPage() {
  const { jobs } = useDataset();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const openJobs = jobs.filter((j) => j.status === "Open");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Employer branding"
        title="Careers page"
        subtitle="Public careers site auto-generated from your open requisitions."
        actions={
          <>
            <button
              onClick={() => {
                navigator.clipboard?.writeText("https://careers.ats-engine.com");
                toast.success("URL copied");
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-surface"
            >
              <Copy className="size-3.5" /> careers.ats-engine.com
            </button>
            <button className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90">
              <ExternalLink className="size-3.5" /> Open live site
            </button>
          </>
        }
      />

      <div className="mb-4 inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
        {(["desktop", "mobile"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold capitalize ${
              device === d ? "bg-brand text-brand-foreground" : "text-muted-foreground"
            }`}
          >
            {d === "desktop" ? (
              <Monitor className="size-3.5" />
            ) : (
              <Smartphone className="size-3.5" />
            )}
            {d}
          </button>
        ))}
      </div>

      <SectionCard>
        <div className="bg-surface p-6">
          <div
            className={`mx-auto overflow-hidden rounded-2xl border border-border bg-card shadow-xl transition-all ${
              device === "mobile" ? "max-w-[380px]" : "max-w-5xl"
            }`}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-surface/60 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <div className="ml-3 flex-1 rounded-md bg-card px-3 py-1 font-mono text-[10px] text-muted-foreground">
                careers.ats-engine.com
              </div>
            </div>

            {/* Hero */}
            <div className="relative overflow-hidden bg-foreground px-10 py-16 text-background">
              <div className="relative z-10 max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background/70">
                  <Globe className="size-3 text-accent" /> We're hiring
                </div>
                <h1 className="font-display text-4xl font-extrabold leading-tight">
                  Build the future of <span className="text-accent">work</span> with us.
                </h1>
                <p className="mt-4 max-w-xl text-sm text-background/70">
                  ATS Engine is a distributed team of designers, engineers, and researchers
                  rewriting how teams hire and grow.
                </p>
                <div className="mt-6 flex gap-3">
                  <div className="rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground">
                    See open roles
                  </div>
                  <div className="rounded-md border border-white/20 px-4 py-2 text-xs font-semibold text-background">
                    Our values
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-brand/40 blur-3xl" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-card md:grid-cols-4">
              {[
                { k: "112", v: "Teammates" },
                { k: "18", v: "Countries" },
                { k: "$32M", v: "Series B" },
                { k: "4.9★", v: "Glassdoor" },
              ].map((s) => (
                <div key={s.v} className="p-5 text-center">
                  <div className="font-display text-2xl font-extrabold">{s.k}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {s.v}
                  </div>
                </div>
              ))}
            </div>

            {/* Openings */}
            <div className="p-8">
              <h2 className="mb-5 font-display text-xl font-extrabold">
                Open positions ({openJobs.length})
              </h2>
              <div className="divide-y divide-border rounded-lg border border-border">
                {openJobs.slice(0, 6).map((j) => (
                  <div key={j.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="text-sm font-semibold">{j.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {j.department} · {j.location} · {j.type}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">
                      <div className="font-mono">{j.id}</div>
                      <div>{j.applicants} applicants</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-surface/40 p-6 text-center text-[11px] text-muted-foreground">
              © 2026 ATS Engine Labs, Inc. · Careers page powered by ATS Engine
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
