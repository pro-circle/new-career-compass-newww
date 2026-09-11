/** Shared server-only helpers for the workspace feature modules. */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function db(): Promise<SupabaseClient | null> {
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  return getSupabaseAdmin();
}

export async function currentUser() {
  const { getAppSession } = await import("@/lib/session.server");
  const session = await getAppSession();
  return session.data;
}

export async function currentUserId(): Promise<string> {
  const { requireUserId } = await import("@/lib/session.server");
  return requireUserId();
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export const NO_DB = "Backend not configured — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
