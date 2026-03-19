"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PlanItem, RawArticleInfo } from "@/components/admin/PlansTable";

interface UsePlanManagerOptions {
  onProduceSuccess?: (ids: string[]) => void;
}

export function usePlanManager(options: UsePlanManagerOptions = {}) {
  const queryClient = useQueryClient();
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

  const { data: planData, isLoading: planLoading } = useQuery<{
    plans: PlanItem[];
    rawArticleMap: Record<string, RawArticleInfo>;
    earliestCrawledAt: string | null;
  }>({
    queryKey: ["rewrite-plans"],
    queryFn: async () => {
      const res = await fetch("/api/rewrite/plan");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
  });

  const plans = planData?.plans || [];
  const rawArticleMap = planData?.rawArticleMap || {};
  const earliestCrawledAt = planData?.earliestCrawledAt || null;

  const fetchPlans = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rewrite-plans"] });
  }, [queryClient]);

  const clearPlans = useCallback(() => {
    queryClient.setQueryData(["rewrite-plans"], {
      plans: [],
      rawArticleMap: {},
      earliestCrawledAt: null,
    });
    setSelectedPlanIds(new Set());
  }, [queryClient]);

  const produceMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/rewrite/plan/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "產出失敗");
      return ids;
    },
    onSuccess: (ids) => {
      // Remove produced plans from cache optimistically
      queryClient.setQueryData(["rewrite-plans"], (old: typeof planData) => {
        if (!old) return old;
        return {
          ...old,
          plans: old.plans.filter((p) => !ids.includes(p.id)),
        };
      });
      setSelectedPlanIds(new Set());
    },
    onError: (err) => {
      toast.error(err.message);
      options.onProduceSuccess?.([]); // signal failure to reset runningMode
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/rewrite/plan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      setSelectedPlanIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["rewrite-plans"] });
    },
    onError: () => {
      toast.error("移除失敗");
    },
  });

  const handlePlanProduce = useCallback(
    async (onStartPolling: () => void) => {
      const ids = Array.from(selectedPlanIds);
      if (ids.length === 0) return;
      produceMutation.mutate(ids, {
        onSuccess: () => {
          onStartPolling();
        },
      });
    },
    [selectedPlanIds, produceMutation]
  );

  const handlePlanDelete = useCallback(async () => {
    const ids = Array.from(selectedPlanIds);
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
  }, [selectedPlanIds]);

  const confirmPlanDelete = useCallback(() => {
    if (!pendingDeleteIds) return;
    deleteMutation.mutate(pendingDeleteIds);
    setPendingDeleteIds(null);
  }, [pendingDeleteIds, deleteMutation]);

  const cancelPlanDelete = useCallback(() => {
    setPendingDeleteIds(null);
  }, []);

  const togglePlanSelect = useCallback((id: string) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePlanSelectAll = useCallback(() => {
    setSelectedPlanIds((prev) => {
      if (prev.size === plans.length) {
        return new Set();
      }
      return new Set(plans.map((p) => p.id));
    });
  }, [plans]);

  return {
    plans,
    rawArticleMap,
    earliestCrawledAt,
    selectedPlanIds,
    planLoading,
    pendingDeleteIds,
    fetchPlans,
    clearPlans,
    handlePlanProduce,
    handlePlanDelete,
    confirmPlanDelete,
    cancelPlanDelete,
    togglePlanSelect,
    togglePlanSelectAll,
  };
}
