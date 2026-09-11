import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ShareInfo = { jobId: string; slug: string; views: number; url: string };

function baseUrl(): string {
  return "";
}

/** Creates (or returns) the live share record for a job. */
export const ensureShareLink = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ jobId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; share?: ShareInfo }> => {
    const { db, NO_DB } = await import("./workspace.server");
    const client = await db();
    if (!client) return { ok: false, message: NO_DB };

    const { data: job } = await client
      .from("jobs")
      .select("id, title")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job) return { ok: false, message: "That job no longer exists." };

    const { data: existing } = await client
      .from("job_shares")
      .select("*")
      .eq("job_id", data.jobId)
      .maybeSingle();

    if (existing) {
      return {
        ok: true,
        message: "Share link ready",
        share: {
          jobId: data.jobId,
          slug: String(existing.slug ?? data.jobId),
          views: Number(existing.views ?? 0),
          url: `${baseUrl()}/share/${existing.slug ?? data.jobId}`,
        },
      };
    }

    const slug = `${String(job.title ?? "job")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)}-${data.jobId.toLowerCase()}`;
    const { error } = await client.from("job_shares").insert({ job_id: data.jobId, slug });
    if (error) return { ok: false, message: error.message };
    return {
      ok: true,
      message: "Share link created",
      share: { jobId: data.jobId, slug, views: 0, url: `${baseUrl()}/share/${slug}` },
    };
  });

/** Resolves a slug (or raw job id) and counts the view. */
export const trackShareView = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ slugOrId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ jobId: string | null; views: number }> => {
    const { db } = await import("./workspace.server");
    const client = await db();
    if (!client) return { jobId: null, views: 0 };

    const { data: bySlug } = await client
      .from("job_shares")
      .select("*")
      .or(`slug.eq.${data.slugOrId},job_id.eq.${data.slugOrId}`)
      .maybeSingle();

    if (!bySlug) {
      // Job opened before a share record existed — create one lazily.
      const { data: job } = await client
        .from("jobs")
        .select("id")
        .eq("id", data.slugOrId)
        .maybeSingle();
      if (!job) return { jobId: null, views: 0 };
      await client
        .from("job_shares")
        .insert({ job_id: String(job.id), slug: String(job.id).toLowerCase(), views: 1, last_viewed_at: new Date().toISOString() });
      return { jobId: String(job.id), views: 1 };
    }

    const views = Number(bySlug.views ?? 0) + 1;
    await client
      .from("job_shares")
      .update({ views, last_viewed_at: new Date().toISOString() })
      .eq("job_id", String(bySlug.job_id));
    return { jobId: String(bySlug.job_id), views };
  });

export const getShareStats = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ jobId: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<{ views: number; slug: string | null }> => {
    const { db } = await import("./workspace.server");
    const client = await db();
    if (!client) return { views: 0, slug: null };
    const { data: row } = await client
      .from("job_shares")
      .select("slug, views")
      .eq("job_id", data.jobId)
      .maybeSingle();
    return { views: Number(row?.views ?? 0), slug: row?.slug ? String(row.slug) : null };
  });
