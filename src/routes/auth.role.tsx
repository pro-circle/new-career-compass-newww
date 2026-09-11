import { ThemeToggle } from "@/components/theme-toggle";
import { BackButton } from "@/components/back-button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Rocket, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth/role")({
  head: () => ({ meta: [{ title: "Choose your role · ATS Engine" }] }),
  component: RoleSelectPage,
});

function RoleSelectPage() {
  return (
    <div className="grid min-h-screen w-full place-items-center bg-surface p-6 font-sans">
      <BackButton className="fixed left-4 top-4 z-50" variant="subtle" />
      <ThemeToggle className="fixed right-4 top-4 z-50 bg-background/80 backdrop-blur" />
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand">
            <Sparkles className="size-3" /> One last step
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            How will you use ATS Engine??
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Pick a portal to tailor your onboarding — you can switch later.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RoleCard
            to="/employer"
            title="I'm hiring talent"
            desc="Manage requisitions, review AI-ranked candidates, and run interviews with your team."
            features={[
              "AI candidate ranking",
              "Pipeline analytics",
              "Interview scheduler",
              "Offer letters",
            ]}
            icon={Users}
            accent="brand"
          />
          <RoleCard
            to="/candidate"
            title="I'm looking for opportunities"
            desc="Optimize your resume, practice interviews, and match instantly with roles that fit."
            features={["Resume optimizer", "AI mock interviews", "Match feed", "Skill roadmap"]}
            icon={Rocket}
            accent="accent"
          />
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Need to update account details?{" "}
          <Link to="/auth/login" className="font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  to,
  title,
  desc,
  features,
  icon: Icon,
  accent,
}: {
  to: string;
  title: string;
  desc: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
  accent: "brand" | "accent";
}) {
  return (
    <Link
      to={to}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-${accent}/40 hover:shadow-xl`}
    >
      <div
        className={`mb-5 grid size-12 place-items-center rounded-xl bg-${accent}/10 text-${accent}`}
      >
        <Icon className="size-5" />
      </div>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      <ul className="mt-5 space-y-2 text-xs text-foreground/70">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className={`size-1.5 rounded-full bg-${accent}`} /> {f}
          </li>
        ))}
      </ul>
      <div className={`mt-6 inline-flex items-center gap-1 text-sm font-semibold text-${accent}`}>
        Continue <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
