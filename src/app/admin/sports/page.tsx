"use client";

import { useEffect, useState, useCallback } from "react";
import { SPORTS, type SportKey } from "@/lib/sport-config";
import { CrawlSourceList } from "@/components/admin/sports/CrawlSourceList";
import { SportCard } from "@/components/admin/sports/SportCard";
import type { CrawlSource, SportSettings, CrawlResult } from "@/components/admin/sports/types";

export default function SportsSettingsPage() {
  const [settings, setSettings] = useState<SportSettings>({});
  const [crawlSources, setCrawlSources] = useState<CrawlSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // 新增來源表單
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);

  // 編輯來源
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // 手動觸發爬蟲
  const [crawlingId, setCrawlingId] = useState<number | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, sourcesRes] = await Promise.all([
        fetch("/api/settings/sports"),
        fetch("/api/settings/sources"),
      ]);
      const settingsData = await settingsRes.json();
      const sourcesData = await sourcesRes.json();

      if (!settingsData.error) setSettings(settingsData);
      if (Array.isArray(sourcesData)) setCrawlSources(sourcesData);
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleSport(sportKey: SportKey, enabled: boolean) {
    setUpdating(sportKey);
    try {
      const res = await fetch("/api/settings/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport_key: sportKey, enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({
          ...prev,
          [sportKey]: { ...prev[sportKey], enabled },
        }));
      }
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setUpdating(null);
    }
  }

  async function toggleSource(sportKey: SportKey, sourceName: string, checked: boolean) {
    const current = settings[sportKey]?.sources || [];
    const newSources = checked
      ? [...current, sourceName]
      : current.filter((s) => s !== sourceName);

    setUpdating(`${sportKey}-${sourceName}`);
    try {
      const res = await fetch("/api/settings/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport_key: sportKey, sources: newSources }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({
          ...prev,
          [sportKey]: { ...prev[sportKey], sources: newSources },
        }));
      }
    } catch (err) {
      console.error("Failed to update sources:", err);
    } finally {
      setUpdating(null);
    }
  }

  async function toggleCrawlImages(id: number, crawl_images: boolean) {
    try {
      const res = await fetch("/api/settings/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, crawl_images }),
      });
      const data = await res.json();
      if (data.success) {
        setCrawlSources((prev) =>
          prev.map((s) => (s.id === id ? { ...s, crawl_images } : s))
        );
      }
    } catch (err) {
      console.error("Failed to toggle crawl_images:", err);
    }
  }

  async function addSource() {
    if (!newName.trim() || !newUrl.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/settings/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), base_url: newUrl.trim() }),
      });
      const data = await res.json();
      if (data.id) {
        setCrawlSources((prev) => [...prev, data]);
        setNewName("");
        setNewUrl("");
      } else {
        alert(data.error || "新增失敗");
      }
    } catch (err) {
      console.error("Failed to add source:", err);
    } finally {
      setAdding(false);
    }
  }

  async function deleteSource(id: number, name: string) {
    if (!confirm(`確定刪除「${name}」？`)) return;
    try {
      const res = await fetch(`/api/settings/sources?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setCrawlSources((prev) => prev.filter((s) => s.id !== id));
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
        setSettings(updatedSettings);
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
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
        alert(`爬蟲失敗：${data.error || "未知錯誤"}`);
      }
    } catch (err) {
      console.error("Crawl failed:", err);
      alert("爬蟲執行失敗");
    } finally {
      setCrawlingId(null);
    }
  }

  async function saveEdit(id: number, oldName: string) {
    if (!editName.trim() || !editUrl.trim()) return;
    try {
      const res = await fetch("/api/settings/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: editName.trim(), base_url: editUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCrawlSources((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, name: editName.trim(), base_url: editUrl.trim() } : s
          )
        );
        if (oldName !== editName.trim()) {
          const updatedSettings = { ...settings };
          for (const key of Object.keys(updatedSettings)) {
            const idx = updatedSettings[key].sources.indexOf(oldName);
            if (idx !== -1) {
              const newSources = [...updatedSettings[key].sources];
              newSources[idx] = editName.trim();
              updatedSettings[key] = { ...updatedSettings[key], sources: newSources };
              fetch("/api/settings/sports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sport_key: key, sources: newSources }),
              }).catch((err) => console.error("Failed to update sport sources after rename:", err));
            }
          }
          setSettings(updatedSettings);
        }
        setEditingId(null);
      }
    } catch (err) {
      console.error("Failed to update:", err);
    }
  }

  async function saveTitlePrompt(sportKey: SportKey, title_prompt: string) {
    try {
      const res = await fetch("/api/settings/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport_key: sportKey, title_prompt }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings((prev) => ({
          ...prev,
          [sportKey]: { ...prev[sportKey], title_prompt },
        }));
      }
    } catch (err) {
      console.error("Failed to save title prompt:", err);
    }
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
        adding={adding}
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
                titlePrompt={settings[key]?.title_prompt || ""}
                crawlSources={crawlSources}
                updating={updating}
                onToggleSport={toggleSport}
                onToggleSource={toggleSource}
                onSaveTitlePrompt={saveTitlePrompt}
              />
            );
          }
        )}
      </div>
    </div>
  );
}
