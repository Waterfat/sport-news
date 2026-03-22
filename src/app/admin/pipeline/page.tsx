"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutomationPanel } from "@/components/admin/AutomationPanel";

interface PipelineData {
  pipeline: {
    raw_unprocessed: number;
    plans_pending: number;
    tasks_active: number;
    review_pending: number;
    published_total: number;
  };
}

const stages = [
  { key: "raw_unprocessed", label: "爬蟲素材", icon: "🕷️", desc: "未處理的原始文章" },
  { key: "plans_pending", label: "待規劃", icon: "📋", desc: "等待 AI 分析規劃" },
  { key: "tasks_active", label: "產文中", icon: "✍️", desc: "正在執行的產文任務" },
  { key: "review_pending", label: "待審稿", icon: "🔍", desc: "等待審核的草稿" },
  { key: "published_total", label: "已發布", icon: "✅", desc: "已上線的文章" },
] as const;

function getStageColor(key: string, value: number): string {
  if (key === "published_total") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (value === 0) return "text-gray-400 bg-gray-50 border-gray-200";
  if (key === "raw_unprocessed" && value > 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  if (key === "tasks_active" && value > 0) return "text-blue-600 bg-blue-50 border-blue-200";
  if (key === "review_pending" && value > 5) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-gray-700 bg-white border-gray-200";
}

export default function PipelinePage() {
  const { data, isLoading } = useQuery<PipelineData>({
    queryKey: ["pipeline-status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/pipeline-status");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  const pipeline = data?.pipeline;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管線狀態</h1>
        <p className="text-gray-500 mt-1">內容產出管線各環節的即時狀態</p>
      </div>

      {/* Pipeline flow visualization */}
      <Card>
        <CardHeader>
          <CardTitle>產出管線</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
            {stages.map((stage, i) => {
              const value = pipeline?.[stage.key] ?? 0;
              const colorClass = getStageColor(stage.key, value);

              return (
                <div key={stage.key} className="flex items-center flex-1 min-w-0">
                  <div className={`flex-1 rounded-lg border p-4 text-center ${colorClass}`}>
                    <div className="text-2xl mb-1">{stage.icon}</div>
                    <div className="text-2xl font-bold tabular-nums">{value}</div>
                    <div className="text-xs font-medium mt-1">{stage.label}</div>
                    <div className="text-xs opacity-60 mt-0.5">{stage.desc}</div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="hidden sm:flex items-center px-1 text-gray-300 text-lg shrink-0">→</div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Automation settings (moved from dashboard) */}
      <AutomationPanel />
    </div>
  );
}
