import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Rocket, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { saveOnboarding } from "@/lib/profile.functions";

export const Route = createFileRoute("/_app/candidate/onboarding")({
  head: () => ({
    meta: [
      { title: "Complete Your Candidate Profile · ATS Engine" },
      { name: "description", content: "Save the profile details, experience, skills and links ATS Engine uses to personalize your job search." },
      { property: "og:title", content: "Complete Your Candidate Profile · ATS Engine" },
      { property: "og:description", content: "Save the profile details, experience, skills and links ATS Engine uses to personalize your job search." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [yearsExp, setYearsExp] = useState<number>(0);
  const [targetRoles, setTargetRoles] = useState("");
  const [skills, setSkills] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setResumeText(text);
    toast.success(`Loaded ${file.name}`);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!resumeText.trim() && !skills.trim()) {
      toast.error("Add a resume or list your skills to continue");
      return;
    }
    setBusy(true);
    try {
      await saveOnboarding({
        data: {
          fullName,
          email,
          headline,
          summary,
          location,
          yearsExp: Number(yearsExp) || 0,
          targetRoles: targetRoles
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          links: [
            { label: "Portfolio", url: portfolioUrl },
            { label: "LinkedIn", url: linkedinUrl },
            { label: "GitHub", url: githubUrl },
          ].filter((link) => link.url.trim()),
          resumeText,
        },
      });
      toast.success("Profile saved");
      await router.navigate({ to: "/candidate" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-10">
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent">
          <Sparkles className="size-3" /> Welcome to ATS Engine
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Tell us about you</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your resume or a quick profile so we can personalize matches, mock interviews, and
          roadmap suggestions.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Full name *"
            value={fullName}
            onChange={setFullName}
            placeholder="Jordan Rivera"
          />
          <Field
            label="Email *"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
          />
          <Field
            label="Headline"
            value={headline}
            onChange={setHeadline}
            placeholder="Senior Product Designer"
          />
          <Field
            label="Location"
            value={location}
            onChange={setLocation}
            placeholder="Brooklyn, NY · Remote"
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground/80">
              Years of experience
            </span>
            <input
              type="number"
              min={0}
              value={yearsExp}
              onChange={(e) => setYearsExp(Number(e.target.value))}
              className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </div>

        <Field
          label="Target roles (comma separated)"
          value={targetRoles}
          onChange={setTargetRoles}
          placeholder="Senior Product Designer, Design Lead"
        />
        <Field
          label="Professional summary"
          value={summary}
          onChange={setSummary}
          placeholder="Product designer who turns complex workflows into clear, useful tools."
        />

        <div>
          <div className="mb-2 text-xs font-semibold text-foreground/80">Professional links</div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Portfolio URL" value={portfolioUrl} onChange={setPortfolioUrl} placeholder="https://…" type="url" />
            <Field label="LinkedIn URL" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/…" type="url" />
            <Field label="GitHub URL" value={githubUrl} onChange={setGithubUrl} placeholder="https://github.com/…" type="url" />
          </div>
        </div>
        <Field
          label="Top skills (comma separated)"
          value={skills}
          onChange={setSkills}
          placeholder="Figma, Design Systems, Prototyping, Motion"
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground/80">
              Resume (paste text or upload .txt / .md)
            </span>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold hover:bg-card">
              <Wand2 className="size-3" /> Upload
              <input
                type="file"
                accept=".txt,.md,text/plain"
                onChange={onFile}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume here… ATS Engine will parse it into structured data for smarter matching."
            className="min-h-[220px] w-full rounded-md border border-border bg-surface px-3 py-2.5 font-mono text-xs outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (
              "Saving…"
            ) : (
              <>
                Continue to workspace <Rocket className="size-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
