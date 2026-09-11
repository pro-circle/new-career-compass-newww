import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LEGAL_UPDATED } from "@/components/legal";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · ATS Engine" },
      {
        name: "description",
        content:
          "How ATS Engine handles resumes, profiles and messages, and which AI processors (Groq, OpenRouter, Supabase) receive your data.",
      },
      { property: "og:title", content: "Privacy Policy · ATS Engine" },
      {
        property: "og:description",
        content: "Data we collect, where it is stored, and which AI providers process it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Privacy Policy · ATS Engine" },
      {
        name: "twitter:description",
        content: "Data we collect, where it is stored, and which AI providers process it.",
      },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_UPDATED}>
      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account</strong> — name, email, role (recruiter or candidate), hashed credentials.</li>
        <li><strong>Candidate data</strong> — resume file and parsed fields, skills, experience, preferences, applications, interview transcripts.</li>
        <li><strong>Recruiter data</strong> — requisitions, pipeline stages, notes, outreach messages.</li>
        <li><strong>Usage</strong> — basic logs needed to operate and debug the service.</li>
      </ul>

      <h2>2. Where it is stored</h2>
      <p>
        All application data lives in <strong>Supabase</strong> (Postgres, Auth and Storage) with
        row-level security so each account reaches only its own records. Sessions are held in an
        encrypted, HTTP-only cookie.
      </p>

      <h2>3. AI subprocessors</h2>
      <p>To produce AI output we transmit the minimum relevant context to:</p>
      <ul>
        <li>
          <strong>Groq</strong> — model <code>openai/gpt-oss-120b</code>, used for resume parsing,
          job-link extraction, match scoring and auto-apply drafting.
        </li>
        <li>
          <strong>OpenRouter</strong> — model <code>google/gemma-4-26b-a4b-it:free</code>, used for
          the streaming career assistant.
        </li>
      </ul>
      <p>
        API keys are held server-side only; the browser never sees them and never calls a model
        provider directly. Providers process requests under their own privacy terms — review them
        before submitting sensitive personal data.
      </p>

      <h2>4. Third-party job sources</h2>
      <p>
        Job discovery reads public feeds (Remotive, Arbeitnow) and pages you paste. We send search
        keywords derived from your profile, not your resume file.
      </p>

      <h2>5. Voice input</h2>
      <p>
        The assistant and mock interview use your browser's built-in speech recognition. Audio is
        handled by the browser/OS; only the resulting transcript reaches our servers and the model
        provider. Nothing is recorded to disk by us.
      </p>

      <h2>6. Sharing</h2>
      <p>
        We do not sell personal data. Candidate profiles are visible to a recruiter only after you
        apply to that recruiter's role or the agent applies on your behalf.
      </p>

      <h2>7. Retention and your rights</h2>
      <p>
        Data is kept while your account is active. You can export or delete your profile, resume and
        application history from Settings; deletion removes records from our database. You may also
        request access, correction or deletion by contacting us.
      </p>

      <h2>8. Security</h2>
      <p>
        Encrypted transport, server-side secrets, role-scoped database policies and encrypted
        session cookies. No system is perfectly secure — please avoid uploading government
        identifiers or financial details.
      </p>

      <h2>9. Contact</h2>
      <p>Questions about this policy can be sent to the workspace owner via the in-app support link.</p>
    </LegalPage>
  );
}
