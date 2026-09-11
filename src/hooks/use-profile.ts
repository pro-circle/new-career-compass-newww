import { useEffect, useState } from "react";
import { getCandidateProfile } from "@/lib/data.functions";
import type { CandidateProfile } from "@/lib/types";

export type ResumeJson = {
  name?: string;
  headline?: string;
  summary?: string;
  experience?: { company?: string; title?: string; dates?: string; bullets?: string[] }[];
  education?: { school?: string; degree?: string; dates?: string }[];
  skills?: string[];
};

/** Live candidate profile (Supabase `profiles` row) for the signed-in user. */
export function useProfile() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getCandidateProfile();
        if (!cancelled) setProfile(p);
      } catch {
        /* not signed in / backend unavailable */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  let resume: ResumeJson | null = null;
  if (profile?.resumeJson) {
    try {
      resume = JSON.parse(profile.resumeJson) as ResumeJson;
    } catch {
      resume = null;
    }
  }

  const initials =
    (profile?.fullName ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "—";

  return { profile, resume, initials, loading };
}
