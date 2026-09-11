import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env.server";

let cached: SupabaseClient | null | undefined;

/**
 * Server-only Supabase client using the service-role key.
 * Returns null when env is not configured so loaders don't crash during SSR / build:dev.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = serverEnv("SUPABASE_URL") ?? serverEnv("VITE_SUPABASE_URL");
  const key = serverEnv("SUPABASE_SERVICE_ROLE_KEY") ?? serverEnv("SUPABASE_SECRET_KEY");
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
