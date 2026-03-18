"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { POLLING_INTERVAL_MS, POLLING_TIMEOUT_MS } from "@/lib/constants";
import type { RewriteStatus } from "@/types/rewrite";

interface UseRewritePollingOptions {
  onPollComplete?: () => void;
  onPlanPollComplete?: () => void;
  onProducePollComplete?: () => void;
}

export function useRewritePolling(options: UseRewritePollingOptions = {}) {
  const queryClient = useQueryClient();
  const [rewriteStatus, setRewriteStatus] = useState<RewriteStatus | null>(null);
  const [runningMode, setRunningMode] = useState<string | null>(null);
  const [planTriggering, setPlanTriggering] = useState(false);
  const [triggering] = useState(false);
  // Ref to prevent the page-load effect from starting a duplicate polling loop
  const isPollingRef = useRef(false);

  // Initial fetch using useQuery
  const { data: initialStatus } = useQuery<RewriteStatus>({
    queryKey: ["rewrite-status"],
    queryFn: async () => {
      const res = await fetch("/api/rewrite");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    // Only fetch once on mount; polling is handled manually
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // Sync query data to local state on initial load
  useEffect(() => {
    if (initialStatus) {
      setRewriteStatus(initialStatus);
    }
  }, [initialStatus]);

  const pollRewriteStatus = useCallback(
    (callbacks?: { onComplete?: () => void }) => {
      isPollingRef.current = true;
      const interval = setInterval(async () => {
        try {
          const res = await fetch("/api/rewrite");
          if (res.ok) {
            const data = await res.json();
            setRewriteStatus(data);
            // Also update the query cache so other consumers see the latest
            queryClient.setQueryData(["rewrite-status"], data);
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
    [queryClient]
  );

  // If page loads with an active task, start polling.
  useEffect(() => {
    if (rewriteStatus?.currentTask && !runningMode && !isPollingRef.current) {
      setRunningMode("rewrite");
      pollRewriteStatus({
        onComplete: options.onPollComplete,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewriteStatus?.currentTask?.status]);

  const triggerPlanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rewrite/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "規劃產生失敗");
      }
      return data;
    },
  });

  const triggerPlan = useCallback(
    async (clearPlans?: () => void) => {
      isPollingRef.current = true;
      setPlanTriggering(true);
      setRunningMode("plan");
      clearPlans?.();
      try {
        await triggerPlanMutation.mutateAsync();
        pollRewriteStatus({
          onComplete: options.onPlanPollComplete,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "規劃失敗，請確認監聽器是否正在運行";
        alert(message);
        isPollingRef.current = false;
        setRunningMode(null);
      } finally {
        setPlanTriggering(false);
      }
    },
    [triggerPlanMutation, pollRewriteStatus, options.onPlanPollComplete]
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
