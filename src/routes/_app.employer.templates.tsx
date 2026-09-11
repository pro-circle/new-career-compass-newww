import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { Mail, Plus, Sparkles, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  type EmailTemplate,
} from "@/lib/templates.functions";

export const Route = createFileRoute("/_app/employer/templates")({
  head: () => ({ meta: [{ title: "Email Templates · ATS Engine" }] }),
  component: TemplatesPage,
});

const BLANK: EmailTemplate = {
  id: "",
  name: "Untitled template",
  category: "General",
  subject: "",
  body: "",
};

function TemplatesPage() {
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [active, setActive] = useState<EmailTemplate>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refresh(selectId?: string) {
    const rows = await listTemplates();
    setItems(rows);
    const next = rows.find((r) => r.id === (selectId ?? active.id)) ?? rows[0] ?? BLANK;
    setActive(next);
  }

  useEffect(() => {
    listTemplates()
      .then((rows) => {
        setItems(rows);
        setActive(rows[0] ?? BLANK);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load templates"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function persist(t: EmailTemplate, message?: string) {
    setSaving(true);
    try {
      const res = await saveTemplate({
        data: {
          ...(t.id ? { id: t.id } : {}),
          name: t.name,
          category: t.category,
          subject: t.subject,
          body: t.body,
        },
      });
      if (!res.ok) return toast.error(res.message);
      toast.success(message ?? res.message);
      await refresh(res.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Recruitment"
        title="Email templates"
        subtitle="Reusable, variable-driven templates stored in your workspace."
        actions={
          <button
            onClick={() => persist({ ...BLANK, name: "Untitled template" })}
            className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
          >
            <Plus className="size-3.5" /> New template
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Library" className="lg:col-span-1">
          {loading ? (
            <p className="p-5 text-xs text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="p-5 text-xs text-muted-foreground">
              No templates yet — create your first one.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActive(t)}
                  className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${
                    active.id === t.id ? "bg-brand/5" : "hover:bg-surface/50"
                  }`}
                >
                  <div className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                    <Mail className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{t.name}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {t.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={active.name || "Template"} className="lg:col-span-2">
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
              <Sparkles className="size-3.5 text-brand" />
              <span>
                Variables like{" "}
                <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[10px]">{`{{firstName}}`}</code>{" "}
                are filled from candidate profiles when you send from the pipeline.
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground/80">Name</span>
                <input
                  value={active.name}
                  onChange={(e) => setActive({ ...active, name: e.target.value })}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-foreground/80">
                  Category
                </span>
                <input
                  value={active.category}
                  onChange={(e) => setActive({ ...active, category: e.target.value })}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground/80">Subject</span>
              <input
                value={active.subject}
                onChange={(e) => setActive({ ...active, subject: e.target.value })}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground/80">Body</span>
              <textarea
                value={active.body}
                onChange={(e) => setActive({ ...active, body: e.target.value })}
                rows={12}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <div className="flex justify-end gap-2">
              {active.id && (
                <button
                  onClick={async () => {
                    const res = await deleteTemplate({ data: { id: active.id } });
                    res.ok ? toast.success(res.message) : toast.error(res.message);
                    await refresh();
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-destructive hover:bg-surface"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              )}
              <button
                onClick={() =>
                  persist({ ...active, id: "", name: `${active.name} (copy)` }, "Template duplicated")
                }
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-surface"
              >
                <Copy className="size-3.5" /> Duplicate
              </button>
              <button
                disabled={saving}
                onClick={() => persist(active)}
                className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
