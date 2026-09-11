import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AutoApplySettings = {
  enabled: boolean;
  minScore: number;
  dailyLimit: number;
};

export type AutoApplyLogEntry = {
  id: string;
  jobTitle: string;
  company: string;
  matchScore: number;
  status: "applied" | "skipped";
  reason: string;
  createdAt: string;
};

const DEFAULTS: AutoApplySettings = {
  enabled: false,
  minScore: 85,
  dailyLimit: 5,
};

async function ctx() {
  const { requireUserId } = await import("@/lib/session.server");
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    userId: await requireUserId(),
    db: getSupabaseAdmin(),
  };
}

export const getAutoApply = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ settings: AutoApplySettings; log: AutoApplyLogEntry[] }> => {
    const { userId, db } = await ctx();
    if (!db) return { settings: DEFAULTS, log: [] };

    const { data: s } = await db
      .from("auto_apply_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: l } = await db
      .from("auto_apply_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25);

    return {
      settings: s
        ? {
            enabled: !!s.enabled,
            minScore: s.min_score ?? DEFAULTS.minScore,
            dailyLimit: s.daily_limit ?? DEFAULTS.dailyLimit,
          }
        : DEFAULTS,
      log: ((l ?? []) as any[]).map((r) => ({
        id: r.id,
        jobTitle: r.job_title ?? "",
        company: r.company ?? "",
        matchScore: r.match_score ?? 0,
        status: (r.status ?? "applied") as AutoApplyLogEntry["status"],
        reason: r.reason ?? "",
        createdAt: r.created_at ?? "",
      })),
    };
  },
);

export const setAutoApply = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        enabled: z.boolean(),
        minScore: z.number().min(0).max(100).optional(),
        dailyLimit: z.number().min(1).max(25).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<AutoApplySettings> => {
    const { userId, db } = await ctx();
    const next: AutoApplySettings = {
      enabled: data.enabled,
      minScore: data.minScore ?? DEFAULTS.minScore,
      dailyLimit: data.dailyLimit ?? DEFAULTS.dailyLimit,
    };
    if (!db) return next;
    await db.from("auto_apply_settings").upsert(
      {
        user_id: userId,
        enabled: next.enabled,
        min_score: next.minScore,
        daily_limit: next.dailyLimit,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    return next;
  });

/**
 * One agent pass. Called on a timer by the browser hook while the candidate
 * has auto-apply switched on. Picks the highest-scoring matches above the
 * threshold that have no application yet, writes real `applications` rows and
 * an audit entry per decision. Respects the per-day cap.
 */
export const runAutoApply = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ applied: AutoApplyLogEntry[]; skipped: number }> => {
    const { userId, db } = await ctx();
    if (!db) return { applied: [], skipped: 0 };

    const { data: s } = await db
      .from("auto_apply_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!s?.enabled) return { applied: [], skipped: 0 };

    const minScore = s.min_score ?? DEFAULTS.minScore;
    const dailyLimit = s.daily_limit ?? DEFAULTS.dailyLimit;

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count: todayCount } = await db
      .from("auto_apply_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "applied")
      .gte("created_at", since.toISOString());

    const remaining = Math.max(0, dailyLimit - (todayCount ?? 0));
    if (remaining === 0) return { applied: [], skipped: 0 };

    const { data: matches } = await db
      .from("job_matches")
      .select("*")
      .gte("match_score", minScore)
      .order("match_score", { ascending: false })
      .limit(50);

    const { data: existing } = await db
      .from("applications")
      .select("job_title,company")
      .eq("user_id", userId);
    const seen = new Set(
      ((existing ?? []) as any[]).map((a) => `${a.job_title}|${a.company}`.toLowerCase()),
    );

    const applied: AutoApplyLogEntry[] = [];
    let skipped = 0;

    for (const m of ((matches ?? []) as any[]).slice(0, remaining + 10)) {
      if (applied.length >= remaining) break;
      const key = `${m.title}|${m.company}`.toLowerCase();
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);

      const appId = `APP-${Date.now().toString(36)}-${applied.length}`;
      await db.from("applications").insert({
        id: appId,
        user_id: userId,
        job_title: m.title,
        company: m.company,
        logo: m.logo ?? m.company?.slice(0, 2).toUpperCase(),
        applied_on: new Date().toISOString().slice(0, 10),
        stage: "Applied",
        progress: 15,
        match_score: m.match_score ?? 0,
        next_step: "Submitted by auto-apply agent",
      });

      const entry: AutoApplyLogEntry = {
        id: appId,
        jobTitle: m.title,
        company: m.company,
        matchScore: m.match_score ?? 0,
        status: "applied",
        reason: `Match ${m.match_score}% ≥ threshold ${minScore}%`,
        createdAt: new Date().toISOString(),
      };
      await db.from("auto_apply_log").insert({
        id: appId,
        user_id: userId,
        job_title: entry.jobTitle,
        company: entry.company,
        match_score: entry.matchScore,
        status: entry.status,
        reason: entry.reason,
        created_at: entry.createdAt,
      });
      applied.push(entry);
    }

    return { applied, skipped };
  },
);
