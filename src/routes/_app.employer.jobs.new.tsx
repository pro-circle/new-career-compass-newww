import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { ShareLink, shareUrl } from "@/components/share-link";
import { createJob } from "@/lib/apply.functions";
import { parseJobUrl } from "@/lib/joblink.functions";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Link2, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/employer/jobs/new")({
  head: () => ({
    meta: [
      { title: "Post a Job · ATS Engine" },
      {
        name: "description",
        content:
          "Capture the full role brief — responsibilities, must-have skills, compensation and screening notes — and publish with a shareable application link.",
      },
    ],
  }),
  component: NewJob,
});

const EMPTY = {
  title: "",
  department: "",
  location: "",
  type: "Full-time",
  salary: "",
  experience: "",
  skills: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  screeningNotes: "",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20";

function NewJob() {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [published, setPublished] = useState<{ id: string; title: string } | null>(null);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function composedDescription() {
    return [
      form.responsibilities && `## Responsibilities\n${form.responsibilities}`,
      form.requirements && `## Requirements\n${form.requirements}`,
      form.skills && `## Must-have skills\n${form.skills}`,
      form.experience && `## Experience\n${form.experience}`,
      form.benefits && `## Benefits\n${form.benefits}`,
      form.screeningNotes && `## Screening notes (internal)\n${form.screeningNotes}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  async function publish(status: "Open" | "Draft") {
    if (form.title.trim().length < 2) {
      toast.error("Add a role title first");
      return;
    }
    setSaving(true);
    try {
      const res = await createJob({
        data: {
          title: form.title.trim(),
          department: form.department.trim(),
          location: form.location.trim(),
          type: form.type,
          salary: form.salary.trim(),
          description: composedDescription(),
          status,
        },
      });
      setPublished({ id: res.id, title: form.title.trim() });
      toast.success(status === "Open" ? `${res.id} published` : `${res.id} saved as draft`);
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create requisition");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport() {
    if (!jobUrl.trim()) return;
    setImporting(true);
    try {
      const job = await parseJobUrl({ data: { url: jobUrl.trim() } });
      setForm((f) => ({
        ...f,
        title: job.title || f.title,
        department: job.company || f.department,
        location: job.location || f.location,
        type: job.type || f.type,
        salary: job.salary || f.salary,
        skills: job.tags?.join(", ") || f.skills,
        requirements: job.requirements?.join("\n") || f.requirements,
        responsibilities: job.description || f.responsibilities,
      }));
      toast.success("Posting parsed — review and publish");
      setJobUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse posting");
    } finally {
      setImporting(false);
    }
  }

  if (published) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader eyebrow="Step 1 complete" title="Your role is live" />
        <SectionCard className="max-w-2xl">
          <div className="p-6">
            <div className="text-sm font-semibold">
              {published.title} · {published.id}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Share this link anywhere — LinkedIn, email, your own site. Every application lands
              straight in this pipeline.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ShareLink jobId={published.id} />
              <span className="font-mono text-[10px] text-muted-foreground">
                {shareUrl(published.id)}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/employer/jobs/$jobId"
                params={{ jobId: published.id }}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
              >
                Go to pipeline <ArrowRight className="size-3.5" />
              </Link>
              <button
                onClick={() => {
                  setPublished(null);
                  setForm({ ...EMPTY });
                }}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold"
              >
                Post another role
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Step 1 · Post a job"
        title="Tell us everything about the role"
        subtitle="The richer the brief, the sharper the AI ranking and screening downstream."
        actions={
          <Link
            to="/employer/jobs"
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-surface"
          >
            <ArrowLeft className="size-3.5" /> All jobs
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Role basics">
            <div className="space-y-4 p-5">
              <Field label="Role title">
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Senior Product Designer"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department / company">
                  <input
                    className={inputCls}
                    value={form.department}
                    onChange={(e) => set("department", e.target.value)}
                    placeholder="Design"
                  />
                </Field>
                <Field label="Location">
                  <input
                    className={inputCls}
                    value={form.location}
                    onChange={(e) => set("location", e.target.value)}
                    placeholder="Remote · EU"
                  />
                </Field>
                <Field label="Employment type">
                  <select
                    className={inputCls}
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                  >
                    {["Full-time", "Part-time", "Contract", "Internship"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Compensation">
                  <input
                    className={inputCls}
                    value={form.salary}
                    onChange={(e) => set("salary", e.target.value)}
                    placeholder="$150k – $185k"
                  />
                </Field>
              </div>
              <Field label="Experience expected">
                <input
                  className={inputCls}
                  value={form.experience}
                  onChange={(e) => set("experience", e.target.value)}
                  placeholder="5+ years in product design, 2+ leading a surface area"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="The brief">
            <div className="space-y-4 p-5">
              <Field label="Responsibilities">
                <textarea
                  rows={5}
                  className={inputCls}
                  value={form.responsibilities}
                  onChange={(e) => set("responsibilities", e.target.value)}
                  placeholder="One per line — what this person owns day to day."
                />
              </Field>
              <Field label="Requirements">
                <textarea
                  rows={4}
                  className={inputCls}
                  value={form.requirements}
                  onChange={(e) => set("requirements", e.target.value)}
                  placeholder="One per line — the non-negotiables."
                />
              </Field>
              <Field label="Must-have skills" hint="Comma separated. Used for AI matching.">
                <input
                  className={inputCls}
                  value={form.skills}
                  onChange={(e) => set("skills", e.target.value)}
                  placeholder="Figma, Design Systems, Prototyping"
                />
              </Field>
              <Field label="Benefits & perks">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={form.benefits}
                  onChange={(e) => set("benefits", e.target.value)}
                />
              </Field>
              <Field
                label="Screening notes"
                hint="Internal only — steers how the agent ranks and screens applicants."
              >
                <textarea
                  rows={3}
                  className={inputCls}
                  value={form.screeningNotes}
                  onChange={(e) => set("screeningNotes", e.target.value)}
                  placeholder="Prefer candidates from B2B SaaS; hard pass on <3 years."
                />
              </Field>
            </div>
          </SectionCard>

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => publish("Draft")}
              disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-xs font-semibold disabled:opacity-60"
            >
              Save as draft
            </button>
            <button
              onClick={() => publish("Open")}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Publish & get share link
            </button>
          </div>
        </div>

        <SectionCard title="Start from a link" className="h-fit">
          <div className="p-5">
            <div className="mb-3 flex items-start gap-2 text-xs text-foreground/80">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
              Already have this role posted elsewhere? Paste the URL and the agent fills this form
              for you.
            </div>
            <div className="relative mb-2">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://company.com/careers/…"
                className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              onClick={handleImport}
              disabled={importing || !jobUrl.trim()}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50"
            >
              {importing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {importing ? "Parsing…" : "Parse & prefill"}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
