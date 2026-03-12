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
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              onClick={onTriggerPlan}
              disabled={planTriggering || !!runningMode}
            >
              {runningMode === "plan" ? "規劃中..." : runningMode === "produce" ? "產出中..." : "規劃"}
            </Button>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div>
                <span className="text-gray-400">最後執行：</span>
                {rewriteStatus?.lastCompleted?.completed_at
                  ? new Date(rewriteStatus.lastCompleted.completed_at).toLocaleString("zh-TW")
                  : "尚未執行"}
              </div>
              <div className="border-l pl-4">
                <span className="text-gray-400">上次產出：</span>
                {rewriteStatus?.lastCompleted
                  ? `${rewriteStatus.lastCompleted.articles_generated} 篇`
                  : "-"}
              </div>
              <div className="border-l pl-4">
                <span className="text-gray-400">待處理新文章：</span>
                <span className="font-medium text-gray-700">
                  {rewriteStatus?.newArticleCount ?? "-"}
                </span>
              </div>
            </div>
          </div>
          {runningMode && (
            <Badge variant="secondary" className="animate-pulse">
              {runningMode === "plan" ? "規劃產生中" : runningMode === "produce" ? "文章產出中" : "文章產出中"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
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
