import { useEffect, useMemo, useRef, useState } from "react";
import { Play, TimerReset } from "lucide-react";

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** A plain, dependency-free code editor with line numbers and a countdown. */
export function CodeCanvas({
  value,
  onChange,
  limitSec,
  running,
  onExpire,
  onSubmit,
  submitting,
}: {
  value: string;
  onChange: (v: string) => void;
  limitSec: number;
  running: boolean;
  onExpire: (elapsed: number) => void;
  onSubmit: (elapsed: number) => void;
  submitting: boolean;
}) {
  const [left, setLeft] = useState(limitSec);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const expiredRef = useRef(false);

  useEffect(() => {
    setLeft(limitSec);
    expiredRef.current = false;
  }, [limitSec]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          onExpire(limitSec);
          return 0;
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, limitSec, onExpire]);

  const lines = useMemo(() => value.split("\n").length, [value]);
  const danger = left <= 60;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
          <span className="size-2 rounded-full bg-accent" /> JavaScript
        </div>
        <div
          className={`flex items-center gap-1.5 font-mono text-sm font-bold ${
            danger ? "animate-pulse text-red-400" : "text-white/80"
          }`}
        >
          <TimerReset className="size-3.5" /> {fmt(left)}
        </div>
      </div>
      <div className="flex max-h-[420px] overflow-auto">
        <div
          ref={gutterRef}
          className="select-none border-r border-white/10 px-3 py-3 text-right font-mono text-xs leading-6 text-white/25"
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={areaRef}
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const el = e.currentTarget;
              const start = el.selectionStart;
              onChange(`${value.slice(0, start)}  ${value.slice(el.selectionEnd)}`);
              requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
            }
          }}
          rows={Math.max(14, lines + 2)}
          className="w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-6 text-white/90 outline-none"
          aria-label="Code editor"
        />
      </div>
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5">
        <span className="text-[11px] text-white/40">
          Keep the given function name — it is called by the tests.
        </span>
        <button
          onClick={() => onSubmit(limitSec - left)}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
        >
          <Play className="size-3.5" /> {submitting ? "Running tests…" : "Run & submit"}
        </button>
      </div>
    </div>
  );
}
