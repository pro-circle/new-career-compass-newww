import { Check, Circle, Loader2, MinusCircle } from "lucide-react";
import { WAYPOINTS, type WaypointState } from "@/lib/training.types";

export function WaypointRail({
  waypoints,
  active,
  onJump,
}: {
  waypoints: Record<string, WaypointState>;
  active: string;
  onJump: (id: string) => void;
}) {
  const tracked = WAYPOINTS.filter((w) => w.id !== "ready");
  const completed = tracked.filter(
    (w) => waypoints[w.id]?.status === "done" || waypoints[w.id]?.status === "skipped",
  ).length;
  const pct = Math.round((completed / tracked.length) * 100);

  return (
    <div className="sticky top-20 rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-surface/50 px-5 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Waypoints
          </h3>
          <span className="font-mono text-xs font-bold text-accent">{pct}%</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-accent transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <ol className="p-2">
        {WAYPOINTS.map((w, i) => {
          const state = waypoints[w.id]?.status ?? "todo";
          const score = waypoints[w.id]?.score;
          const on = active === w.id;
          return (
            <li key={w.id}>
              <button
                onClick={() => onJump(w.id)}
                className={`flex w-full gap-3 rounded-lg p-2.5 text-left transition-colors ${
                  on ? "bg-accent/10" : "hover:bg-surface"
                }`}
              >
                <span className="relative flex flex-col items-center">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      state === "done"
                        ? "bg-accent text-accent-foreground"
                        : state === "active"
                          ? "bg-accent/20 text-accent"
                          : state === "skipped"
                            ? "bg-surface text-muted-foreground"
                            : "bg-surface text-muted-foreground ring-1 ring-border"
                    }`}
                  >
                    {state === "done" ? (
                      <Check className="size-3.5" />
                    ) : state === "active" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : state === "skipped" ? (
                      <MinusCircle className="size-3.5" />
                    ) : (
                      <Circle className="size-2.5" />
                    )}
                  </span>
                  {i < WAYPOINTS.length - 1 && (
                    <span
                      className={`mt-1 w-px flex-1 ${state === "done" ? "bg-accent/50" : "bg-border"}`}
                    />
                  )}
                </span>
                <span className="min-w-0 pb-2">
                  <span className={`block text-xs font-semibold ${on ? "text-accent" : ""}`}>
                    {w.label}
                    {typeof score === "number" && (
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                        {score}
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {w.blurb}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
