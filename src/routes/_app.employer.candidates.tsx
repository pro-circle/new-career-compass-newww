import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { Avatar, ScoreBar, SectionCard, StatusPill } from "@/components/dashboard/primitives";
import type { Candidate } from "@/lib/types";
import { useDataset } from "@/hooks/use-dataset";
import { Filter, X, Check, ExternalLink, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/employer/candidates")({
  head: () => ({ meta: [{ title: "Candidates · ATS Engine" }] }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const { candidates } = useDataset();
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Candidate | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => c.skills.forEach((s) => set.add(s)));
    return [...set];
  }, []);

  const filtered = candidates
    .filter((c) => c.matchScore >= minScore)
    .filter((c) => !skillFilter || c.skills.includes(skillFilter))
    .sort((a, b) => b.matchScore - a.matchScore);

  const compareList = candidates.filter((c) => selected.includes(c.id));

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Talent pool"
        title="AI-ranked candidates"
        subtitle="Filter, rank, and compare. Select up to 3 for side-by-side."
        actions={
          selected.length >= 2 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
            >
              Compare {selected.length} candidates
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs">
          <Filter className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Min match</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="accent-brand"
          />
          <span className="font-mono font-bold text-brand">{minScore}%</span>
        </div>
        <select
          value={skillFilter ?? ""}
          onChange={(e) => setSkillFilter(e.target.value || null)}
          className="rounded-md border border-border bg-card px-3 py-2 text-xs font-medium"
        >
          <option value="">All skills</option>
          {allSkills.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {(minScore > 0 || skillFilter) && (
          <button
            onClick={() => {
              setMinScore(0);
              setSkillFilter(null);
            }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {candidates.length} candidates
        </div>
      </div>

      <SectionCard>
        <div className="divide-y divide-border">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-surface/40"
            >
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="size-4 accent-brand"
              />
              <Avatar initials={c.initials} />
              <button onClick={() => setDetail(c)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <StatusPill status={c.status} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {c.title} · {c.company} · {c.location} · {c.years}y
                </div>
              </button>
              <div className="hidden gap-1.5 md:flex">
                {c.skills.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded bg-surface px-2 py-0.5 text-[10px] font-medium ring-1 ring-border"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <ScoreBar
                score={c.matchScore}
                tone={c.matchScore >= 95 ? "accent" : c.matchScore >= 80 ? "brand" : "amber"}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Candidate detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-y-auto bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar initials={detail.initials} size="lg" />
                <div>
                  <div className="font-display text-lg font-bold">{detail.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {detail.title} · {detail.company}
                  </div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-surface p-4">
              <div
                className={`grid size-14 place-items-center rounded-xl font-mono text-lg font-bold ${detail.matchScore >= 95 ? "bg-accent text-accent-foreground" : "bg-brand text-brand-foreground"}`}
              >
                {detail.matchScore}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Neural match
                </div>
                <div className="text-sm font-semibold">
                  {detail.matchScore >= 95
                    ? "Elite fit"
                    : detail.matchScore >= 80
                      ? "Strong fit"
                      : "Fair fit"}
                </div>
              </div>
              <StatusPill status={detail.status} />
            </div>

            <div className="space-y-5 text-sm">
              <div>
                <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand">
                  <Sparkles className="size-3" /> AI insight
                </div>
                <p className="text-foreground/80">{detail.aiInsight}</p>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Skills
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detail.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-surface px-2 py-1 text-[11px] font-medium ring-1 ring-border"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-accent">
                    Strengths
                  </div>
                  <ul className="space-y-1 text-xs text-foreground/80">
                    {detail.strengths.map((s) => (
                      <li key={s} className="flex gap-2">
                        <Check className="size-3 shrink-0 text-accent" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    Potential gaps
                  </div>
                  <ul className="space-y-1 text-xs text-foreground/80">
                    {detail.gaps.map((g) => (
                      <li key={g}>· {g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Portfolio & links
                </div>
                <div className="space-y-1">
                  {detail.portfolio.map((p) => (
                    <a
                      key={p.label}
                      href={p.url}
                      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium hover:bg-card"
                    >
                      <ExternalLink className="size-3" /> {p.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button className="flex-1 rounded-md bg-brand py-2 text-xs font-semibold text-brand-foreground">
                  Advance to interview
                </button>
                <button className="rounded-md border border-border px-3 py-2 text-xs font-semibold">
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compare drawer */}
      {compareOpen && compareList.length >= 2 && (
        <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-y-auto bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand">
                  Compare
                </div>
                <h2 className="font-display text-2xl font-bold">
                  Side-by-side ({compareList.length})
                </h2>
              </div>
              <button onClick={() => setCompareOpen(false)} className="text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div
              className={`grid gap-4 ${compareList.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
            >
              {compareList.map((c) => (
                <div key={c.id} className="rounded-xl border border-border bg-surface/40 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar initials={c.initials} />
                    <div className="min-w-0">
                      <div className="truncate font-bold">{c.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{c.company}</div>
                    </div>
                  </div>
                  <div
                    className={`mb-4 grid size-16 place-items-center rounded-xl font-mono text-lg font-bold ${c.matchScore >= 95 ? "bg-accent text-accent-foreground" : "bg-brand text-brand-foreground"}`}
                  >
                    {c.matchScore}
                  </div>
                  <div className="space-y-3 text-xs">
                    <Row label="Years">{c.years}y</Row>
                    <Row label="Status">
                      <StatusPill status={c.status} />
                    </Row>
                    <Row label="Skills">
                      <div className="flex flex-wrap gap-1">
                        {c.skills.slice(0, 4).map((s) => (
                          <span
                            key={s}
                            className="rounded bg-card px-1.5 py-0.5 text-[10px] ring-1 ring-border"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </Row>
                    <Row label="Strengths">
                      <ul className="space-y-0.5">
                        {c.strengths.slice(0, 2).map((s) => (
                          <li key={s} className="text-foreground/80">
                            · {s}
                          </li>
                        ))}
                      </ul>
                    </Row>
                    <Row label="Gaps">
                      <ul className="space-y-0.5">
                        {c.gaps.slice(0, 2).map((g) => (
                          <li key={g} className="text-foreground/80">
                            · {g}
                          </li>
                        ))}
                      </ul>
                    </Row>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-foreground p-5 text-background">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-background/60">
                AI hiring recommendation
              </div>
              <p className="text-sm">
                <strong className="text-accent">{compareList[0]?.name}</strong> ranks highest on
                match score and shows the strongest signal for design-systems leadership. We
                recommend advancing them to a final panel first.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
