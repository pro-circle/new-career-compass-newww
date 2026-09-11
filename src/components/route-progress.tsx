import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

/**
 * Smooth page-transition feedback.
 *
 * A slim gradient bar eases across the top while the router resolves the
 * next route, plus a soft veil over the page so content swaps never snap.
 * A centered spinner confirms something is happening during longer waits.
 */
export function RouteProgress() {
  const isLoading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 320);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100]">
      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-transparent">
        <div
          className={`h-full bg-gradient-to-r from-brand via-accent to-brand transition-[width,opacity] duration-500 ease-out ${
            isLoading ? "w-[85%] opacity-100" : "w-full opacity-0"
          }`}
        />
      </div>
      <div
        className={`absolute inset-0 bg-background/35 backdrop-blur-[1px] transition-opacity duration-300 ${
          isLoading ? "opacity-100" : "opacity-0"
        }`}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`flex items-center justify-center rounded-2xl border border-border bg-card/95 p-5 shadow-2xl transition-all duration-300 ${
            isLoading ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      </div>
    </div>
  );
}

/** Fades and lifts children in — used to soften section/page swaps. */
export function FadeIn({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`animate-in fade-in slide-in-from-bottom-2 duration-300 ${className}`}>
      {children}
    </div>
  );
}
