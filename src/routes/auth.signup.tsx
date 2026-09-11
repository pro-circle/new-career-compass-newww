import { ThemeToggle } from "@/components/theme-toggle";
import { BackButton } from "@/components/back-button";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Mail, Lock, User, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { signup, getCurrentSession } from "@/lib/auth.functions";
import { LegalLinks } from "@/components/legal";


export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Create account · ATS Engine" }] }),
  beforeLoad: async () => {
    const s = await getCurrentSession();
    if (s?.userId && s.role) {
      throw redirect({ to: s.role === "candidate" ? "/candidate" : "/employer" });
    }
  },
  component: SignupPage,
});

function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"employer" | "candidate">("employer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) {
      toast.error("Please accept the Terms and Privacy Policy to continue");
      return;
    }
    setBusy(true);
    try {
      const res = await signup({
        data: { email, password, fullName, role },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Account created — welcome to ATS Engine");
      if (res.role === "candidate" && !res.onboarded) {
        await router.navigate({ to: "/candidate/onboarding" });
      } else {
        await router.navigate({
          to: res.role === "candidate" ? "/candidate" : "/employer",
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
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
        <div className="relative z-10 max-w-md space-y-6">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Start your <span className="text-accent">14-day trial</span>. No card required.
          </h2>
          <ul className="space-y-3 text-sm text-background/80">
            {[
              "Unlimited AI matching",
              "Instant resume + interview intelligence",
              "Careers page in one click",
              "SOC 2 + GDPR ready",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="size-4 text-accent" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="pointer-events-none absolute -right-40 -top-40 size-[500px] rounded-full bg-brand/30 blur-3xl" />
      </aside>

      <section className="flex items-center justify-center bg-card p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand">
              <Sparkles className="size-3" /> Get started
            </div>
            <h1 className="font-display text-2xl font-extrabold">Create your account</h1>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-1 text-xs font-semibold">
            {(["employer", "candidate"] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-md py-2 capitalize transition-colors ${
                  role === r ? "bg-card shadow-sm ring-1 ring-border" : "text-muted-foreground"
                }`}
              >
                I'm a {r === "employer" ? "recruiter" : "candidate"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field
              icon={User}
              label="Full name"
              placeholder="Jane Doe"
              value={fullName}
              onChange={setFullName}
            />
            <Field
              icon={Mail}
              label="Work email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={setEmail}
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={setPassword}
            />

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
                "Creating…"
              ) : (
                <>
                  Create account <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <a href="/auth/login" className="font-semibold text-brand hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground/80">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-surface py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>
    </label>
  );
}
