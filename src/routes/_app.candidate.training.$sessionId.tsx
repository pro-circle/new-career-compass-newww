import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Terminal,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/routes/_app";
import { SectionCard, ScoreBar } from "@/components/dashboard/primitives";
import { WaypointRail } from "@/components/training/waypoint-rail";
import { CodeCanvas } from "@/components/training/code-canvas";
import { SourceLinks } from "@/components/training/sources";
import { SITE_TEMPLATES, templateById } from "@/lib/portfolio-templates";
import { useSpeechInput } from "@/hooks/use-speech-input";
import {
  applyPortfolioTemplate,
  getTraining,
  makeChallenge,
  makeCoverLetter,
  makeQuestions,
  submitAnswer,
  submitChallenge,
  tailorResumeForJob,
  updateWaypoint,
  type PortfolioFill,
  type TrainingAnswer,
  type TrainingBundle,
  type TrainingChallenge,
} from "@/lib/training.functions";

export const Route = createFileRoute("/_app/candidate/training/$sessionId")({
  head: () => ({
    meta: [
      { title: "Get Trained · ATS Engine" },
      {
        name: "description",
        content:
          "A guided preparation journey for one job posting: tailored resume, cover letter, portfolio, voice interview and a timed coding challenge.",
      },
    ],
  }),
  component: TrainingPage,
});

type Step = "analysis" | "resume" | "cover" | "portfolio" | "interview" | "coding" | "ready";

function TrainingPage() {
  const { sessionId } = Route.useParams();
  const [bundle, setBundle] = useState<TrainingBundle | null>(null);
  const [step, setStep] = useState<Step>("analysis");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getTraining({ data: { id: sessionId } });
      setBundle(res);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load training session");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading)
    return (
      <div className="grid place-items-center p-16 text-sm text-muted-foreground">
        <Loader2 className="mb-2 size-5 animate-spin" /> Loading your training session…
      </div>
    );

  const session = bundle?.session;
  if (!session)
    return (
      <div className="p-8">
        <PageHeader
          title="Training session not found"
          subtitle={bundle?.message ?? "This session no longer exists."}
        />
        <Link
          to="/candidate/external"
          className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
        >
          Analyse a job link
        </Link>
      </div>
    );

  const job = session.job;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Guided training"
        title={job.title || "Your training plan"}
        subtitle={[job.company, job.location, job.type].filter(Boolean).join(" · ")}
        actions={
          session.url && (
            <a
              href={session.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-accent/40 hover:text-accent"
            >
              <ExternalLink className="size-3.5" /> Open posting
            </a>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <WaypointRail
          waypoints={session.waypoints}
          active={step}
          onJump={(id) => setStep(id as Step)}
        />

        <div className="min-w-0 space-y-6">
          {step === "analysis" && <Analysis bundle={bundle} onNext={() => setStep("resume")} />}
          {step === "resume" && (
            <ResumeStep
              sessionId={sessionId}
              bundle={bundle}
              refresh={refresh}
              onNext={() => setStep("cover")}
            />
          )}
          {step === "cover" && (
            <CoverStep
              sessionId={sessionId}
              bundle={bundle}
              refresh={refresh}
              onNext={() => setStep("portfolio")}
            />
          )}
          {step === "portfolio" && (
            <PortfolioStep
              sessionId={sessionId}
              bundle={bundle}
              refresh={refresh}
              onNext={() => setStep("interview")}
            />
          )}
          {step === "interview" && (
            <InterviewStep
              sessionId={sessionId}
              bundle={bundle}
              refresh={refresh}
              onNext={() => setStep("coding")}
            />
          )}
          {step === "coding" && (
            <CodingStep
              sessionId={sessionId}
              bundle={bundle}
              refresh={refresh}
              onNext={() => setStep("ready")}
            />
          )}
          {step === "ready" && <ReadyStep bundle={bundle} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ analysis ---------------------------- */

function Analysis({ bundle, onNext }: { bundle: TrainingBundle; onNext: () => void }) {
  const job = bundle.session!.job;
  const ev = bundle.session!.evaluation;
  return (
    <>
      <SectionCard title="Role summary">
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-3.5" />
            {[job.company, job.location, job.type, job.salary].filter(Boolean).join(" · ") ||
              "Details not published"}
          </div>
          {job.description && (
            <p className="text-sm leading-relaxed text-foreground/80">
              {job.description.slice(0, 900)}
            </p>
          )}
          {job.requirements.length > 0 && (
            <ul className="space-y-1.5 text-xs">
              {job.requirements.slice(0, 10).map((r) => (
                <li key={r} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>

      {ev && (
        <SectionCard title="Your fit right now">
          <div className="space-y-4 p-6">
            <div className="font-display text-4xl font-extrabold text-accent">{ev.matchScore}%</div>
            <ScoreBar score={ev.matchScore} tone="accent" />
            <p className="text-xs leading-relaxed text-muted-foreground">{ev.summary}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ev.gaps.map((g) => (
                <div key={g} className="flex gap-2 rounded-md bg-surface p-3 text-xs">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      <NextButton label="Start with the resume" onClick={onNext} />
    </>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90"
      >
        {label} →
      </button>
    </div>
  );
}

/* ------------------------------- resume ----------------------------- */

function ResumeStep({
  sessionId,
  bundle,
  refresh,
  onNext,
}: {
  sessionId: string;
  bundle: TrainingBundle;
  refresh: () => Promise<void>;
  onNext: () => void;
}) {
  const s = bundle.session!;
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await tailorResumeForJob({ data: { id: sessionId } });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not tailor your resume");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SectionCard title="Tailor your resume to this posting">
        <div className="space-y-5 p-6">
          <p className="text-sm text-foreground/80">
            Your stored resume is rewritten for this exact role — same facts, the posting's language
            — and re-scored for ATS match.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Metric label="ATS before" value={s.resumeBefore || 0} />
            <Metric label="ATS after" value={s.resumeAfter || 0} tone="accent" />
          </div>
          {s.keywordGaps.length > 0 && (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Keywords the posting uses that your resume did not
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.keywordGaps.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={run}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wand2 className="size-3.5" />
              )}
              {busy ? "Tailoring…" : s.resumeAfter ? "Tailor again" : "Tailor my resume"}
            </button>
            <Link
              to="/candidate/resume"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs font-semibold hover:border-accent/40 hover:text-accent"
            >
              <FileText className="size-3.5" /> Open Resume Studio & download
            </Link>
          </div>
        </div>
      </SectionCard>
      <NextButton label="Next: cover letter" onClick={onNext} />
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "accent" }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-3xl font-extrabold ${tone === "accent" ? "text-accent" : ""}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

/* ---------------------------- cover letter -------------------------- */

function CoverStep({
  sessionId,
  bundle,
  refresh,
  onNext,
}: {
  sessionId: string;
  bundle: TrainingBundle;
  refresh: () => Promise<void>;
  onNext: () => void;
}) {
  const s = bundle.session!;
  const [busy, setBusy] = useState(false);
  const [letter, setLetter] = useState(s.coverLetter);

  async function run() {
    setBusy(true);
    try {
      const res = await makeCoverLetter({ data: { id: sessionId } });
      if (res.ok && res.letter) {
        setLetter(res.letter);
        toast.success(res.message);
        await refresh();
      } else toast.error(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not draft cover letter");
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    try {
      const res = await updateWaypoint({ data: { id: sessionId, step: "cover", status: "skipped" } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Cover letter skipped");
      await refresh();
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not skip cover letter");
    }
  }

  return (
    <>
      <SectionCard
        title="Cover letter"
        action={
          <button
            onClick={skip}
            className="text-[11px] font-semibold text-muted-foreground hover:text-accent"
          >
            Not needed for this role
          </button>
        }
      >
        <div className="space-y-4 p-6">
          <button
            onClick={run}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {busy ? "Drafting…" : letter ? "Draft again" : "Draft my cover letter"}
          </button>
          {letter && (
            <>
              <textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                rows={16}
                className="w-full resize-y rounded-md border border-border bg-surface p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-accent/25"
              />
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(letter);
                  toast.success("Copied");
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
              >
                <Copy className="size-3.5" /> Copy
              </button>
            </>
          )}
        </div>
      </SectionCard>
      <NextButton label="Next: portfolio" onClick={onNext} />
    </>
  );
}

/* ----------------------------- portfolio ---------------------------- */

function PortfolioStep({
  sessionId,
  bundle,
  refresh,
  onNext,
}: {
  sessionId: string;
  bundle: TrainingBundle;
  refresh: () => Promise<void>;
  onNext: () => void;
}) {
  const s = bundle.session!;
  const [fill, setFill] = useState<PortfolioFill | null>(null);
  const [busy, setBusy] = useState("");

  async function choose(templateId: string) {
    setBusy(templateId);
    try {
      const res = await applyPortfolioTemplate({ data: { id: sessionId, templateId } });
      if (res.ok && res.fill) {
        setFill(res.fill);
        toast.success(res.message);
        await refresh();
      } else toast.error(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not prepare portfolio");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <SectionCard title="Pick a portfolio template">
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {SITE_TEMPLATES.map((t) => {
            const on = (fill?.templateId ?? s.templateId) === t.id;
            return (
              <div
                key={t.id}
                className={`overflow-hidden rounded-xl border ${on ? "border-accent" : "border-border"}`}
              >
                <div className={`h-20 bg-gradient-to-br ${t.accent}`} />
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm font-bold">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground">{t.license}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.blurb}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => choose(t.id)}
                      disabled={!!busy}
                      className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      {busy === t.id ? "Filling…" : on ? "Selected" : "Use with my data"}
                    </button>
                    <a
                      href={t.source}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-accent"
                    >
                      {t.author} <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {fill && <TemplatePreview fill={fill} />}
      <NextButton label="Next: interview" onClick={onNext} />
    </>
  );
}

function TemplatePreview({ fill }: { fill: PortfolioFill }) {
  const t = templateById(fill.templateId);
  return (
    <SectionCard title={`${t.name} — filled with your profile`}>
      <div className="p-6">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className={`bg-gradient-to-br ${t.accent} px-6 py-10 text-center`}>
            <div className="font-display text-2xl font-extrabold">
              {fill.fullName || "Your name"}
            </div>
            <div className="text-xs text-foreground/70">
              {[fill.headline, fill.location, fill.email].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="space-y-5 bg-card p-6">
            {fill.summary && <p className="text-sm leading-relaxed">{fill.summary}</p>}
            {fill.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {fill.skills.map((sk) => (
                  <span
                    key={sk}
                    className="rounded bg-surface px-2 py-0.5 text-[10px] font-semibold"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            )}
            {fill.projects.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {fill.projects.map((p) => (
                  <div key={p.title} className="rounded-lg bg-surface p-4">
                    <div className="text-sm font-bold">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[p.role, p.year].filter(Boolean).join(" · ")}
                    </div>
                    <p className="mt-1 text-xs">{p.desc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No projects saved yet —{" "}
                <Link
                  to="/candidate/portfolio"
                  className="font-semibold text-accent hover:underline"
                >
                  add them in Portfolio
                </Link>{" "}
                and they appear here.
              </p>
            )}
            {fill.experience.length > 0 && (
              <div className="space-y-3">
                {fill.experience.map((e) => (
                  <div key={`${e.company}-${e.title}`} className="border-l-2 border-accent/40 pl-3">
                    <div className="text-sm font-semibold">
                      {e.title} — {e.company}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{e.dates}</div>
                    <ul className="mt-1 space-y-0.5 text-xs">
                      {e.bullets.slice(0, 3).map((b) => (
                        <li key={b}>· {b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Download the original {t.name} template from{" "}
          <a
            href={t.source}
            target="_blank"
            rel="noreferrer noopener"
            className="font-semibold text-accent hover:underline"
          >
            {t.author}
          </a>{" "}
          ({t.license}) and drop this content straight in.
        </p>
      </div>
    </SectionCard>
  );
}

/* ----------------------------- interview ---------------------------- */

function InterviewStep({
  sessionId,
  bundle,
  refresh,
  onNext,
}: {
  sessionId: string;
  bundle: TrainingBundle;
  refresh: () => Promise<void>;
  onNext: () => void;
}) {
  const s = bundle.session!;
  const [questions, setQuestions] = useState(s.questions);
  const [answers, setAnswers] = useState<TrainingAnswer[]>(bundle.answers);
  const [idx, setIdx] = useState(bundle.answers.length);
  const [busy, setBusy] = useState(false);
  const [scoring, setScoring] = useState(false);
  const voice = useSpeechInput();
  const startedAt = useRef<number>(0);

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error]);

  async function generate() {
    setBusy(true);
    try {
      const res = await makeQuestions({ data: { id: sessionId, count: 8 } });
      if (res.ok && res.questions) {
        setQuestions(res.questions);
        setIdx(0);
        setAnswers([]);
        toast.success(res.message);
        await refresh();
      } else toast.error(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate questions");
    } finally {
      setBusy(false);
    }
  }

  const current = questions[idx];

  async function finishAnswer() {
    if (!current) return;
    if (voice.listening) voice.stop();
    const transcript = `${voice.transcript} ${voice.interim}`.trim();
    if (!transcript) {
      toast.error("Nothing was recorded — speak your answer first.");
      return;
    }
    const duration = startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0;
    setScoring(true);
    try {
      const res = await submitAnswer({
        data: {
          id: sessionId,
          questionId: current.id,
          question: current.question,
          round: current.round,
          transcript,
          durationSec: Math.min(3600, Math.round(duration)),
        },
      });
      if (res.ok && res.answer) {
        const scored = res.answer;
        setAnswers((a) => [...a, scored]);
        voice.reset();
        startedAt.current = 0;
        setIdx((i) => i + 1);
        toast.success(res.message);
        await refresh();
      } else toast.error(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not score your answer");
    } finally {
      setScoring(false);
    }
  }

  if (!questions.length)
    return (
      <>
        <SectionCard title="Company & role specific questions">
          <div className="space-y-4 p-6">
            <p className="text-sm text-foreground/80">
              Questions are written from this posting — the company, the product domain and the
              exact technologies listed. Answers are spoken; there is no typing here.
            </p>
            <button
              onClick={generate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {busy ? "Writing questions…" : "Generate my questions"}
            </button>
          </div>
        </SectionCard>
        <NextButton label="Skip to coding challenge" onClick={onNext} />
      </>
    );

  if (!current)
    return <InterviewReport answers={answers} onRegenerate={generate} onNext={onNext} />;

  return (
    <>
      <SectionCard
        title={`${current.round} · question ${idx + 1} of ${questions.length}`}
        action={<SourceLinks question={current.question} context={current.topic} />}
      >
        <div className="p-6">
          <div className="mb-6 h-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
            />
          </div>
          <div className="mb-4 rounded-xl bg-surface p-6">
            <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-accent">
              Interviewer
            </div>
            <div className="font-display text-xl font-bold leading-snug">{current.question}</div>
            {current.why && (
              <div className="mt-2 text-[11px] text-muted-foreground">Testing: {current.why}</div>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface/40 px-6 py-10">
            <button
              onClick={() => {
                if (voice.listening) {
                  voice.stop();
                } else {
                  startedAt.current = Date.now();
                  voice.start();
                }
              }}
              disabled={!voice.supported || scoring}
              aria-pressed={voice.listening}
              aria-label={voice.listening ? "Stop recording" : "Start recording"}
              className={`grid size-16 place-items-center rounded-full transition-transform hover:scale-105 disabled:opacity-40 ${
                voice.listening
                  ? "animate-pulse bg-accent text-accent-foreground ring-8 ring-accent/20"
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {voice.listening ? <Square className="size-5" /> : <Mic className="size-6" />}
            </button>
            <div className="text-xs text-muted-foreground">
              {!voice.supported
                ? "Voice input isn't supported in this browser — try Chrome or Edge."
                : voice.listening
                  ? "Listening — speak your answer"
                  : "Tap to record your answer"}
            </div>
            {(voice.transcript || voice.interim) && (
              <p className="max-h-40 w-full overflow-y-auto rounded-lg bg-card p-4 text-sm leading-relaxed">
                {voice.transcript} <span className="text-muted-foreground">{voice.interim}</span>
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={finishAnswer}
              disabled={scoring}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-50"
            >
              {scoring ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              {scoring
                ? "Scoring…"
                : idx + 1 >= questions.length
                  ? "Finish & score"
                  : "Submit answer"}
            </button>
          </div>
        </div>
      </SectionCard>

      {answers.length > 0 && <AnswerList answers={answers} />}
    </>
  );
}

function AnswerList({ answers }: { answers: TrainingAnswer[] }) {
  return (
    <SectionCard title="Answers so far">
      <div className="divide-y divide-border">
        {answers.map((a) => (
          <div key={a.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-semibold">{a.question}</div>
              <span className="font-mono text-sm font-bold text-accent">{a.score}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{a.feedback}</p>
            <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
              <span>{a.words} words</span>
              <span>{a.durationSec}s</span>
              <span>{a.wpm} wpm</span>
              <span>{a.fillers} fillers</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function InterviewReport({
  answers,
  onRegenerate,
  onNext,
}: {
  answers: TrainingAnswer[];
  onRegenerate: () => void;
  onNext: () => void;
}) {
  const scored = answers.filter((a) => a.score > 0);
  const avg = scored.length
    ? Math.round(scored.reduce((s, a) => s + a.score, 0) / scored.length)
    : 0;
  const totalSec = answers.reduce((s, a) => s + a.durationSec, 0);
  const fillers = answers.reduce((s, a) => s + a.fillers, 0);
  const pace = answers.length ? Math.round(totalSec / answers.length) : 0;
  const strengths = answers.flatMap((a) => a.strengths).slice(0, 6);
  const improvements = answers.flatMap((a) => a.improvements).slice(0, 6);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl bg-foreground p-6 text-background">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-background/60">
            Interview score
          </div>
          <div className="font-display text-6xl font-extrabold">{avg}</div>
          <div className="mt-1 text-xs text-background/70">
            {scored.length} scored answer{scored.length === 1 ? "" : "s"}
          </div>
        </div>
        <SectionCard title="Session stats" className="md:col-span-2">
          <div className="grid gap-3 p-5 text-xs sm:grid-cols-2">
            <Row label="Answered" value={`${answers.length}`} />
            <Row label="Avg answer length" value={`${Math.floor(pace / 60)}m ${pace % 60}s`} />
            <Row label="Filler words" value={`${fillers}`} />
            <Row
              label="Total speaking time"
              value={`${Math.floor(totalSec / 60)}m ${totalSec % 60}s`}
            />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Feedback from your answers">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">
              What worked
            </div>
            <ul className="space-y-1 text-xs text-foreground/80">
              {strengths.length ? (
                strengths.map((t, i) => <li key={i}>· {t}</li>)
              ) : (
                <li className="text-muted-foreground">No strengths recorded yet.</li>
              )}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">
              Where to improve
            </div>
            <ul className="space-y-1 text-xs text-foreground/80">
              {improvements.length ? (
                improvements.map((t, i) => <li key={i}>· {t}</li>)
              ) : (
                <li className="text-muted-foreground">Nothing flagged.</li>
              )}
            </ul>
          </div>
        </div>
      </SectionCard>

      <AnswerList answers={answers} />

      <div className="flex justify-between">
        <button
          onClick={onRegenerate}
          className="rounded-md border border-border px-4 py-2 text-xs font-semibold"
        >
          New question set
        </button>
        <NextButton label="Next: coding challenge" onClick={onNext} />
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}

/* ------------------------------- coding ----------------------------- */

function CodingStep({
  sessionId,
  bundle,
  refresh,
  onNext,
}: {
  sessionId: string;
  bundle: TrainingBundle;
  refresh: () => Promise<void>;
  onNext: () => void;
}) {
  const [challenge, setChallenge] = useState<TrainingChallenge | null>(
    bundle.challenges[bundle.challenges.length - 1] ?? null,
  );
  const [code, setCode] = useState(challenge?.code ?? "");
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);

  async function start(difficulty: "easy" | "medium" | "hard") {
    setBusy(true);
    try {
      const res = await makeChallenge({ data: { id: sessionId, difficulty } });
      if (res.ok && res.challenge) {
        setChallenge(res.challenge);
        setCode(res.challenge.starter);
        setRunning(true);
        toast.success(res.message);
        await refresh();
      } else toast.error(res.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create coding challenge");
    } finally {
      setBusy(false);
    }
  }

  const submit = useCallback(
    async (elapsed: number, timedOut = false) => {
      if (!challenge) return;
      setSubmitting(true);
      setRunning(false);
      try {
        const res = await submitChallenge({
          data: { id: sessionId, challengeId: challenge.id, code, elapsedSec: elapsed, timedOut },
        });
        if (res.ok && res.verdict) {
          setChallenge({ ...challenge, verdict: res.verdict, code });
          if (res.verdict.passed) toast.success(res.message);
          else toast.error(res.message);
          await refresh();
        } else toast.error(res.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not submit challenge");
      } finally {
        setSubmitting(false);
      }
    },
    [challenge, code, sessionId, refresh],
  );

  return (
    <>
      <SectionCard title="Coding challenge">
        <div className="space-y-4 p-6">
          <p className="text-sm text-foreground/80">
            A problem built around this role's stack. Write JavaScript in the canvas; on submit the
            solution runs against hidden-style test cases with a verdict and complexity review.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => start(d)}
                disabled={busy}
                className={`rounded-md border px-4 py-2 text-xs font-semibold capitalize disabled:opacity-50 ${
                  challenge?.difficulty === d
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border hover:border-accent/40"
                }`}
              >
                {busy ? "…" : d}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {challenge && (
        <>
          <SectionCard title={challenge.title}>
            <div className="space-y-3 p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {challenge.prompt}
              </p>
              <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <Terminal className="size-3.5" /> {challenge.signature}
              </div>
            </div>
          </SectionCard>

          <CodeCanvas
            value={code}
            onChange={setCode}
            limitSec={challenge.timeLimitSec}
            running={running}
            submitting={submitting}
            onExpire={(e) => {
              toast.error("Time is up — submitting what you have.");
              void submit(e, true);
            }}
            onSubmit={(e) => void submit(e)}
          />

          {challenge.verdict && (
            <SectionCard title={challenge.verdict.passed ? "Accepted" : "Not accepted yet"}>
              <div className="space-y-3 p-5">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className={challenge.verdict.passed ? "text-accent" : "text-amber-500"}>
                    {challenge.verdict.passedCount}/{challenge.verdict.total} tests passed
                  </span>
                  {challenge.verdict.timedOut && (
                    <span className="text-[11px] text-muted-foreground">
                      (submitted on timeout)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{challenge.verdict.feedback}</p>
                <div className="space-y-1">
                  {challenge.verdict.results.map((r, i) => (
                    <div
                      key={i}
                      className={`rounded-md p-2 font-mono text-[11px] ${
                        r.ok ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {r.ok ? "✓" : "✗"} {JSON.stringify(r.input)} → {JSON.stringify(r.got)}{" "}
                      {!r.ok &&
                        `(expected ${JSON.stringify(r.expected)}${r.error ? `, ${r.error}` : ""})`}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}
        </>
      )}

      <NextButton label="Finish" onClick={onNext} />
    </>
  );
}

/* -------------------------------- ready ----------------------------- */

function ReadyStep({ bundle }: { bundle: TrainingBundle }) {
  const s = bundle.session!;
  const done = Object.values(s.waypoints).filter(
    (w) => w.status === "done" || w.status === "skipped",
  ).length;
  return (
    <SectionCard title="Ready to apply">
      <div className="space-y-4 p-6">
        <div className="font-display text-2xl font-extrabold">{done} of 6 checkpoints complete</div>
        <p className="text-sm text-foreground/80">
          Your resume is tailored to {s.job.company || "this company"}, the cover letter is drafted,
          your portfolio content is filled, and you have real interview and coding scores to work
          from.
        </p>
        <div className="flex flex-wrap gap-2">
          {s.url && (
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
            >
              <ExternalLink className="size-3.5" /> Apply on the company site
            </a>
          )}
          <Link
            to="/candidate/resume"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-xs font-semibold"
          >
            <FileText className="size-3.5" /> Download resume
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}
