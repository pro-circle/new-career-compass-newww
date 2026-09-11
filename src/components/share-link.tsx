import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ensureShareLink } from "@/lib/share.functions";

/** Short label shown on the button. */
export function shareAlias(jobId: string) {
  return `/share/${jobId}`;
}

/** The real, working shareable link for a job. */
export function shareUrl(slugOrId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/share/${slugOrId}`;
}

export function ShareLink({ jobId, compact = false }: { jobId: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slug, setSlug] = useState(jobId);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setBusy(true);
    try {
      const res = await ensureShareLink({ data: { jobId } });
      const target = res.share?.slug ?? jobId;
      setSlug(target);
      await navigator.clipboard?.writeText(shareUrl(target));
      setCopied(true);
      toast.success(res.ok ? "Shareable link copied" : res.message);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create share link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={copy}
      disabled={busy}
      title={`Copy ${shareUrl(slug)}`}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-surface font-mono text-[10px] text-foreground/80 hover:border-brand/40 hover:text-foreground disabled:opacity-60 ${
        compact ? "px-2 py-1" : "px-3 py-1.5 text-xs"
      }`}
    >
      {busy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : copied ? (
        <Check className="size-3 text-accent" />
      ) : (
        <Copy className="size-3" />
      )}
      {shareAlias(jobId)}
    </button>
  );
}
