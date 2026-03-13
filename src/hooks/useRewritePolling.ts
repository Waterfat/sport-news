"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  // Ref to prevent the page-load effect from starting a duplicate polling loop
  // when triggerProduce/triggerPlan has already set runningMode (state update is async)
  const isPollingRef = useRef(false);

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
      isPollingRef.current = true;
      const interval = setInterval(async () => {
        try {
          const res = await fetch("/api/rewrite");
          if (res.ok) {
            const data = await res.json();
            setRewriteStatus(data);
            if (!data.currentTask) {
              clearInterval(interval);
              clearTimeout(timeout);
              isPollingRef.current = false;
              setRunningMode(null);
              callbacks?.onComplete?.();
            }
          }
        } catch (err) {
          console.error("Failed to poll rewrite status:", err);
        }
      }, POLLING_INTERVAL_MS);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        isPollingRef.current = false;
      }, POLLING_TIMEOUT_MS);
    },
    []
  );

  // If page loads with an active task, start polling.
  // Guard with isPollingRef to prevent a duplicate loop when triggerProduce/triggerPlan
  // has already called pollRewriteStatus synchronously but setRunningMode(state) hasn't
  // re-rendered yet (stale closure race condition).
  useEffect(() => {
    if (rewriteStatus?.currentTask && !runningMode && !isPollingRef.current) {
      setRunningMode("rewrite");
      pollRewriteStatus({
        onComplete: options.onPollComplete,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewriteStatus?.currentTask?.status]);

  const triggerPlan = useCallback(
    async (force = false, clearPlans?: () => void) => {
      isPollingRef.current = true;
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
            isPollingRef.current = false;
            setRunningMode(null);
            setPlanTriggering(false);
            if (confirm("已有規劃存在，是否清除並重新產生？")) {
              triggerPlan(true, clearPlans);
            }
            return;
          }
          alert(data.error || "規劃產生失敗");
          isPollingRef.current = false;
          setRunningMode(null);
          return;
        }
        pollRewriteStatus({
          onComplete: options.onPlanPollComplete,
        });
      } catch {
        alert("規劃失敗，請確認監聽器是否正在運行");
        isPollingRef.current = false;
        setRunningMode(null);
      } finally {
        setPlanTriggering(false);
      }
    },
    [pollRewriteStatus, options.onPlanPollComplete]
  );

  const triggerProduce = useCallback(
    (afterTrigger?: () => void) => {
      isPollingRef.current = true;
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
