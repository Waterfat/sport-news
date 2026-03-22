"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SPORTS, type SportKey } from "@/lib/sport-config";
import { CrawlSourceList } from "@/components/admin/sports/CrawlSourceList";
import { SportCard } from "@/components/admin/sports/SportCard";
import type { CrawlSource, SportSettings, CrawlResult } from "@/components/admin/sports/types";

export default function SportsSettingsPage() {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  // 新增來源表單
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // 編輯來源
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // 刪除確認
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // 手動觸發爬蟲
  const [crawlingId, setCrawlingId] = useState<number | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

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

  const toggleCrawlImagesMutation = useMutation({
    mutationFn: async ({ id, crawl_images }: { id: number; crawl_images: boolean }) => {
      const res = await fetch("/api/settings/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, crawl_images }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("toggle failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crawl-sources"] });
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), base_url: newUrl.trim() }),
      });
      const data = await res.json();
      if (!data.id) throw new Error(data.error || "新增失敗");
      return data;
    },
    onSuccess: () => {
      setNewName("");
      setNewUrl("");
      queryClient.invalidateQueries({ queryKey: ["crawl-sources"] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`/api/settings/sources?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error("delete failed");
      return { id, name };
    },
    onSuccess: ({ name }) => {
      // Also update sport settings that reference this source
      const updatedSettings = { ...settings };
      for (const key of Object.keys(updatedSettings)) {
        const sources = updatedSettings[key].sources.filter((s) => s !== name);
        if (sources.length !== updatedSettings[key].sources.length) {
          updatedSettings[key] = { ...updatedSettings[key], sources };
          fetch("/api/settings/sports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sport_key: key, sources }),
          }).catch((err) => console.error("Failed to update sport sources after delete:", err));
        }
      }
      queryClient.invalidateQueries({ queryKey: ["crawl-sources"] });
      queryClient.invalidateQueries({ queryKey: ["sport-settings"] });
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: async ({ id, oldName }: { id: number; oldName: string }) => {
      const res = await fetch("/api/settings/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim(), base_url: editUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("update failed");
      return { oldName };
    },
    onSuccess: ({ oldName }) => {
      if (oldName !== editName.trim()) {
        // Update sport settings referencing old name
        for (const key of Object.keys(settings)) {
          const idx = settings[key].sources.indexOf(oldName);
          if (idx !== -1) {
            const newSources = [...settings[key].sources];
            newSources[idx] = editName.trim();
            fetch("/api/settings/sports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sport_key: key, sources: newSources }),
            }).catch((err) => console.error("Failed to update sport sources after rename:", err));
          }
        }
        queryClient.invalidateQueries({ queryKey: ["sport-settings"] });
      }
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["crawl-sources"] });
    },
  });


  async function toggleSport(sportKey: SportKey, enabled: boolean) {
    toggleSportMutation.mutate({ sportKey, enabled });
  }

  async function toggleSource(sportKey: SportKey, sourceName: string, checked: boolean) {
    const current = settings[sportKey]?.sources || [];
    const newSources = checked
      ? [...current, sourceName]
      : current.filter((s) => s !== sourceName);
    setUpdating(`${sportKey}-${sourceName}`);
    toggleSourceMutation.mutate({ sportKey, sourceName, newSources });
  }

  async function toggleCrawlImages(id: number, crawl_images: boolean) {
    toggleCrawlImagesMutation.mutate({ id, crawl_images });
  }

  function addSource() {
    if (!newName.trim() || !newUrl.trim()) return;
    addSourceMutation.mutate();
  }

  function deleteSource(id: number, name: string) {
    setDeleteTarget({ id, name });
  }

  function confirmDeleteSource() {
    if (!deleteTarget) return;
    deleteSourceMutation.mutate(deleteTarget);
    setDeleteTarget(null);
  }

  async function triggerCrawl(source: CrawlSource) {
    setCrawlingId(source.id);
    setCrawlResult(null);
    try {
      const res = await fetch("/api/settings/sources/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: source.id }),
      });
      const data = await res.json();
      if (data.success) {
        setCrawlResult({ id: source.id, total: data.total, saved: data.saved, duplicate: data.duplicate || 0, filtered: data.filtered || 0 });
      } else {
        toast.error(`爬蟲失敗：${data.error || "未知錯誤"}`);
      }
    } catch (err) {
      console.error("Crawl failed:", err);
      toast.error("爬蟲執行失敗");
    } finally {
      setCrawlingId(null);
    }
  }

  function saveEdit(id: number, oldName: string) {
    if (!editName.trim() || !editUrl.trim()) return;
    saveEditMutation.mutate({ id, oldName });
  }

  function handleStartEdit(source: CrawlSource) {
    setEditingId(source.id);
    setEditName(source.name);
    setEditUrl(source.base_url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">球種與來源</h1>
        <p className="text-gray-500 mt-1">
          管理爬蟲來源、球種設定與標題風格提詞
        </p>
      </div>

      <CrawlSourceList
        crawlSources={crawlSources}
        editingId={editingId}
        editName={editName}
        editUrl={editUrl}
        crawlingId={crawlingId}
        crawlResult={crawlResult}
        newName={newName}
        newUrl={newUrl}
        adding={addSourceMutation.isPending}
        onEditNameChange={setEditName}
        onEditUrlChange={setEditUrl}
        onNewNameChange={setNewName}
        onNewUrlChange={setNewUrl}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onStartEdit={handleStartEdit}
        onDelete={deleteSource}
        onToggleCrawlImages={toggleCrawlImages}
        onTriggerCrawl={triggerCrawl}
        onAddSource={addSource}
      />

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

      {/* 刪除確認 Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定刪除「{deleteTarget?.name}」？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSource}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
