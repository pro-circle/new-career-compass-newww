import { ThemeToggle } from "@/components/theme-toggle";
import { BackButton } from "@/components/back-button";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { login, getCurrentSession } from "@/lib/auth.functions";
import { LegalLinks } from "@/components/legal";


export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in · ATS Engine" }] }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session?.userId && session.role) {
      if (session.role === "candidate" && !session.onboarded) {
        throw redirect({ to: "/candidate/onboarding" });
      }
      throw redirect({
        to: session.role === "candidate" ? "/candidate" : "/employer",
      });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please accept the Terms and Privacy Policy to continue");
      return;
    }
    setBusy(true);
    try {
      const res = await login({ data: { email, password } });
      if (!res.ok) {
        toast.error(res.error ?? "Sign in failed");
        return;
      }
      toast.success(`Signed in as ${res.role}`);
      if (res.role === "candidate" && !res.onboarded) {
        await router.navigate({ to: "/candidate/onboarding" });
      } else {
        await router.navigate({
          to: res.role === "candidate" ? "/candidate" : "/employer",
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen w-full font-sans lg:grid-cols-2">
      <BackButton className="fixed left-4 top-4 z-50" variant="subtle" />
      <ThemeToggle className="fixed right-4 top-4 z-50 bg-background/80 backdrop-blur" />
      <aside className="relative hidden overflow-hidden bg-foreground p-12 text-background lg:flex lg:flex-col lg:justify-between">
        <a href="/" className="inline-flex items-center gap-2 font-display text-lg font-extrabold">
          ATS ENGINE
        </a>
        <div className="relative z-10 max-w-md">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-background/70">
            <Sparkles className="size-3 text-accent" /> Intelligent recruiting
          </div>
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Hire the top 1% <span className="text-accent">10× faster</span> with contextual AI.
          </h2>
          <p className="mt-4 text-sm text-background/70">
            Match, screen, interview and offer — all from one workspace that understands your team.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-40 -top-40 size-[500px] rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 size-[400px] rounded-full bg-accent/20 blur-3xl" />
      </aside>

      <section className="flex items-center justify-center bg-card p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-extrabold">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to continue to your workspace.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground/80">
                Work email
              </span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-foreground/80">
                Password
              </span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </label>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-brand"
              />
              <span>
                I agree to the <LegalLinks />.
              </span>
            </label>

            <button
              type="submit"
              disabled={busy || !agreed}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                "Signing in…"
              ) : (
                <>
                  Sign in <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-border bg-surface/50 p-3 text-xs text-muted-foreground">
            <div className="mb-2 font-semibold text-foreground">Demo logins</div>
            <div className="space-y-1.5">
              {(["recruiter@demo.dev", "candidate@demo.dev"] as const).map((demo) => (
                <div
                  key={demo}
                  className="group flex items-center justify-between gap-3 rounded-md border border-border bg-card/60 px-3 py-2 transition-colors hover:border-brand/40 hover:bg-background"
                >
                  <code className="font-mono text-[11px] text-foreground/80 transition-colors group-hover:text-foreground">
                    {demo}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(demo);
                      setPassword("demo1234");
                    }}
                    className="rounded border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground group-hover:text-foreground"
                  >
                    use
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-2">
              Password for both: <code className="font-mono">demo1234</code>
            </div>

          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            New here?{" "}
            <a href="/auth/signup" className="font-semibold text-brand hover:underline">
              Create an account
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
