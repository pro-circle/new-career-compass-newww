import { createServerFn } from "@tanstack/react-start";
import type {
  Job,
  Candidate,
  Application,
  JobMatch,
  NotificationItem,
  SkillRadarPoint,
  RoadmapItem,
  AnalyticsMetric,
  FunnelPoint,
  TrendPoint,
  CandidateProfile,
} from "./types";

async function admin() {
  const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
  return getSupabaseAdmin();
}

export const listJobs = createServerFn({ method: "GET" }).handler(async (): Promise<Job[]> => {
  const db = await admin();
  if (!db) return [];
  const { data } = await db.from("jobs").select("*").order("posted_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
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
  }));
});

export const listCandidates = createServerFn({ method: "GET" }).handler(
  async (): Promise<Candidate[]> => {
    const db = await admin();
    if (!db) return [];
    const { data } = await db
      .from("candidates")
      .select("*")
      .order("match_score", { ascending: false });
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      title: r.title,
      company: r.company,
      location: r.location,
      years: r.years,
      matchScore: r.match_score,
      skills: r.skills ?? [],
      strengths: r.strengths ?? [],
      gaps: r.gaps ?? [],
      status: r.status,
      appliedFor: r.applied_for,
      aiInsight: r.ai_insight,
      portfolio: r.portfolio ?? [],
      initials: r.initials,
      email: r.email,
    }));
  },
);

export const listApplications = createServerFn({ method: "GET" }).handler(
  async (): Promise<Application[]> => {
    const db = await admin();
    if (!db) return [];
    const { data } = await db.from("applications").select("*");
    return (data ?? []).map((r: any) => ({
      id: r.id,
      jobTitle: r.job_title,
      company: r.company,
      logo: r.logo,
      appliedOn: r.applied_on,
      stage: r.stage,
      progress: r.progress,
      matchScore: r.match_score,
      nextStep: r.next_step ?? undefined,
    }));
  },
);

export const listJobMatches = createServerFn({ method: "GET" }).handler(
  async (): Promise<JobMatch[]> => {
    const db = await admin();
    if (!db) return [];
    const { data } = await db
      .from("job_matches")
      .select("*")
      .order("match_score", { ascending: false });
    return (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      location: r.location,
      salary: r.salary,
      matchScore: r.match_score,
      postedAgo: r.posted_ago,
      skills: r.skills ?? [],
      reason: r.reason,
      logo: r.logo,
    }));
  },
);

export const listNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<NotificationItem[]> => {
    const db = await admin();
    if (!db) return [];
    const { data } = await db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      time: r.time,
      type: r.type,
    }));
  },
);

export const getSkillRadar = createServerFn({ method: "GET" }).handler(
  async (): Promise<SkillRadarPoint[]> => {
    const db = await admin();
    if (!db) return [];
    const { data } = await db.from("skill_radar").select("*");
    return (data ?? []).map((r: any) => ({
      skill: r.skill,
      you: r.you,
      target: r.target,
    }));
  },
);

export const getRoadmap = createServerFn({ method: "GET" }).handler(
  async (): Promise<RoadmapItem[]> => {
    const db = await admin();
    if (!db) return [];
    const { data } = await db.from("roadmap").select("*").order("ord", { ascending: true });
    return (data ?? []).map((r: any) => ({
      week: r.week,
      title: r.title,
      detail: r.detail,
      done: r.done,
    }));
  },
);

export const getAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    metrics: AnalyticsMetric[];
    funnel: FunnelPoint[];
    trend: TrendPoint[];
  }> => {
    const db = await admin();
    if (!db) return { metrics: [], funnel: [], trend: [] };
    const [m, f, t] = await Promise.all([
      db.from("analytics_metrics").select("*"),
      db.from("funnel").select("*").order("ord", { ascending: true }),
      db.from("hiring_trend").select("*").order("ord", { ascending: true }),
    ]);
    return {
      metrics: (m.data ?? []).map((r: any) => ({
        label: r.label,
        value: r.value,
        delta: r.delta,
        positive: r.positive,
      })),
      funnel: (f.data ?? []).map((r: any) => ({
        stage: r.stage,
        count: r.count,
      })),
      trend: (t.data ?? []).map((r: any) => ({
        month: r.month,
        hires: r.hires,
        applications: r.applications,
      })),
    };
  },
);

export const getCandidateProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<CandidateProfile | null> => {
    const { requireUserId } = await import("@/lib/session.server");
    const userId = await requireUserId();
    const db = await admin();
    if (!db) return null;
    const { data } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      email: data.email ?? "",
      fullName: data.full_name ?? "",
      headline: data.headline ?? "",
      location: data.location ?? "",
      yearsExp: data.years_exp ?? 0,
      targetRoles: data.target_roles ?? [],
      skills: data.skills ?? [],
      links: data.links ?? [],
      resumeText: data.resume_text ?? "",
      resumeJson: data.resume_json ? JSON.stringify(data.resume_json) : null,
      onboarded: !!data.onboarded,
    };
  },
);

export type InterviewRow = {
  id: string;
  candidate: string;
  role: string;
  time: string;
  type: string;
  date: string;
  round: string;
};

export const listInterviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<InterviewRow[]> => {
    const db = await admin();
    if (!db) return [];
    const { data } = await db
      .from("interviews")
      .select("*")
      .order("scheduled_at", { ascending: true });
    return (data ?? []).map((r: any) => {
      const when = r.scheduled_at ? new Date(r.scheduled_at) : null;
      return {
        id: r.id,
        candidate: r.candidate_name ?? "",
        role: r.role ?? "",
        time: when ? when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        type: r.type ?? "",
        date: when ? when.toLocaleDateString([], { month: "short", day: "2-digit" }) : "",
        round: r.round ?? "",
      };
    });
  },
);

export const getInterviewQuestions = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, string[]>> => {
    const empty: Record<string, string[]> = {
      behavioral: [],
      technical: [],
      system: [],
    };
    const db = await admin();
    if (!db) return empty;
    const { data } = await db
      .from("interview_questions")
      .select("*")
      .order("ord", { ascending: true });
    const out: Record<string, string[]> = { ...empty };
    for (const r of (data ?? []) as any[]) {
      const k = r.category ?? "behavioral";
      out[k] = [...(out[k] ?? []), r.question];
    }
    return out;
  },
);
