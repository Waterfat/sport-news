"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

interface AutomationSettings {
  id: number;
  is_auto_mode: boolean;
  article_threshold: number;
  check_interval_minutes: number;
  last_check_at: string | null;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_error: string | null;
  last_run_articles_count: number;
  updated_at: string;
  pending_raw_count: number;
}

export function AutomationPanel() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<AutomationSettings>({
    queryKey: ["automation-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/automation");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    refetchInterval: 30000, // 每 30 秒刷新
  });

  const [threshold, setThreshold] = useState(5);
  const [interval, setInterval] = useState(30);

  useEffect(() => {
    if (settings) {
      setThreshold(settings.article_threshold);
      setInterval(settings.check_interval_minutes);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (updates: Partial<AutomationSettings>) => {
      const res = await fetch("/api/settings/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-settings"] });
    },
  });

  if (isLoading || !settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>自動化設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">載入中...</div>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = () => {
    if (!settings.last_run_status) return null;
    const variants: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" }
    > = {
      success: { label: "成功", variant: "default" },
      failed: { label: "失敗", variant: "destructive" },
      running: { label: "執行中", variant: "secondary" },
    };
    const v = variants[settings.last_run_status] || {
      label: settings.last_run_status,
      variant: "secondary" as const,
    };
    return <Badge variant={v.variant}>{v.label}</Badge>;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("zh-TW");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>自動化設定</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-gray-500">
              {settings.is_auto_mode ? "自動模式" : "手動模式"}
            </span>
            <Switch
              checked={settings.is_auto_mode}
              onCheckedChange={(checked) =>
                mutation.mutate({ is_auto_mode: checked })
              }
              disabled={mutation.isPending}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 設定區 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="threshold" className="text-xs text-gray-500">
              累積門檻（篇）
            </Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={50}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              onBlur={() => {
                if (threshold !== settings.article_threshold && threshold >= 1) {
                  mutation.mutate({ article_threshold: threshold });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && threshold >= 1) {
                  mutation.mutate({ article_threshold: threshold });
                }
              }}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="interval" className="text-xs text-gray-500">
              檢查間隔（分鐘）
            </Label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={1440}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              onBlur={() => {
                if (
                  interval !== settings.check_interval_minutes &&
                  interval >= 1
                ) {
                  mutation.mutate({ check_interval_minutes: interval });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && interval >= 1) {
                  mutation.mutate({ check_interval_minutes: interval });
                }
              }}
              className="h-8"
            />
          </div>
        </div>

        {/* 狀態區 */}
        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">目前待處理素材</span>
            <span className="font-medium">
              {settings.pending_raw_count} 篇
              {settings.pending_raw_count >= settings.article_threshold && (
                <span className="text-green-600 ml-1">（已達門檻）</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">上次檢查</span>
            <span>{formatTime(settings.last_check_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">上次自動執行</span>
            <div className="flex items-center gap-2">
              <span>{formatTime(settings.last_run_at)}</span>
              {statusBadge()}
            </div>
          </div>
          {settings.last_run_articles_count > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">上次產出</span>
              <span>{settings.last_run_articles_count} 篇</span>
            </div>
          )}
          {settings.last_run_error && (
            <div className="text-xs text-red-500 mt-1">
              {settings.last_run_error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
