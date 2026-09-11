import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Job } from "./types";

async function db() {
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  return getSupabaseAdmin();
}

function rowToJob(r: any): Job {
  return {
    id: r.id,
    title: r.title,
    department: r.department ?? "",
    location: r.location ?? "",
    type: (r.type ?? "Full-time") as Job["type"],
    postedAgo: r.posted_at ? new Date(r.posted_at).toLocaleDateString() : "",
    status: r.status as Job["status"],
    applicants: r.applicants ?? 0,
    new: r.new_count ?? 0,
    matchAvg: r.match_avg ?? 0,
    salary: r.salary ?? "",
    description: r.description ?? "",
    tags: r.tags ?? [],
  };
}

/** Every open requisition posted through this ATS, for the candidate careers page. */
export const listOpenJobs = createServerFn({ method: "GET" }).handler(async (): Promise<Job[]> => {
  const client = await db();
  if (!client) return [];
  const { data } = await client
    .from("jobs")
    .select("*")
    .eq("status", "Open")
    .order("posted_at", { ascending: false });
  return (data ?? []).map(rowToJob);
});

/** Public read for the shareable job link. */
export const getPublicJob = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<Job | null> => {
    const client = await db();
    if (!client) return null;
    const { data: row } = await client.from("jobs").select("*").eq("id", data.id).maybeSingle();
    return row ? rowToJob(row) : null;
  });

/** Creates a requisition and returns its id + shareable link slug. */
export const createJob = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        title: z.string().min(2),
        department: z.string().optional(),
        location: z.string().optional(),
        type: z.string().optional(),
        salary: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["Open", "Draft"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/session.server");
    const employerId = await requireUserId();
    const id = `JOB-${Date.now().toString(36).toUpperCase()}`;
    const client = await db();
    if (client) {
      const { error } = await client.from("jobs").insert({
        id,
        employer_id: employerId,
        title: data.title,
        department: data.department ?? "",
        location: data.location ?? "",
        type: data.type ?? "Full-time",
        status: data.status ?? "Open",
        applicants: 0,
        new_count: 0,
        match_avg: 0,
        salary: data.salary ?? "",
        description: data.description ?? "",
        tags: [],
      });
      if (error) throw new Error(error.message);
    }
    return { id, shareSlug: `share.${id}.ats.com` };
  });

/** Candidate applies to a requisition (from careers page or a shared link). */
export const applyToJob = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        jobId: z.string().min(1),
        name: z.string().optional(),
        email: z.string().optional(),
        note: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/session.server");
    const userId = await requireUserId();
    const client = await db();
    if (!client) {
      return { ok: false as const, message: "Backend not configured." };
    }

    const { data: job } = await client.from("jobs").select("*").eq("id", data.jobId).maybeSingle();
    if (!job) return { ok: false as const, message: "Job not found." };

    const { data: dupe } = await client
      .from("applications")
      .select("id")
      .eq("candidate_id", userId)
      .eq("job_title", job.title)
      .maybeSingle();
    if (dupe) {
      return { ok: false as const, message: "You already applied to this role." };
    }

    const appId = `APP-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await client.from("applications").insert({
      id: appId,
      candidate_id: userId,
      job_id: job.id,
      job_title: job.title,
      company: job.department || "This company",
      logo: (job.title ?? "AT").slice(0, 2).toUpperCase(),
      applied_on: new Date().toISOString().slice(0, 10),
      stage: "Applied",
      progress: 15,
      match_score: job.match_avg ?? 0,
      next_step: data.note ? "Application note attached" : "Awaiting screening",
    });
    if (error) return { ok: false as const, message: error.message };

    await client
      .from("jobs")
      .update({
        applicants: (job.applicants ?? 0) + 1,
        new_count: (job.new_count ?? 0) + 1,
      })
      .eq("id", job.id);

    return { ok: true as const, id: appId };
  });

/** Records an external application before opening the employer's own form. */
export const trackExternalApplication = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      url: z.string().url(),
      job: z.object({
        title: z.string().default("Untitled role"),
        company: z.string().default("External company"),
        location: z.string().default(""),
        salary: z.string().default(""),
      }),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/session.server");
    const userId = await requireUserId();
    const client = await db();
    if (!client) return { ok: false as const, message: "Backend not configured." };
    const id = `APP-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await client.from("applications").insert({
      id,
      candidate_id: userId,
      job_id: data.url,
      job_title: data.job.title || "Untitled role",
      company: data.job.company || "External company",
      logo: (data.job.company || "EX").slice(0, 2).toUpperCase(),
      applied_on: new Date().toISOString().slice(0, 10),
      stage: "Applied",
      progress: 15,
      match_score: 0,
      next_step: "Complete the employer's application form",
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, id };
  });
