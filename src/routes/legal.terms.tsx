import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LEGAL_UPDATED } from "@/components/legal";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · ATS Engine" },
      {
        name: "description",
        content:
          "Terms of Service for ATS Engine — AI recruiting and job-hunt automation powered by Groq and OpenRouter.",
      },
      { property: "og:title", content: "Terms of Service · ATS Engine" },
      {
        property: "og:description",
        content: "The rules for using ATS Engine's AI recruiting and candidate automation workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Terms of Service · ATS Engine" },
      {
        name: "twitter:description",
        content: "The rules for using ATS Engine's AI recruiting and candidate automation workspace.",
      },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage title="Terms of Service" updated={LEGAL_UPDATED}>
      <h2>1. Acceptance</h2>
      <p>
        By creating an account or signing in to ATS Engine you agree to these Terms and to the
        Privacy Policy. If you do not agree, do not use the service.
      </p>

      <h2>2. What the service does</h2>
      <p>
        ATS Engine is an AI-assisted hiring workspace. Recruiters post roles, screen, compare and
        contact candidates. Candidates upload a resume, discover roles, optimize applications,
        rehearse interviews by voice and optionally let an agent apply on their behalf.
      </p>

      <h2>3. AI platforms we use</h2>
      <p>
        Generation is performed by third-party model providers, not by us:
      </p>
      <ul>
        <li>
          <strong>Groq</strong> (<code>openai/gpt-oss-120b</code>) — agentic work: resume parsing,
          job-link extraction, match scoring, auto-apply drafting.
        </li>
        <li>
          <strong>OpenRouter</strong> (<code>google/gemma-4-26b-a4b-it:free</code>) — the streaming
          career assistant chat and one-shot generators.
        </li>
        <li>
          <strong>Supabase</strong> — authentication, Postgres storage and file storage.
        </li>
        <li>
          Public job feeds (Remotive, Arbeitnow) and pages you explicitly link — used for job
          discovery.
        </li>
      </ul>
      <p>
        Prompts derived from your profile, resume and messages are transmitted to these providers to
        produce a response. Each provider applies its own terms and retention policy. Do not submit
        anything you are not permitted to share with a third-party processor.
      </p>

      <h2>4. AI output is advisory</h2>
      <p>
        Match scores, rankings, generated resumes, cover letters, interview feedback and
        recommendations are probabilistic and may be wrong. A human must review every hiring
        decision and every application submitted on your behalf. We make no guarantee of interviews,
        offers or hires.
      </p>

      <h2>5. Auto-apply</h2>
      <p>
        Auto-apply only runs while you enable it. In review mode the agent creates proposals you
        approve; in auto mode it submits applications directly using your stored profile. You remain
        responsible for the accuracy of everything submitted and may disable it at any time.
      </p>

      <h2>6. Acceptable use</h2>
      <ul>
        <li>No unlawful, discriminatory or deceptive use of screening and ranking features.</li>
        <li>No uploading of another person's data without a lawful basis.</li>
        <li>No scraping, reverse engineering, or abuse of provider rate limits.</li>
      </ul>

      <h2>7. Accounts</h2>
      <p>You are responsible for your credentials and all activity under your account.</p>

      <h2>8. Availability and liability</h2>
      <p>
        The service is provided "as is". Model providers and job feeds may be rate-limited or
        unavailable. To the maximum extent permitted by law we are not liable for indirect or
        consequential loss, including missed opportunities.
      </p>

      <h2>9. Termination</h2>
      <p>You may delete your account at any time. We may suspend accounts that breach these Terms.</p>

      <h2>10. Changes</h2>
      <p>We may update these Terms; continued use after an update constitutes acceptance.</p>
    </LegalPage>
  );
}
