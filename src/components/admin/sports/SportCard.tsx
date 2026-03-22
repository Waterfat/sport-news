"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { SportKey } from "@/lib/sport-config";
import type { CrawlSource } from "./types";

interface SportCardProps {
  sportKey: SportKey;
  label: string;
  keywords: readonly string[];
  isEnabled: boolean;
  isUpdating: boolean;
  selectedSources: string[];
  crawlSources: CrawlSource[];
  updating: string | null;
  onToggleSport: (sportKey: SportKey, enabled: boolean) => void;
  onToggleSource: (sportKey: SportKey, sourceName: string, checked: boolean) => void;
}

export function SportCard({
  sportKey,
  label,
  keywords,
  isEnabled,
  isUpdating,
  selectedSources,
  crawlSources,
  updating,
  onToggleSport,
  onToggleSource,
}: SportCardProps) {
  return (
    <Card className={!isEnabled ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{label}</CardTitle>
            <CardDescription className="mt-1">
              關鍵字：{keywords.join(", ")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`switch-${sportKey}`} className="sr-only">
              {label}
            </Label>
            <Switch
              id={`switch-${sportKey}`}
              checked={isEnabled}
              onCheckedChange={(checked: boolean) =>
                onToggleSport(sportKey, checked)
              }
              disabled={isUpdating}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isEnabled
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {isEnabled ? "已啟用" : "未啟用"}
        </span>

        {isEnabled && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-2">
              選擇爬蟲來源
              {selectedSources.length > 0 && (
                <span className="ml-1 text-gray-400">
                  （已選 {selectedSources.length} 個）
                </span>
              )}
            </p>
            <div className="flex flex-col gap-2">
              {crawlSources.map((source) => {
                const isChecked = selectedSources.includes(source.name);
                const isSourceUpdating =
                  updating === `${sportKey}-${source.name}`;
                return (
                  <label
                    key={source.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        onToggleSource(sportKey, source.name, e.target.checked)
                      }
                      disabled={isSourceUpdating}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{source.name}</span>
                    <span className="text-xs text-gray-400 truncate">
                      {source.base_url}
                    </span>
                    {isSourceUpdating && (
                      <span className="text-xs text-gray-400">
                        更新中...
                      </span>
                    )}
                  </label>
                );
              })}
              {crawlSources.length === 0 && (
                <p className="text-xs text-gray-400">
                  尚無爬蟲來源，請先在上方新增
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
