"use client";

import { useEffect, useState, useCallback } from "react";
import { POLLING_INTERVAL_MS, POLLING_TIMEOUT_MS } from "@/lib/constants";
import type { RewriteStatus } from "@/types/rewrite";

interface UseRewritePollingOptions {
  onPollComplete?: () => void;
  onPlanPollComplete?: () => void;
  onProducePollComplete?: () => void;
}

export function useRewritePolling(options: UseRewritePollingOptions = {}) {
  const [rewriteStatus, setRewriteStatus] = useState<RewriteStatus | null>(null);
  const [runningMode, setRunningMode] = useState<string | null>(null);
  const [planTriggering, setPlanTriggering] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const fetchRewriteStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rewrite");
      if (res.ok) {
        const data = await res.json();
        setRewriteStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch rewrite status:", err);
    }
  }, []);

  useEffect(() => {
    fetchRewriteStatus();
  }, [fetchRewriteStatus]);

  const pollRewriteStatus = useCallback(
    (callbacks?: { onComplete?: () => void }) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch("/api/rewrite");
          if (res.ok) {
            const data = await res.json();
            setRewriteStatus(data);
            if (!data.currentTask) {
              clearInterval(interval);
              clearTimeout(timeout);
              setRunningMode(null);
              callbacks?.onComplete?.();
            }
          }
        } catch (err) {
          console.error("Failed to poll rewrite status:", err);
        }
      }, POLLING_INTERVAL_MS);

      const timeout = setTimeout(() => clearInterval(interval), POLLING_TIMEOUT_MS);
    },
    []
  );

  // If page loads with an active task, start polling
  useEffect(() => {
    if (rewriteStatus?.currentTask && !runningMode) {
      setRunningMode("rewrite");
      pollRewriteStatus({
        onComplete: options.onPollComplete,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewriteStatus?.currentTask?.status]);

  const triggerPlan = useCallback(
    async (force = false, clearPlans?: () => void) => {
      setPlanTriggering(true);
      setRunningMode("plan");
      if (force) {
        clearPlans?.();
      }
      try {
        const res = await fetch("/api/rewrite/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.hasExisting) {
            setRunningMode(null);
            setPlanTriggering(false);
            if (confirm("已有規劃存在，是否清除並重新產生？")) {
              triggerPlan(true, clearPlans);
            }
            return;
          }
          alert(data.error || "規劃產生失敗");
          setRunningMode(null);
          return;
        }
        pollRewriteStatus({
          onComplete: options.onPlanPollComplete,
        });
      } catch {
        alert("規劃失敗，請確認監聽器是否正在運行");
        setRunningMode(null);
      } finally {
        setPlanTriggering(false);
      }
    },
    [pollRewriteStatus, options.onPlanPollComplete]
  );

  const triggerProduce = useCallback(
    (afterTrigger?: () => void) => {
      setRunningMode("produce");
      afterTrigger?.();
      pollRewriteStatus({
        onComplete: options.onProducePollComplete,
      });
    },
    [pollRewriteStatus, options.onProducePollComplete]
  );

  return {
    rewriteStatus,
    runningMode,
    planTriggering,
    triggering,
    setRunningMode,
    triggerPlan,
    triggerProduce,
  };
}
