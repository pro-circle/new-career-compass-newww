import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { useProfile } from "@/hooks/use-profile";
import {
  listProjects,
  saveProject,
  deleteProject,
  draftFromTemplate,
  PORTFOLIO_TEMPLATES,
  type Project,
} from "@/lib/portfolio.functions";
import {
  Plus,
  Image as ImageIcon,
  Github,
  Globe,
  Loader2,
  Trash2,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/candidate/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio · ATS Engine" },
      {
        name: "description",
        content:
          "Build a live portfolio of your best work — templates, AI drafting and shareable project cards.",
      },
      { property: "og:title", content: "Portfolio · ATS Engine" },
      {
        property: "og:description",
        content: "Build a live portfolio of your best work inside ATS Engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

const EMPTY = {
  id: undefined as string | undefined,
  title: "",
  role: "",
  year: String(new Date().getFullYear()),
  tags: "",
  desc: "",
  gradient: "from-brand/60 to-accent/60",
  url: "",
};

function PortfolioPage() {
  const { profile, initials } = useProfile();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch {
      /* not signed in / backend off */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit() {
    if (!form) return;
    if (!form.title.trim()) {
      toast.error("Give the project a title");
      return;
    }
    setSaving(true);
    try {
      const res = await saveProject({
        data: {
          ...(form.id ? { id: form.id } : {}),
          title: form.title.trim(),
          role: form.role,
          year: form.year,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          desc: form.desc,
          gradient: form.gradient,
          url: form.url,
        },
      });
      if (!res.ok) return void toast.error(res.message);
      toast.success(res.message);
      setForm(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save project");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      const res = await deleteProject({ data: { id } });
      res.ok ? toast.success(res.message) : toast.error(res.message);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete project");
    } finally {
      setBusy(null);
    }
  }

  async function draft(templateId: string) {
    setBusy(templateId);
    try {
      const res = await draftFromTemplate({ data: { templateId, title: "" } });
      res.ok ? toast.success(res.message) : toast.error(res.message);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not draft project");
    } finally {
      setBusy(null);
    }
  }

  function edit(p: Project) {
    setForm({
      id: p.id,
      title: p.title,
      role: p.role,
      year: p.year,
      tags: p.tags.join(", "),
      desc: p.desc,
      gradient: p.gradient,
      url: p.url,
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Career suite"
        title="Portfolio"
        subtitle="Showcase your best work. Saved to your account and ready to share."
        actions={
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90"
          >
            <Plus className="size-3.5" /> Add project
          </button>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <SectionCard title="Public profile">
            <div className="p-5 text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-accent/15 text-lg font-bold text-accent">
                {initials}
              </div>
              <div className="mt-3 font-display text-lg font-extrabold">
                {profile?.fullName || "Your name"}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile?.headline || "Add a headline in onboarding"}
              </div>
              <div className="mt-4 flex justify-center gap-2">
                <span className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground">
                  <Globe className="size-3.5" />
                </span>
                <span className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground">
                  <Github className="size-3.5" />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-surface p-2">
                  <div className="font-display text-sm font-extrabold">{projects.length}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    Projects
                  </div>
                </div>
                <div className="rounded-md bg-surface p-2">
                  <div className="font-display text-sm font-extrabold">
                    {new Set(projects.flatMap((p) => p.tags)).size}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    Skills shown
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Templates">
            <div className="space-y-2 p-3">
              {PORTFOLIO_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  disabled={busy === t.id}
                  onClick={() => draft(t.id)}
                  className="w-full rounded-lg border border-border bg-surface/40 p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/5 disabled:opacity-60"
                >
                  <div className="flex items-center justify-between text-sm font-semibold">
                    {t.name}
                    {busy === t.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5 text-accent" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {t.blurb}
                  </p>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Projects"
          action={
            <div className="flex rounded-md border border-border bg-surface p-0.5 text-xs">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded px-3 py-1 font-medium capitalize ${
                    view === v ? "bg-card ring-1 ring-border" : "text-muted-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading your projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold">No projects yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add one manually, or draft it from a template on the left.
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div
                    className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${p.gradient} text-foreground/70`}
                  >
                    <ImageIcon className="size-8 opacity-40" />
                    <span className="absolute right-3 top-3 rounded-full bg-card/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
                      {p.year}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground">{p.role}</div>
                      </div>
                      <RowActions
                        busy={busy === p.id}
                        onEdit={() => edit(p)}
                        onDelete={() => remove(p.id)}
                      />
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs text-foreground/70">{p.desc}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground/70 ring-1 ring-border"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  <div className={`size-12 shrink-0 rounded-lg bg-gradient-to-br ${p.gradient}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{p.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.role} · {p.year}
                    </div>
                  </div>
                  <RowActions
                    busy={busy === p.id}
                    onEdit={() => edit(p)}
                    onDelete={() => remove(p.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold">
                {form.id ? "Edit project" : "Add project"}
              </h2>
              <button
                onClick={() => setForm(null)}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <Input
                label="Title"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Your role"
                  value={form.role}
                  onChange={(v) => setForm({ ...form, role: v })}
                />
                <Input
                  label="Year"
                  value={form.year}
                  onChange={(v) => setForm({ ...form, year: v })}
                />
              </div>
              <Input
                label="Tags (comma separated)"
                value={form.tags}
                onChange={(v) => setForm({ ...form, tags: v })}
              />
              <Input label="Link" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Description
                </span>
                <textarea
                  rows={5}
                  value={form.desc}
                  onChange={(e) => setForm({ ...form, desc: e.target.value })}
                  className="w-full rounded-md border border-border bg-surface p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setForm(null)}
                className="rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />} Save project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowActions({
  busy,
  onEdit,
  onDelete,
}: {
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        onClick={onEdit}
        className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
        title="Edit"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        onClick={onDelete}
        disabled={busy}
        className="rounded-md border border-border p-1.5 text-muted-foreground hover:border-red-500/40 hover:text-red-500 disabled:opacity-60"
        title="Delete"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
      </button>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
