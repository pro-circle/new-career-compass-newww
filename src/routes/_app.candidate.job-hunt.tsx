import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard, ScoreBar } from "@/components/dashboard/primitives";
import { useJobHunt } from "@/hooks/use-job-hunt";
import { draftJobApplication } from "@/lib/jobhunt.functions";
import type { DraftedApplication } from "@/lib/jobhunt.types";
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Loader2,
  Play,
  Radar,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/candidate/job-hunt")({
  head: () => ({
    meta: [
      { title: "Job Hunt Agent · ATS Engine" },
      {
        name: "description",
        content:
          "Let the Job Hunt agent scan open roles, score them against your resume, portfolio and GitHub, then apply automatically or ask for your approval first.",
      },
      { property: "og:title", content: "Job Hunt Agent · ATS Engine" },
      {
        property: "og:description",
        content:
          "An agent that finds matching roles and applies for you — with approval controls, daily caps and a full audit log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobHuntPage,
});

function JobHuntPage() {
  const { settings, proposals, log, backendReady, loading, running, update, decide, runOnce } =
    useJobHunt();
  const [titles, setTitles] = useState("");
  const [locations, setLocations] = useState("");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Flagship feature"
        title="Job Hunt agent"
        subtitle="The agent reads your latest resume, portfolio and GitHub, scores every open role, and either applies for you or asks first."
        actions={
          <button
            onClick={() => void runOnce(true)}
            disabled={running || !settings.enabled}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-surface disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            Run a pass now
          </button>
        }
      />

      {!backendReady && (
        <p className="mb-6 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          The agent needs backend keys in <code>.env</code> before it can read jobs or submit
          applications.
        </p>
      )}

      {/* Control panel */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-card to-card p-4 sm:p-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-extrabold">
                {settings.enabled ? "Agent active" : "Agent paused"}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {settings.mode === "auto"
                  ? `Applies automatically at ${settings.minScore}%+ · max ${settings.dailyLimit}/day`
                  : `Proposes matches at ${settings.minScore}%+ for your approval`}
              </div>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={settings.enabled}
            aria-label="Enable Job Hunt agent"
            onClick={() => void update({ enabled: !settings.enabled })}
            disabled={loading}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              settings.enabled ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-card shadow transition-all ${
                settings.enabled ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <Label>Mode</Label>
            <div className="mt-2 flex rounded-md border border-border bg-surface p-0.5 text-xs">
              {(
                [
                  ["review", "Ask me first"],
                  ["auto", "Apply for me"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => void update({ mode: value })}
                  className={`flex-1 rounded px-3 py-1.5 font-semibold transition-colors ${
                    settings.mode === value ? "bg-card ring-1 ring-border" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Shield className="mt-0.5 size-3 shrink-0" />
              In “Ask me first” nothing is ever submitted without your approval.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum match — {settings.minScore}%</Label>
              <input
                type="range"
                min={40}
                max={99}
                value={settings.minScore}
                onChange={(e) => void update({ minScore: Number(e.target.value) })}
                className="mt-3 w-full accent-accent"
              />
            </div>
            <div>
              <Label>Daily limit — {settings.dailyLimit}</Label>
              <input
                type="range"
                min={1}
                max={25}
                value={settings.dailyLimit}
                onChange={(e) => void update({ dailyLimit: Number(e.target.value) })}
                className="mt-3 w-full accent-accent"
              />
            </div>
          </div>

          <div>
            <Label>Target titles</Label>
            <TagInput
              value={settings.titles}
              draft={titles}
              onDraft={setTitles}
              placeholder="Senior Product Designer"
              onCommit={(next) => void update({ titles: next })}
            />
          </div>
          <div>
            <Label>Preferred locations</Label>
            <TagInput
              value={settings.locations}
              draft={locations}
              onDraft={setLocations}
              placeholder="Remote, Bengaluru"
              onCommit={(next) => void update({ locations: next })}
            />
          </div>

          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
            <Check2
              label="Use my latest resume"
              on={settings.useResume}
              onToggle={(v) => void update({ useResume: v })}
            />
            <Check2
              label="Remote roles only"
              on={settings.remoteOnly}
              onToggle={(v) => void update({ remoteOnly: v })}
            />
            <div>
              <Check2
                label="Use my portfolio"
                on={settings.usePortfolio}
                onToggle={(v) => void update({ usePortfolio: v })}
              />
              <input
                key={`pf-${settings.portfolioUrl}`}
                defaultValue={settings.portfolioUrl}
                onBlur={(e) => void update({ portfolioUrl: e.target.value })}
                placeholder="https://your-portfolio.com"
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            <div>
              <Check2
                label="Use my GitHub"
                on={settings.useGithub}
                onToggle={(v) => void update({ useGithub: v })}
              />
              <input
                key={`gh-${settings.githubUrl}`}
                defaultValue={settings.githubUrl}
                onBlur={(e) => void update({ githubUrl: e.target.value })}
                placeholder="https://github.com/you"
                className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Awaiting your approval"
          action={
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
              {proposals.length}
            </span>
          }
        >
          {proposals.length === 0 ? (
            <Empty
              icon={Radar}
              text={
                settings.enabled
                  ? "No matches waiting. The agent scans every 90 seconds while this page is open."
                  : "Switch the agent on to start finding matches."
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {proposals.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.jobTitle}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[p.company, p.location].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-extrabold text-accent">
                        {p.matchScore}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <ScoreBar score={p.matchScore} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{p.reason}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void decide(p.id, "approve")}
                      className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90"
                    >
                      <Check className="size-3.5" /> Apply now
                    </button>
                    <button
                      onClick={() => void decide(p.id, "deny")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-surface"
                    >
                      <X className="size-3.5" /> Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Agent activity">
          {log.length === 0 ? (
            <Empty icon={Bot} text="Every action the agent takes is logged here." />
          ) : (
            <div className="divide-y divide-border">
              {log.map((l) => (
                <div key={l.id} className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${
                      l.status === "applied"
                        ? "bg-accent/15 text-accent"
                        : "bg-surface text-muted-foreground"
                    }`}
                  >
                    {l.status === "applied" ? (
                      <Check className="size-3.5" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{l.jobTitle}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l.company} · {l.reason}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-xs text-muted-foreground">
                    {l.matchScore}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <DraftAnyApplication />
    </div>
  );
}

function DraftAnyApplication() {
  const [url, setUrl] = useState("");
  const [questions, setQuestions] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftedApplication | null>(null);

  async function run() {
    setBusy(true);
    setDraft(null);
    try {
      const res = await draftJobApplication({
        data: {
          url: url.trim() || undefined,
          questions: questions
            .split("\n")
            .map((q) => q.trim())
            .filter(Boolean),
        },
      });
      setDraft(res);
      if (res.degraded) toast.error("Add an AI key to .env to generate full answers");
      else toast.success("Draft ready — review before you send it");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not draft");
    } finally {
      setBusy(false);
    }
  }

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <SectionCard title="Have the agent fill out any application" className="mt-6">
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-xs text-muted-foreground">
          Paste an application link and its questions. The agent drafts truthful answers from your
          profile — nothing is submitted anywhere.
        </p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://company.com/apply/senior-designer"
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/25"
        />
        <textarea
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          rows={4}
          placeholder={
            "One question per line\nWhy do you want this role?\nDescribe a hard problem you solved."
          }
          className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/25"
        />
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {busy ? "Drafting…" : "Draft my application"}
        </button>

        {draft && (
          <div className="space-y-3">
            {draft.coverNote && (
              <div className="rounded-lg border border-border bg-surface/50 p-4">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Cover note
                  <button
                    onClick={() => copy(draft.coverNote)}
                    className="inline-flex items-center gap-1 text-accent"
                  >
                    <Copy className="size-3" /> Copy
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">{draft.coverNote}</p>
              </div>
            )}
            {draft.answers.map((a) => (
              <div key={a.question} className="rounded-lg border border-border bg-surface/50 p-4">
                <div className="mb-1 flex items-start justify-between gap-3 text-xs font-semibold">
                  <span className="min-w-0">{a.question}</span>
                  <button
                    onClick={() => copy(a.answer)}
                    className="inline-flex shrink-0 items-center gap-1 text-accent"
                  >
                    <Copy className="size-3" /> Copy
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                  {a.answer}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </div>
  );
}

function Check2({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onToggle(e.target.checked)}
        className="size-4 accent-accent"
      />
      {label}
    </label>
  );
}

function TagInput({
  value,
  draft,
  onDraft,
  onCommit,
  placeholder,
}: {
  value: string[];
  draft: string;
  onDraft: (v: string) => void;
  onCommit: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((t) => (
          <button
            key={t}
            onClick={() => onCommit(value.filter((v) => v !== t))}
            className="inline-flex items-center gap-1 rounded bg-surface px-2 py-0.5 text-[10px] font-semibold ring-1 ring-border"
          >
            {t}
            <X className="size-2.5" />
          </button>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            onCommit([...new Set([...value, draft.trim()])]);
            onDraft("");
          }
        }}
        placeholder={placeholder}
        className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-accent/25"
      />
    </div>
  );
}

function Empty({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <Icon className="size-5 text-muted-foreground" />
      <p className="max-w-xs text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
