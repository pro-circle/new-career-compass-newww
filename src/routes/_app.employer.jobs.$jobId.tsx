import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard, ScoreBar, Avatar, StatusPill } from "@/components/dashboard/primitives";
import { ShareLink } from "@/components/share-link";
import { useDataset } from "@/hooks/use-dataset";
import { setCandidateStatus, contactCandidates } from "@/lib/recruiter.functions";
import type { Candidate } from "@/lib/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  Columns2,
  Loader2,
  Mail,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_app/employer/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Pipeline · ATS Engine" },
      {
        name: "description",
        content:
          "Screen applicants, compare shortlists side by side, move stages, and reach out — one continuous hiring flow per role.",
      },
    ],
  }),
  component: JobWorkspace,
});

const STEPS = [
  { key: "applicants", label: "Screen", icon: Users },
  { key: "compare", label: "Compare", icon: Columns2 },
  { key: "manage", label: "Manage", icon: Check },
  { key: "reach", label: "Reach out", icon: Mail },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const STAGES: Candidate["status"][] = [
  "New",
  "Screening",
  "Interviewing",
  "Final Round",
  "Offer",
  "Rejected",
];

function JobWorkspace() {
  const { jobId } = Route.useParams();
  const { jobs, candidates, loading } = useDataset();
  const job = jobs.find((j) => j.id === jobId);
  const [step, setStep] = useState<StepKey>("applicants");
  const [selected, setSelected] = useState<string[]>([]);
  const [stageOverrides, setStageOverrides] = useState<Record<string, Candidate["status"]>>({});

  const pool = useMemo(
    () => candidates.filter((c) => !job || !c.appliedFor || c.appliedFor === job.title),
    [candidates, job],
  );

  const chosen = pool.filter((c) => selected.includes(c.id));
  const stageOf = (c: Candidate) => stageOverrides[c.id] ?? c.status;

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  if (!job) {
    return (
      <div className="p-8">
        <SectionCard>
          <div className="p-12 text-center text-sm text-muted-foreground">
            {loading ? "Loading role…" : "That requisition no longer exists."}
            <div className="mt-4">
              <Link
                to="/employer/jobs"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Back to all jobs
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow={`${job.id} · ${job.status}`}
        title={job.title}
        subtitle={`${job.department || "—"} · ${job.location || "—"} · ${job.applicants} applicants`}
        actions={
          <div className="flex items-center gap-2">
            <ShareLink jobId={job.id} compact />
            <Link
              to="/employer/jobs"
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-surface"
            >
              <ArrowLeft className="size-3.5" /> All jobs
            </Link>
          </div>
        }
      />

      {/* Flow stepper */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
        {STEPS.map((s, i) => {
          const active = step === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                active
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              <span className="font-mono text-[10px] opacity-70">{i + 1}</span>
              <s.icon className="size-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {selected.length} selected of {pool.length} applicants
        </span>
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} className="hover:text-foreground">
            Clear selection
          </button>
        )}
      </div>

      <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {step === "applicants" && (
          <ScreenStep pool={pool} selected={selected} toggle={toggle} loading={loading} />
        )}
        {step === "compare" && <CompareStep chosen={chosen} />}
        {step === "manage" && (
          <ManageStep
            chosen={chosen}
            stageOf={stageOf}
            onStage={(id, status) => setStageOverrides((s) => ({ ...s, [id]: status }))}
          />
        )}
        {step === "reach" && <ReachStep chosen={chosen} jobTitle={job.title} />}
      </div>

      <div className="mt-6 flex justify-end">
        {step !== "reach" && (
          <button
            onClick={() => {
              const i = STEPS.findIndex((s) => s.key === step);
              if (step === "applicants" && selected.length === 0) {
                toast.error("Select at least one candidate to continue");
                return;
              }
              setStep(STEPS[i + 1].key);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
          >
            Continue <ArrowRight className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function ScreenStep({
  pool,
  selected,
  toggle,
  loading,
}: {
  pool: Candidate[];
  selected: string[];
  toggle: (id: string) => void;
  loading: boolean;
}) {
  return (
    <SectionCard title="Applicants — ranked by AI match">
      {pool.length === 0 ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          {loading ? "Loading applicants…" : "No applicants yet. Share the job link to start."}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {pool.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`flex w-full items-center gap-4 p-4 text-left transition-colors ${
                  on ? "bg-brand/5" : "hover:bg-surface/40"
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded border ${
                    on ? "border-brand bg-brand text-brand-foreground" : "border-border"
                  }`}
                >
                  {on && <Check className="size-3" />}
                </span>
                <Avatar initials={c.initials} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {c.title} · {c.company} · {c.years}y
                  </div>
                </div>
                <div className="hidden sm:block">
                  <StatusPill status={c.status} />
                </div>
                <ScoreBar score={c.matchScore} />
              </button>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function CompareStep({ chosen }: { chosen: Candidate[] }) {
  if (chosen.length === 0) {
    return (
      <SectionCard>
        <div className="p-12 text-center text-xs text-muted-foreground">
          Pick candidates in the Screen step to compare them here.
        </div>
      </SectionCard>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {chosen.map((c) => (
        <SectionCard key={c.id} title={c.name}>
          <div className="space-y-4 p-5 text-xs">
            <div className="flex items-center justify-between">
              <StatusPill status={c.status} />
              <ScoreBar score={c.matchScore} />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Now
              </div>
              {c.title} at {c.company} · {c.location} · {c.years}y
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                Strengths
              </div>
              <ul className="space-y-0.5 text-foreground/80">
                {c.strengths.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                Gaps
              </div>
              <ul className="space-y-0.5 text-foreground/80">
                {c.gaps.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.skills.map((s) => (
                <span key={s} className="rounded bg-surface px-2 py-0.5 ring-1 ring-border">
                  {s}
                </span>
              ))}
            </div>
            {c.aiInsight && (
              <p className="rounded-lg bg-surface p-3 text-foreground/80">{c.aiInsight}</p>
            )}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function ManageStep({
  chosen,
  stageOf,
  onStage,
}: {
  chosen: Candidate[];
  stageOf: (c: Candidate) => Candidate["status"];
  onStage: (id: string, status: Candidate["status"]) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function move(c: Candidate, status: Candidate["status"]) {
    onStage(c.id, status);
    setBusy(c.id);
    try {
      const res = await setCandidateStatus({ data: { candidateId: c.id, status } });
      if (res.ok) toast.success(`${c.name} → ${status}`);
      else toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update stage");
    } finally {
      setBusy(null);
    }
  }

  if (chosen.length === 0) {
    return (
      <SectionCard>
        <div className="p-12 text-center text-xs text-muted-foreground">
          Select candidates first — then move them through the pipeline here.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Move your shortlist through the pipeline">
      <div className="divide-y divide-border">
        {chosen.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-4 p-4">
            <Avatar initials={c.initials} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.title}</div>
            </div>
            {busy === c.id && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            <div className="flex flex-wrap gap-1">
              {STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => move(c, s)}
                  className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                    stageOf(c) === s
                      ? "bg-brand text-brand-foreground ring-brand"
                      : "bg-surface text-muted-foreground ring-border hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ReachStep({ chosen, jobTitle }: { chosen: Candidate[]; jobTitle: string }) {
  const [channel, setChannel] = useState<"email" | "notification">("email");
  const [subject, setSubject] = useState(`Next steps for ${jobTitle}`);
  const [body, setBody] = useState(
    `Hi there,\n\nThanks for applying to ${jobTitle}. We loved your profile and would like to move forward.\n\nAre you free for a 30-minute conversation this week?\n\nBest,\nThe hiring team`,
  );
  const [sending, setSending] = useState(false);

  async function send() {
    if (chosen.length === 0) {
      toast.error("Select candidates first");
      return;
    }
    setSending(true);
    try {
      const res = await contactCandidates({
        data: {
          candidateIds: chosen.map((c) => c.id),
          channel,
          subject,
          body,
          jobTitle,
        },
      });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SectionCard title="Compose" className="lg:col-span-2">
        <div className="space-y-4 p-5">
          <div className="flex rounded-md border border-border bg-card p-0.5 text-xs">
            <button
              onClick={() => setChannel("email")}
              className={`inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-1.5 font-semibold ${
                channel === "email" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
              }`}
            >
              <Mail className="size-3" /> Email
            </button>
            <button
              onClick={() => setChannel("notification")}
              className={`inline-flex flex-1 items-center justify-center gap-1 rounded px-3 py-1.5 font-semibold ${
                channel === "notification"
                  ? "bg-brand text-brand-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <BellRing className="size-3" /> In-app notification
            </button>
          </div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
          />
          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={sending}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
            >
              {sending && <Loader2 className="size-3.5 animate-spin" />}
              Send to {chosen.length} candidate{chosen.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recipients">
        {chosen.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No candidates selected yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {chosen.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4">
                <Avatar initials={c.initials} size="sm" />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{c.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
