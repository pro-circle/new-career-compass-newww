import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/routes/_app";
import { Avatar, ScoreBar, SectionCard } from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";
import { Search, Tag, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { contactCandidates } from "@/lib/recruiter.functions";

export const Route = createFileRoute("/_app/employer/talent-pool")({
  head: () => ({ meta: [{ title: "Talent Pool · ATS Engine" }] }),
  component: TalentPoolPage,
});

function TalentPoolPage() {
  const { candidates, talentPools: pools } = useDataset();
  const [pool, setPool] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function contact(ids: string[], subject: string, body: string, label: string) {
    if (ids.length === 0) {
      toast.error("Select at least one candidate first");
      return;
    }
    setBusy(label);
    try {
      const res = await contactCandidates({
        data: { candidateIds: ids, channel: "email", subject, body },
      });
      res.ok ? toast.success(res.message) : toast.error(res.message);
      if (res.ok) setSelected([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach those candidates");
    } finally {
      setBusy(null);
    }
  }

  const filtered = candidates.filter((c) =>
    (c.name + c.title + c.company + c.skills.join(" ")).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Sourcing"
        title="Talent pool"
        subtitle="Nurture silver medalists, referrals, and past applicants for future roles."
        actions={
          <button
            disabled={busy === "campaign"}
            onClick={() =>
              contact(
                selected.length > 0 ? selected : filtered.map((c) => c.id),
                "We are hiring — roles that match your profile",
                "Hi, we kept your profile in our talent pool and have new roles open that line up with your experience. Reply if you would like an intro call.",
                "campaign",
              )
            }
            className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy === "campaign" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}{" "}
            Launch campaign
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <SectionCard title="Pools">
          <div className="p-2">
            {pools.map((p) => (
              <button
                key={p.id}
                onClick={() => setPool(p.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pool === p.id ? "bg-brand/10 text-brand" : "text-foreground/70 hover:bg-surface"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Tag className="size-3.5" />
                  {p.label}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{p.count}</span>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title={pools.find((p) => p.id === pool)?.label}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-56 rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          }
        >
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-surface/30"
              >
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <Avatar initials={c.initials} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.title} · {c.company} · {c.years}y
                  </div>
                </div>
                <div className="hidden gap-1.5 md:flex">
                  {c.skills.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded bg-surface px-2 py-0.5 text-[10px] font-medium text-foreground/70 ring-1 ring-border"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <ScoreBar score={c.matchScore} />
                <button
                  disabled={busy === c.id}
                  onClick={() =>
                    contact(
                      [c.id],
                      "A role we think fits you",
                      `Hi ${c.name.split(" ")[0]}, we came across your profile and would love to talk about an opening that matches your background.`,
                      c.id,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-surface disabled:opacity-60"
                >
                  {busy === c.id && <Loader2 className="size-3 animate-spin" />} Message
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
