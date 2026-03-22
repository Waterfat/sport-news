"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SPORTS, type SportKey } from "@/lib/sport-config";
import { SportCard } from "@/components/admin/sports/SportCard";
import type { CrawlSource, SportSettings } from "@/components/admin/sports/types";

export default function SportsSettingsPage() {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: settings = {} as SportSettings, isLoading: settingsLoading } = useQuery<SportSettings>({
    queryKey: ["sport-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/sports");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      return data.error ? {} : data;
    },
  });

  const { data: crawlSources = [], isLoading: sourcesLoading } = useQuery<CrawlSource[]>({
    queryKey: ["crawl-sources"],
    queryFn: async () => {
      const res = await fetch("/api/settings/sources");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const loading = settingsLoading || sourcesLoading;

  const toggleSportMutation = useMutation({
    mutationFn: async ({ sportKey, enabled }: { sportKey: SportKey; enabled: boolean }) => {
      setUpdating(sportKey);
      const res = await fetch("/api/settings/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport_key: sportKey, enabled }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sport-settings"] });
    },
    onSettled: () => {
      setUpdating(null);
    },
  });

  const toggleSourceMutation = useMutation({
    mutationFn: async ({ sportKey, newSources }: { sportKey: SportKey; sourceName: string; newSources: string[] }) => {
      setUpdating(`${sportKey}-${newSources}`);
      const res = await fetch("/api/settings/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport_key: sportKey, sources: newSources }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("update failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sport-settings"] });
    },
    onSettled: () => {
      setUpdating(null);
    },
  });

  function toggleSport(sportKey: SportKey, enabled: boolean) {
    toggleSportMutation.mutate({ sportKey, enabled });
  }

  function toggleSource(sportKey: SportKey, sourceName: string, checked: boolean) {
    const current = settings[sportKey]?.sources || [];
    const newSources = checked
      ? [...current, sourceName]
      : current.filter((s) => s !== sourceName);
    setUpdating(`${sportKey}-${sourceName}`);
    toggleSourceMutation.mutate({ sportKey, sourceName, newSources });
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">球種分類</h1>
        <p className="text-gray-500 mt-1">管理運動項目的啟用狀態與爬蟲來源對應</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.entries(SPORTS) as [SportKey, (typeof SPORTS)[SportKey]][]).map(
          ([key, sport]) => {
            const isEnabled = settings[key]?.enabled ?? sport.enabled;
            const selectedSources = settings[key]?.sources || [];
            const isUpdating = updating === key;

            return (
              <SportCard
                key={key}
                sportKey={key}
                label={sport.label}
                keywords={sport.keywords}
                isEnabled={isEnabled}
                isUpdating={isUpdating}
                selectedSources={selectedSources}
                crawlSources={crawlSources}
                updating={updating}
                onToggleSport={toggleSport}
                onToggleSource={toggleSource}
              />
            );
          }
        )}
      </div>
    </div>
  );
}
