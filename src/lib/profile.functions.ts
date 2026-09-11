import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const profileInput = z.object({
  fullName: z.string().min(1),
  email: z.string().email().or(z.literal("")),
  headline: z.string().default(""),
  summary: z.string().max(6000).default(""),
  location: z.string().default(""),
  yearsExp: z.number().int().min(0).default(0),
  targetRoles: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
  resumeText: z.string().default(""),
});

export const saveOnboarding = createServerFn({ method: "POST" })
  .validator((data: unknown) => profileInput.parse(data))
  .handler(async ({ data }) => {
    const { getAppSession, requireUserId } = await import("@/lib/session.server");
    const userId = await requireUserId();
    const session = await getAppSession();

    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = getSupabaseAdmin();
    if (!db) {
      // No DB configured — mark onboarded in session so the flow still advances.
      await session.update({ ...session.data, onboarded: true });
      return { ok: true as const, persisted: false };
    }

    // Try to parse resume text into structured JSON with Groq (best-effort).
    let resumeJson: unknown = null;
    if (data.resumeText.trim().length > 40) {
      try {
        const { runAgent } = await import("@/lib/ai-provider.server");
        const { text } = await runAgent({
          kind: "agent",
          system:
            "Extract a candidate resume into strict JSON with keys: name, headline, summary, experience (array of {company,title,dates,bullets}), education (array of {school,degree,dates}), skills (array of strings). Return ONLY JSON, no prose.",
          prompt: data.resumeText.slice(0, 20000),
        });
        try {
          resumeJson = JSON.parse(text);
        } catch {
          const m = text.match(/\{[\s\S]*\}$/);
          if (m) resumeJson = JSON.parse(m[0]);
        }
      } catch {
        // ignore parse failures
      }
    }

    await db.from("profiles").upsert({
      id: userId,
      email: data.email,
      role: "candidate",
      full_name: data.fullName,
      headline: data.headline,
      summary: data.summary,
      location: data.location,
      years_exp: data.yearsExp,
      target_roles: data.targetRoles,
      skills: data.skills,
      links: data.links,
      resume_text: data.resumeText,
      resume_json: resumeJson,
      onboarded: true,
    });

    await session.update({ ...session.data, onboarded: true });
    return { ok: true as const, persisted: true };
  });
