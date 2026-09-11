import { Link } from "@tanstack/react-router";
import type { Candidate } from "@/lib/types";

export function ScoreBar({
  score,
  tone = "brand",
}: {
  score: number;
  tone?: "brand" | "accent" | "amber";
}) {
  const color = tone === "accent" ? "bg-accent" : tone === "amber" ? "bg-amber-500" : "bg-brand";
  const text =
    tone === "accent" ? "text-accent" : tone === "amber" ? "text-amber-500" : "text-brand";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-bold ${text}`}>{score}%</span>
    </div>
  );
}

export function Avatar({
  initials,
  tone = "brand",
  size = "md",
}: {
  initials: string;
  tone?: "brand" | "accent";
  size?: "sm" | "md" | "lg";
}) {
  const s =
    size === "sm" ? "size-8 text-[10px]" : size === "lg" ? "size-12 text-sm" : "size-10 text-xs";
  const bg = tone === "accent" ? "bg-accent/15 text-accent" : "bg-brand/15 text-brand";
  return (
    <div className={`grid ${s} shrink-0 place-items-center rounded-full font-bold ${bg}`}>
      {initials}
    </div>
  );
}

export function StatusPill({ status }: { status: Candidate["status"] }) {
  const map: Record<Candidate["status"], string> = {
    New: "bg-surface text-foreground/70 ring-border",
    Screening: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950",
    Interviewing: "bg-brand/10 text-brand ring-brand/20",
    "Final Round": "bg-accent/10 text-accent ring-accent/20",
    Offer: "bg-amber-50 text-amber-700 ring-amber-200",
    Rejected: "bg-red-50 text-red-600 ring-red-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${map[status]}`}
    >
      {status}
    </span>
  );
}

export function StatTile({
  label,
  value,
  delta,
  positive,
}: {
  label: string;
  value: string;
  delta?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold">{value}</div>
      {delta && (
        <div
          className={`mt-1 text-xs font-medium ${positive ? "text-accent" : "text-destructive"}`}
        >
          {delta} vs last month
        </div>
      )}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-surface/50 px-5 py-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-xs font-medium text-brand hover:underline">
      {children}
    </Link>
  );
}
