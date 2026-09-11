import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EMPTY_DATASET, type Dataset } from "@/lib/dataset";
import {
  listJobs,
  listCandidates,
  listApplications,
  listJobMatches,
  listNotifications,
  getSkillRadar,
  getRoadmap,
  getAnalytics,
  listInterviews,
  getInterviewQuestions,
} from "@/lib/data.functions";

/**
 * Single source of truth for page data.
 *
 * Every array comes from Supabase through the server functions in
 * `src/lib/data.functions.ts`.
 */
export function useDataset(): Dataset & { loading: boolean } {
  const [live, setLive] = useState<Dataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [
          jobs,
          candidates,
          applications,
          jobMatches,
          notifications,
          skillRadar,
          roadmap,
          analytics,
          interviews,
          interviewQuestions,
        ] = await Promise.all([
          listJobs(),
          listCandidates(),
          listApplications(),
          listJobMatches(),
          listNotifications(),
          getSkillRadar(),
          getRoadmap(),
          getAnalytics(),
          listInterviews(),
          getInterviewQuestions(),
        ]);
        if (cancelled) return;
        setLive({
          ...EMPTY_DATASET,
          jobs,
          candidates,
          applications,
          jobMatches,
          notifications,
          skillRadar,
          roadmap,
          analyticsMetrics: analytics.metrics,
          funnel: analytics.funnel,
          trend: analytics.trend,
          interviews,
          interviewQuestions,
          // Real inbox entries are derived from the notifications table.
          inbox: notifications.map((n) => ({
            id: n.id,
            type: (["match", "message", "interview", "offer", "insight"] as const).includes(
              n.type as "match",
            )
              ? (n.type as "match")
              : "insight",
            title: n.title,
            desc: "",
            when: n.time,
            unread: true,
          })),
        });
      } catch (error) {
        if (!cancelled) {
          setLive(EMPTY_DATASET);
          toast.error(error instanceof Error ? error.message : "Could not load workspace data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...live, loading };
}
