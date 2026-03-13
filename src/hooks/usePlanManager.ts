"use client";

import { useEffect, useState, useCallback } from "react";
import type { PlanItem, RawArticleInfo } from "@/components/admin/PlansTable";

interface UsePlanManagerOptions {
  onProduceSuccess?: (ids: string[]) => void;
}

export function usePlanManager(options: UsePlanManagerOptions = {}) {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [rawArticleMap, setRawArticleMap] = useState<Record<string, RawArticleInfo>>({});
  const [earliestCrawledAt, setEarliestCrawledAt] = useState<string | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [planLoading, setPlanLoading] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/rewrite/plan");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setRawArticleMap(data.rawArticleMap || {});
        setEarliestCrawledAt(data.earliestCrawledAt || null);
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const clearPlans = useCallback(() => {
    setPlans([]);
    setSelectedPlanIds(new Set());
  }, []);

  const handlePlanProduce = useCallback(
    async (onStartPolling: () => void) => {
      const ids = Array.from(selectedPlanIds);
      if (ids.length === 0) return;
      if (!confirm(`確定要產出 ${ids.length} 篇規劃文章？`)) return;

      setPlanLoading(true);
      try {
        const res = await fetch("/api/rewrite/plan/produce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "產出失敗");
          options.onProduceSuccess?.([]); // signal failure to reset runningMode
          return;
        }
        setPlans((prev) => prev.filter((p) => !ids.includes(p.id)));
        setSelectedPlanIds(new Set());
        onStartPolling();
      } catch {
        alert("產出失敗");
        options.onProduceSuccess?.([]); // signal failure to reset runningMode
      } finally {
        setPlanLoading(false);
      }
    },
    [selectedPlanIds, options]
  );

  const handlePlanDelete = useCallback(async () => {
    const ids = Array.from(selectedPlanIds);
    if (ids.length === 0) return;
    if (!confirm(`確定要移除 ${ids.length} 個規劃項目？`)) return;

    setPlanLoading(true);
    try {
      const res = await fetch("/api/rewrite/plan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setSelectedPlanIds(new Set());
        fetchPlans();
      }
    } catch {
      alert("移除失敗");
    } finally {
      setPlanLoading(false);
    }
  }, [selectedPlanIds, fetchPlans]);

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
    fetchPlans,
    clearPlans,
    handlePlanProduce,
    handlePlanDelete,
    togglePlanSelect,
    togglePlanSelectAll,
  };
}
