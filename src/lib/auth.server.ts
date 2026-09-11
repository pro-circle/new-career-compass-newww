/**
 * Server-only Supabase Auth helpers.
 *
 * Sign-in / sign-up run against Supabase Auth with the *publishable / anon*
 * key. The resulting user id + role are stored in our encrypted cookie session
 * so every server function can identify the caller without shipping tokens to
 * the browser.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { firstEnv } from "./env.server";

export type AuthRole = "employer" | "candidate";

export function getSupabaseAuthClient(): SupabaseClient | null {
  const url = firstEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const key = firstEnv(
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  );
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Reads (or creates) the profile row that carries the user's role. */
export async function ensureProfile(
  userId: string,
  role: AuthRole,
  fullName: string,
  email: string,
): Promise<{ role: AuthRole; onboarded: boolean }> {
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = getSupabaseAdmin();
  if (!db) return { role, onboarded: role === "employer" };

  const { data: existing } = await db
    .from("profiles")
    .select("role, onboarded")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return {
      role: (existing.role as AuthRole) ?? role,
      onboarded: !!existing.onboarded,
    };
  }

  await db.from("profiles").insert({
    id: userId,
    role,
    email,
    full_name: fullName,
    onboarded: role === "employer",
  });
  return { role, onboarded: role === "employer" };
}
