import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";
import { Sparkles, Save, Send, Award } from "lucide-react";
import { toast } from "sonner";
import { listOffers, saveOffer, sendOffer, setOfferStatus, type Offer } from "@/lib/offers.functions";

export const Route = createFileRoute("/_app/employer/offers")({
  head: () => ({ meta: [{ title: "Offer Letters · ATS Engine" }] }),
  component: OffersPage,
});

const statusTone: Record<string, string> = {
  Signed: "bg-accent/10 text-accent ring-accent/20",
  Sent: "bg-brand/10 text-brand ring-brand/20",
  Drafted: "bg-surface text-foreground/70 ring-border",
  Declined: "bg-red-50 text-red-600 ring-red-200",
};

function OffersPage() {
  const { candidates } = useDataset();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [busy, setBusy] = useState<"" | "save" | "send">("");
  const [form, setForm] = useState({
    candidateId: "",
    candidate: "",
    email: "",
    role: "",
    salary: "",
    equity: "",
    start: "",
  });

  async function refresh() {
    try {
      setOffers(await listOffers());
    } catch {
      /* not signed in yet */
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  const body = useMemo(
    () =>
      `Dear ${form.candidate || "candidate"},\n\nWe are thrilled to extend an offer for the position of ${form.role || "the role"} at ATS Engine. Based on your interviews and portfolio, our team is unanimously excited to have you join us.\n\n· Base salary: $${form.salary ? Number(form.salary).toLocaleString() : "—"}\n· Equity: ${form.equity || "—"}% (4-year vest, 1-year cliff)\n· Start date: ${form.start || "—"}\n· PTO: Unlimited, with a 3-week minimum\n· Health, dental, vision covered 100% (dependents 80%)\n\nThis offer is open for 7 days. Reply here to accept or discuss.\n\nWarmly,\nThe Talent team\nATS Engine`,
    [form],
  );

  const payload = {
    candidateId: form.candidateId,
    candidateName: form.candidate,
    candidateEmail: form.email,
    role: form.role,
    salary: form.salary,
    equity: form.equity,
    startDate: form.start,
    body,
  };

  async function persist(kind: "save" | "send") {
    if (!form.candidate.trim()) return toast.error("Choose or type a candidate name");
    if (kind === "send" && !form.email.trim() && !form.candidateId)
      return toast.error("Add the candidate's email address");
    setBusy(kind);
    try {
      const res = kind === "save" ? await saveOffer({ data: payload }) : await sendOffer({ data: payload });
      res.ok ? toast.success(res.message) : toast.error(res.message);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Recruitment"
        title="Offer letters"
        subtitle="Generate, review, and dispatch offers with AI-assisted market benchmarks."
        actions={
          <button
            disabled={busy !== ""}
            onClick={() => persist("send")}
            className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Send className="size-3.5" /> {busy === "send" ? "Sending…" : "Send offer"}
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <SectionCard title="Offer builder" className="lg:col-span-3">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-foreground/80">
                Candidate
              </span>
              <select
                value={form.candidateId}
                onChange={(e) => {
                  const c = candidates.find((x) => x.id === e.target.value);
                  setForm({
                    ...form,
                    candidateId: e.target.value,
                    candidate: c?.name ?? form.candidate,
                    email: c?.email ?? form.email,
                    role: c?.appliedFor ?? form.role,
                  });
                }}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Type manually…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.appliedFor}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Candidate name"
              value={form.candidate}
              onChange={(v) => setForm({ ...form, candidate: v })}
            />
            <Field
              label="Candidate email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} />
            <Field
              label="Base salary (USD)"
              value={form.salary}
              onChange={(v) => setForm({ ...form, salary: v })}
            />
            <Field
              label="Equity (%)"
              value={form.equity}
              onChange={(v) => setForm({ ...form, equity: v })}
            />
            <Field
              label="Start date"
              type="date"
              value={form.start}
              onChange={(v) => setForm({ ...form, start: v })}
            />
          </div>

          <div className="border-t border-border bg-surface/40 px-5 py-3">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="size-3.5 text-brand" />
              <span>
                AI benchmark:{" "}
                <strong>${form.salary ? Number(form.salary).toLocaleString() : "—"}</strong> is at
                the <strong className="text-accent">72nd percentile</strong> for{" "}
                {form.role || "this role"} in SF / remote.
              </span>
            </div>
          </div>

          <div className="p-5">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Preview
            </div>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-card p-5 font-sans text-xs leading-relaxed text-foreground/80">
              {body}
            </pre>
            <div className="mt-4 flex gap-2">
              <button
                disabled={busy !== ""}
                onClick={() => persist("save")}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-surface disabled:opacity-60"
              >
                <Save className="size-3.5" /> {busy === "save" ? "Saving…" : "Save draft"}
              </button>
              <button
                disabled={busy !== ""}
                onClick={() => persist("send")}
                className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-60"
              >
                {busy === "send" ? "Sending…" : "Email offer to candidate"}
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Recent offers" className="lg:col-span-2">
          {offers.length === 0 ? (
            <p className="p-6 text-xs text-muted-foreground">
              No offers yet. Build one on the left — drafts and sent offers appear here.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {offers.map((o) => (
                <div key={o.id} className="flex items-start gap-3 p-4">
                  <div className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                    <Award className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{o.candidateName}</div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ring-1 ${statusTone[o.status] ?? statusTone.Drafted}`}
                      >
                        {o.status}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">{o.role}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-foreground/70">
                      <span className="font-mono">{o.salary || "—"}</span> ·{" "}
                      <span className="font-mono">{o.equity || "—"}</span> ·{" "}
                      <span>{o.startDate || "—"}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {["Signed", "Declined"].map((s) => (
                        <button
                          key={s}
                          onClick={async () => {
                            const res = await setOfferStatus({ data: { id: o.id, status: s } });
                            res.ok ? toast.success(res.message) : toast.error(res.message);
                            await refresh();
                          }}
                          className="rounded border border-border px-2 py-0.5 text-[10px] font-semibold hover:bg-surface"
                        >
                          Mark {s.toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
