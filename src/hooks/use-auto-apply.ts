import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getAutoApply,
  runAutoApply,
  setAutoApply,
  type AutoApplyLogEntry,
  type AutoApplySettings,
} from "@/lib/autoapply.functions";

const INTERVAL_MS = 60_000;

/**
 * Candidate auto-apply agent. While enabled (and the tab is open) it asks the
 * server to run one pass every minute: the server picks fresh matches above the
 * score threshold, submits applications, and records an audit log.

 */
export function useAutoApplyAgent() {
  const [settings, setSettings] = useState<AutoApplySettings>({
    enabled: false,
    minScore: 85,
    dailyLimit: 5,
  });
  const [log, setLog] = useState<AutoApplyLogEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAutoApply();
        if (cancelled) return;
        setSettings(res.settings);
        setLog(res.log);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load auto-apply settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runOnce = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRunning(true);
    try {
      const res = await runAutoApply();
      if (res.applied.length) {
        setLog((prev) => [...res.applied, ...prev].slice(0, 25));
        toast.success(
          res.applied.length === 1
            ? `Agent applied to ${res.applied[0].jobTitle} at ${res.applied[0].company}`
            : `Agent submitted ${res.applied.length} applications`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-apply pass failed");
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
    async (patch: Partial<AutoApplySettings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      try {
        await setAutoApply({ data: next });
        if (patch.enabled !== undefined) {
          toast.success(
            patch.enabled
              ? "Auto-apply agent is on — scanning matches every minute"
              : "Auto-apply agent paused",
          );
        }
      } catch (err) {
        setSettings(settings);
        toast.error(err instanceof Error ? err.message : "Could not save settings");
      }
    },
    [settings],
  );

  return { settings, log, running, loading, update, runOnce };
}
