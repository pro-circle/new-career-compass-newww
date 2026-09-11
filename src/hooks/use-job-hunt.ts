import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  decideJobHuntProposal,
  getJobHunt,
  runJobHunt,
  updateJobHunt,
} from "@/lib/jobhunt.functions";
import {
  DEFAULT_HUNT_SETTINGS,
  type HuntLogEntry,
  type HuntProposal,
  type HuntSettings,
} from "@/lib/jobhunt.types";

const INTERVAL_MS = 90_000;

/**
 * Candidate Job Hunt agent client.
 *
 * Safety: every write path lives on the server.
 */
export function useJobHunt() {
  const [settings, setSettings] = useState<HuntSettings>(DEFAULT_HUNT_SETTINGS);
  const [proposals, setProposals] = useState<HuntProposal[]>([]);
  const [log, setLog] = useState<HuntLogEntry[]>([]);
  const [backendReady, setBackendReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const state = await getJobHunt();
      setSettings(state.settings);
      setProposals(state.proposals);
      setLog(state.log);
      setBackendReady(state.backendReady);
    } catch {
      setBackendReady(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runOnce = useCallback(async (announce = false) => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    try {
      const res = await runJobHunt();
      if (res.applied.length) {
        setLog((prev) => [...res.applied, ...prev].slice(0, 25));
        toast.success(
          res.applied.length === 1
            ? `Applied to ${res.applied[0].jobTitle} at ${res.applied[0].company}`
            : `Agent submitted ${res.applied.length} applications`,
        );
      }
      if (res.proposed.length) {
        setProposals((prev) => [...res.proposed, ...prev]);
        toast.info(
          res.proposed.length === 1
            ? `New match needs your approval: ${res.proposed[0].jobTitle}`
            : `${res.proposed.length} matches need your approval`,
        );
      }
      if (announce && !res.applied.length && !res.proposed.length) {
        toast.message(res.message || "No new matches this pass");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Agent pass failed");
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!settings.enabled) return;
    void runOnce();
    const t = setInterval(() => void runOnce(), INTERVAL_MS);
    return () => clearInterval(t);
  }, [settings.enabled, runOnce]);

  const update = useCallback(
    async (patch: Partial<HuntSettings>) => {
      const previous = settings;
      setSettings({ ...settings, ...patch });
      try {
        const saved = await updateJobHunt({ data: patch });
        setSettings(saved);
        if (patch.enabled !== undefined) {
          toast.success(
            patch.enabled
              ? "Job Hunt agent is on"
              : "Job Hunt agent paused — nothing will be submitted",
          );
        }
      } catch (err) {
        setSettings(previous);
        toast.error(err instanceof Error ? err.message : "Could not save");
      }
    },
    [settings],
  );

  const decide = useCallback(
    async (id: string, decision: "approve" | "deny") => {
      setProposals((prev) => prev.filter((p) => p.id !== id));
      try {
        const res = await decideJobHuntProposal({ data: { id, decision } });
        if (res.ok) toast.success(res.message);
        else toast.error(res.message);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save");
      } finally {
        void refresh();
      }
    },
    [refresh],
  );

  return {
    settings,
    proposals,
    log,
    backendReady,
    loading,
    running,
    update,
    decide,
    runOnce,
    refresh,
  };
}
