"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RewriteStatus } from "@/types/rewrite";

interface ProductionPanelProps {
  rewriteStatus: RewriteStatus | null;
  runningMode: string | null;
  planTriggering: boolean;
  plansCount: number;
  onTriggerPlan: () => void;
}

export function ProductionPanel({
  rewriteStatus,
  runningMode,
  planTriggering,
  plansCount,
  onTriggerPlan,
}: ProductionPanelProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
      <Button
        size="sm"
        onClick={onTriggerPlan}
        disabled={planTriggering || !!runningMode}
      >
        {runningMode === "plan" ? "規劃中..." : runningMode === "produce" ? "產出中..." : "規劃"}
      </Button>
      {runningMode && (
        <Badge variant="secondary" className="animate-pulse">
          {runningMode === "plan" ? "規劃產生中" : "文章產出中"}
        </Badge>
      )}
      <span className="text-xs text-gray-400 ml-auto">
        最後執行：{rewriteStatus?.lastCompleted?.completed_at
          ? new Date(rewriteStatus.lastCompleted.completed_at).toLocaleString("zh-TW")
          : "尚未執行"}
      </span>
    </div>
  );
}

/** Loading placeholder shown when plan is generating and no plans exist yet */
export function PlanLoadingCard() {
  return (
    <Card>
      <CardContent className="py-6 text-center text-gray-500 animate-pulse">
        規劃產生中...
      </CardContent>
    </Card>
  );
}
