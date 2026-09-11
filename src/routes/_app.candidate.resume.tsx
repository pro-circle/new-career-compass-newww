import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { UploadCloud, FileText, Wand2, Languages, Sparkles, Check, Save, Download } from "lucide-react";
import { toast } from "sonner";
import {
  getResume,
  saveResume,
  importResumeText,
  optimizeResume,
  translateResume,
  EMPTY_CONTENT,
  type ResumeContent,
  type ResumeRecord,
} from "@/lib/resume.functions";
import { downloadResumeDocx, downloadResumePdf } from "@/lib/resume-export";

type Tab = "upload" | "builder" | "optimizer" | "translator";

export const Route = createFileRoute("/_app/candidate/resume")({
  head: () => ({ meta: [{ title: "Resume Studio · ATS Engine" }] }),
  component: ResumeStudio,
});

function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ResumeStudio() {
  const [tab, setTab] = useState<Tab>("builder");
  const [record, setRecord] = useState<ResumeRecord | null>(null);
  const [content, setContent] = useState<ResumeContent>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function exportResume(format: "docx" | "pdf") {
    setBusy(`download-${format}`);
    try {
      if (format === "docx") await downloadResumeDocx(content);
      else await downloadResumePdf(content);
      toast.success(`${format === "docx" ? "Editable Word" : "PDF"} resume downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Resume download failed");
    } finally {
      setBusy("");
    }
  }

  function adopt(r: ResumeRecord | null | undefined) {
    if (!r) return;
    setRecord(r);
    setContent(r.content ?? EMPTY_CONTENT);
  }

  useEffect(() => {
    let cancelled = false;
    getResume()
      .then((r) => !cancelled && adopt(r))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "upload", label: "Upload", icon: UploadCloud },
    { id: "builder", label: "Builder", icon: FileText },
    { id: "optimizer", label: "Optimizer", icon: Wand2 },
    { id: "translator", label: "Translator", icon: Languages },
  ];

  const score = record?.atsScore ?? 0;
  const insights = record?.insights ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Resume studio"
        title="Perfect your resume"
        subtitle="Upload, build, optimize, and translate — all saved to your account."
      />

      <div className="mb-6 inline-flex rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <UploadTab
          busy={busy === "import"}
          onImport={async (text, fileName) => {
            setBusy("import");
            try {
              const res = await importResumeText({ data: { text, fileName } });
              res.ok ? toast.success(res.message) : toast.error(res.message);
              if (res.ok) {
                adopt(res.resume);
                setTab("builder");
              }
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Import failed");
            } finally {
              setBusy("");
            }
          }}
        />
      )}

      {tab === "builder" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Details">
            <div className="space-y-3 p-5">
              <Text
                label="Full name"
                value={content.fullName}
                onChange={(v) => setContent({ ...content, fullName: v })}
              />
              <Text
                label="Headline"
                value={content.headline}
                onChange={(v) => setContent({ ...content, headline: v })}
              />
              <Text
                label="Location"
                value={content.location}
                onChange={(v) => setContent({ ...content, location: v })}
              />
              <Text
                label="Email"
                value={content.email}
                onChange={(v) => setContent({ ...content, email: v })}
              />
              <Text
                label="Summary"
                area
                value={content.summary}
                onChange={(v) => setContent({ ...content, summary: v })}
              />
              <Text
                label="Experience (one role per line: Title @ Company | Dates | bullet; bullet)"
                area
                value={content.experience
                  .map(
                    (e) =>
                      `${e.title} @ ${e.company} | ${e.dates} | ${(e.bullets ?? []).join("; ")}`,
                  )
                  .join("\n")}
                onChange={(v) =>
                  setContent({
                    ...content,
                    experience: v
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line) => {
                        const [head = "", dates = "", bullets = ""] = line.split("|");
                        const [title = "", company = ""] = head.split("@");
                        return {
                          title: title.trim(),
                          company: company.trim(),
                          dates: dates.trim(),
                          bullets: bullets
                            .split(";")
                            .map((b) => b.trim())
                            .filter(Boolean),
                        };
                      }),
                  })
                }
              />
              <Text
                label="Education (one per line: School | Degree | Dates)"
                area
                value={content.education.map((e) => `${e.school} | ${e.degree} | ${e.dates}`).join("\n")}
                onChange={(v) =>
                  setContent({
                    ...content,
                    education: v
                      .split("\n")
                      .filter((l) => l.trim())
                      .map((line) => {
                        const [school = "", degree = "", dates = ""] = line.split("|");
                        return { school: school.trim(), degree: degree.trim(), dates: dates.trim() };
                      }),
                  })
                }
              />
              <Text
                label="Skills (comma separated)"
                value={content.skills.join(", ")}
                onChange={(v) =>
                  setContent({
                    ...content,
                    skills: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <button
                disabled={loading || busy !== ""}
                onClick={async () => {
                  setBusy("save");
                  try {
                    const res = await saveResume({
                      data: { title: record?.title ?? "My resume", content },
                    });
                    res.ok ? toast.success(res.message) : toast.error(res.message);
                    if (res.ok) adopt(await getResume());
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not save");
                  } finally {
                    setBusy("");
                  }
                }}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
              >
                <Save className="size-4" /> {busy === "save" ? "Saving…" : "Save ATS-ready resume"}
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Live preview"
            action={
              <div className="flex items-center gap-1.5">
                <span className="mr-1 rounded bg-surface px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  ATS {score || "—"}
                </span>
                <button
                  disabled={busy !== ""}
                  onClick={() => void exportResume("docx")}
                  title="Download an editable Microsoft Word document"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
                >
                  <Download className="size-3.5" /> {busy === "download-docx" ? "Preparing…" : "Word"}
                </button>
                <button
                  disabled={busy !== ""}
                  onClick={() => void exportResume("pdf")}
                  title="Download a print-ready PDF"
                  className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-60"
                >
                  <Download className="size-3.5" /> {busy === "download-pdf" ? "Preparing…" : "PDF"}
                </button>
              </div>
            }
          >
            <div className="space-y-4 p-8 font-sans text-sm">
              <div>
                <div className="font-display text-2xl font-extrabold">
                  {content.fullName || "Your name"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[content.headline, content.location, content.email].filter(Boolean).join(" · ") ||
                    "Add your headline and location"}
                </div>
              </div>
              {content.summary && (
                <Block title="Summary">
                  <p className="mt-1 text-xs text-foreground/80">{content.summary}</p>
                </Block>
              )}
              {!!content.experience.length && (
                <Block title="Experience">
                  <div className="mt-2 space-y-2">
                    {content.experience.map((e, i) => (
                      <div key={i}>
                        <div className="text-xs font-semibold">
                          {[e.title, e.company].filter(Boolean).join(" · ")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{e.dates}</div>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-foreground/80">
                          {(e.bullets ?? []).map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Block>
              )}
              {!!content.education.length && (
                <Block title="Education">
                  <div className="mt-2 space-y-1">
                    {content.education.map((e, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-semibold">{e.school}</span> · {e.degree}{" "}
                        <span className="text-muted-foreground">{e.dates}</span>
                      </div>
                    ))}
                  </div>
                </Block>
              )}
              {!!content.skills.length && (
                <Block title="Skills">
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {content.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground/80"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </Block>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "optimizer" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="ATS Score" className="lg:col-span-1">
            <div className="p-6 text-center">
              <div className="relative mx-auto grid size-36 place-items-center">
                <svg className="absolute inset-0" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" stroke="var(--surface)" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="var(--accent)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 264} 264`}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div>
                  <div className="font-display text-4xl font-extrabold">{score}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    / 100
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm font-semibold">
                {score >= 90 ? "Elite" : score >= 80 ? "Strong" : score > 0 ? "Needs work" : "Not scored"}
              </div>
              <button
                disabled={busy !== ""}
                onClick={async () => {
                  setBusy("optimize");
                  try {
                    const res = await optimizeResume({ data: { apply: true } });
                    res.ok ? toast.success(res.message) : toast.error(res.message);
                    if (res.ok) adopt(res.resume);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Optimization failed");
                  } finally {
                    setBusy("");
                  }
                }}
                className="mt-5 w-full rounded-md bg-accent py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
              >
                {busy === "optimize" ? "Optimizing…" : "Auto-optimize with AI"}
              </button>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Rewrites your saved resume in place and stores the new score.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="AI recommendations" className="lg:col-span-2">
            {insights.length === 0 ? (
              <p className="p-6 text-xs text-muted-foreground">
                No analysis yet. Run auto-optimize to score your resume and get concrete fixes.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {insights.map((r, i) => (
                  <div key={i} className="flex gap-3 p-4">
                    <div
                      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${r.done ? "bg-accent text-accent-foreground" : "bg-surface text-muted-foreground ring-1 ring-border"}`}
                    >
                      {r.done ? <Check className="size-3" /> : <Sparkles className="size-3" />}
                    </div>
                    <div>
                      <div
                        className={`text-sm font-semibold ${r.done ? "line-through decoration-accent/50" : ""}`}
                      >
                        {r.title}
                      </div>
                      <div className="text-xs text-muted-foreground">{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {tab === "translator" && <TranslatorTab />}
    </div>
  );
}

function UploadTab({
  onImport,
  busy,
}: {
  onImport: (text: string, fileName: string) => void;
  busy: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  return (
    <SectionCard title="Import your resume">
      <div className="space-y-5 p-6">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.json,.csv,text/plain"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const raw = await file.text();
            setText(raw);
            onImport(raw, file.name);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-10 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-surface">
            <UploadCloud className="size-7 text-brand" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">Upload a text resume</div>
            <div className="text-xs text-muted-foreground">
              TXT / MD up to 10 MB — parsed into editable fields. For PDF or DOCX, copy the text and
              paste it below.
            </div>
          </div>
          <button
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
          >
            Browse files
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Or paste your resume text
          </label>
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full text of your resume…"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            disabled={busy || text.trim().length < 20}
            onClick={() => onImport(text, "pasted.txt")}
            className="mt-3 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Parsing…" : "Parse and save"}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function TranslatorTab() {
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState<{ language: string; text: string } | null>(null);

  return (
    <div className="space-y-6">
      <SectionCard title="Translate resume">
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          {["Spanish", "French", "German", "Portuguese", "Japanese", "Mandarin"].map((lang) => (
            <button
              key={lang}
              disabled={busy !== ""}
              onClick={async () => {
                setBusy(lang);
                try {
                  const res = await translateResume({ data: { language: lang } });
                  res.ok ? toast.success(res.message) : toast.error(res.message);
                  if (res.ok && res.text) setOut({ language: lang, text: res.text });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Translation failed");
                } finally {
                  setBusy("");
                }
              }}
              className="rounded-lg border border-border bg-surface p-4 text-left hover:border-accent/40 disabled:opacity-60"
            >
              <div className="mb-1 text-sm font-semibold">
                {lang} {busy === lang && "…"}
              </div>
              <div className="text-xs text-muted-foreground">
                Preserves formatting · ATS-safe output
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {out && (
        <SectionCard
          title={`Translated · ${out.language}`}
          action={
            <button
              onClick={() => downloadText(`resume-${out.language.toLowerCase()}.txt`, out.text)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              <Download className="size-3.5" /> Download
            </button>
          }
        >
          <pre className="whitespace-pre-wrap p-6 font-sans text-xs leading-relaxed text-foreground/80">
            {out.text}
          </pre>
        </SectionCard>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {area ? (
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20"
        />
      )}
    </div>
  );
}
