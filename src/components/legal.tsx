import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BackButton } from "@/components/back-button";
import { ThemeToggle } from "@/components/theme-toggle";

export const LEGAL_UPDATED = "August 2026";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <BackButton variant="subtle" />
          <Link to="/" className="font-display text-lg font-extrabold tracking-tight">
            ATS Engine
          </Link>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Legal
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>

        <div className="legal-prose mt-10 space-y-6 text-sm leading-relaxed text-foreground/80">
          {children}
        </div>

        <div className="mt-12 flex gap-4 border-t border-border pt-6 text-xs font-semibold">
          <Link to="/legal/terms" className="text-brand hover:underline">
            Terms of Service
          </Link>
          <Link to="/legal/privacy" className="text-brand hover:underline">
            Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <Link to="/legal/terms" className="font-semibold text-brand hover:underline">
        Terms
      </Link>
      {" and "}
      <Link to="/legal/privacy" className="font-semibold text-brand hover:underline">
        Privacy Policy
      </Link>
    </span>
  );
}
