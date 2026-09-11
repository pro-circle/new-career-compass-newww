import { useState } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { learnSources } from "@/lib/learn-sources";

/** "Sources" button — opens real search/doc entry points for the question topic. */
export function SourceLinks({ question, context = "" }: { question: string; context?: string }) {
  const [open, setOpen] = useState(false);
  const sources = learnSources(question, context);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:border-accent/40 hover:text-accent"
      >
        <BookOpen className="size-3.5" /> Sources
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          {sources.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-between px-3 py-2 text-xs hover:bg-surface"
            >
              <span>{s.label}</span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
