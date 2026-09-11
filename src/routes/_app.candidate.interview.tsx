import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { listTrainings } from "@/lib/training.functions";
import { Compass, Loader2, Mic } from "lucide-react";

export const Route = createFileRoute("/_app/candidate/interview")({
  head: () => ({
    meta: [
      { title: "Mock Interview · ATS Engine" },
      {
        name: "description",
        content:
          "Practise spoken interview answers against a real job posting and get scored on structure, specificity and pacing.",
      },
    ],
  }),
  component: MockInterview,
});

function MockInterview() {
  const [sessions, setSessions] = useState<
    { id: string; title: string; company: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listTrainings().then((s) => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="AI mock interview"
        title="Practice against a real posting"
        subtitle="Questions are written from the job you are targeting — company, product and stack — and your spoken answers are scored."
        actions={
          <Link
            to="/candidate/external"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground"
          >
            <Compass className="size-3.5" /> Analyse a job link
          </Link>
        }
      />

      <SectionCard title="Your training sessions">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <Mic className="mx-auto mb-3 size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No practice sessions yet. Paste a job link in External Job Prep and press{" "}
              <span className="font-semibold text-foreground">Get trained</span> to generate
              role-specific questions.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  to="/candidate/training/$sessionId"
                  params={{ sessionId: s.id }}
                  className="flex items-center justify-between gap-3 p-5 hover:bg-surface"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {[s.company, new Date(s.createdAt).toLocaleDateString()]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-accent">Practise →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
