import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { Sparkles, Copy, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { streamGeneration } from "@/lib/ai-stream";

export const Route = createFileRoute("/_app/candidate/cover-letter")({
  head: () => ({
    meta: [
      { title: "Cover Letter Generator · ATS Engine" },
      { name: "description", content: "Create a formal cover letter tailored to a specific role and grounded in your saved experience." },
      { property: "og:title", content: "Cover Letter Generator · ATS Engine" },
      { property: "og:description", content: "Create a formal cover letter tailored to a specific role and grounded in your saved experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoverLetter,
});

function CoverLetter() {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [manager, setManager] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [highlights, setHighlights] = useState("");
  const [length, setLength] = useState<"concise" | "standard">("standard");
  const [tone, setTone] = useState<"confident" | "warm" | "direct">("confident");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const { profile } = useProfile();

  async function generate() {
    if (!role.trim() || !company.trim()) {
      toast.error("Add the role and company first");
      return;
    }
    setBusy(true);
    setContent("");
    try {
      await streamGeneration(
        {
          system:
            "You write concise, specific cover letters. Ground every claim in the candidate profile provided. No placeholders, no brackets. Sign off with the candidate's name.",
          context: profile
            ? `Candidate: ${profile.fullName}\nHeadline: ${profile.headline}\nLocation: ${profile.location}\nYears experience: ${profile.yearsExp}\nSkills: ${profile.skills.join(", ")}\nResume:\n${profile.resumeText.slice(0, 6000)}`
            : undefined,
          prompt: `Write a polished ${length} cover letter for the ${role} role at ${company}.
Hiring manager: ${manager || "Hiring Manager"}
Job description:
${jobDescription || "No job description supplied; use the role and candidate profile."}
Candidate highlights to prioritize:
${highlights || "Choose the most relevant truthful achievements from the profile."}
Use a professional letter structure with a greeting, 3-4 focused paragraphs, and a sign-off. Do not use markdown, placeholders, brackets, or invented facts.`,
        },
        (chunk) => setContent((c) => c + chunk),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadLetter() {
    if (!content.trim()) return;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${company || "cover-letter"}-${role || "application"}.txt`.replace(/\s+/g, "-");
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Cover letter downloaded");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="AI writing"
        title="Cover letter generator"
        subtitle="Personalized to each role — grounded in your resume and portfolio."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Prompt" className="lg:col-span-1">
          <div className="space-y-3 p-5">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Role
              </label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Tone
              </label>
              <div className="flex rounded-md border border-border bg-surface p-0.5 text-xs">
                {(["confident", "warm", "direct"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`flex-1 rounded px-2 py-1 font-medium capitalize ${
                      tone === t ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hiring manager</label>
                <input value={manager} onChange={(e) => setManager(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your strongest highlights</label>
                <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={3} placeholder="Projects, outcomes, or experience to emphasize" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Job description</label>
                <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={5} placeholder="Paste the posting or its key requirements" className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Length</label>
                <div className="flex rounded-md border border-border bg-surface p-0.5 text-xs">
                  {(["concise", "standard"] as const).map((option) => (
                    <button key={option} onClick={() => setLength(option)} className={`flex-1 rounded px-2 py-1.5 font-medium capitalize ${length === option ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>{option}</button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => void generate()}
              disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent py-2.5 text-xs font-semibold text-accent-foreground"
            >
              <Sparkles className="size-3.5" /> {busy ? "Generating…" : "Generate with AI"}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Generated letter"
          className="lg:col-span-2"
          action={
             <div className="flex items-center gap-3">
              <button
               disabled={!content.trim()}
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(content);
                    toast.success("Copied to clipboard");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not copy letter");
                  }
                }}
               className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-40"
            >
              <Copy className="size-3" /> Copy
            </button>
             <button onClick={downloadLetter} disabled={!content.trim()} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-40"><Download className="size-3" /> Download</button>
             </div>
          }
        >
           {content ? <textarea
             value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            className="w-full resize-none border-0 bg-transparent p-6 font-sans text-sm leading-relaxed outline-none"
           /> : <div className="grid min-h-[420px] place-items-center p-8 text-center text-sm text-muted-foreground"><div><FileText className="mx-auto mb-3 size-7 text-accent" /><p>Your finished letter will appear here.</p><p className="mt-1 text-xs">Add the role and company, then generate a tailored draft.</p></div></div>}
        </SectionCard>
      </div>
    </div>
  );
}
