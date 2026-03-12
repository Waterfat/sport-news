"use client";

import { useEffect, useState, useCallback } from "react";
import { SPORTS, type SportKey } from "@/lib/sport-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CrawlSource {
  id: number;
  name: string;
  base_url: string;
  is_active: boolean;
}

interface SportSettings {
  [key: string]: {
    enabled: boolean;
    sources: string[];
    updated_at?: string;
  };
}

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
  const [crawlResult, setCrawlResult] = useState<{
    id: number;
    total: number;
    saved: number;
    duplicate: number;
    filtered: number;
  } | null>(null);

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
        // 從所有球種中移除該來源
        const updatedSettings = { ...settings };
        for (const key of Object.keys(updatedSettings)) {
          const sources = updatedSettings[key].sources.filter((s) => s !== name);
          if (sources.length !== updatedSettings[key].sources.length) {
            updatedSettings[key] = { ...updatedSettings[key], sources };
            fetch("/api/settings/sports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sport_key: key, sources }),
            });
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
        // 如果名稱改了，更新球種設定中的來源名稱
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
              });
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
        <h1 className="text-2xl font-bold">爬蟲設定</h1>
        <p className="text-gray-500 mt-1">
          管理爬蟲來源，並設定每個球種要從哪些網站爬取新聞
        </p>
      </div>

      {/* 爬蟲來源管理 */}
      <Card>
        <CardHeader>
          <CardTitle>爬蟲來源</CardTitle>
          <CardDescription>新增、編輯或刪除新聞爬取的網站來源</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 現有來源列表 */}
          <div className="space-y-2">
            {crawlSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                {editingId === source.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="來源名稱"
                      className="w-[160px]"
                    />
                    <Input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="網址"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => saveEdit(source.id, source.name)}
                    >
                      儲存
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{source.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {source.base_url}
                      </div>
                      {crawlResult?.id === source.id && (
                        <div className="text-xs mt-1">
                          <span className="text-gray-500">爬取 {crawlResult.total} 篇</span>
                          {crawlResult.saved > 0 && <span className="text-green-600">，新增 {crawlResult.saved} 篇</span>}
                          {crawlResult.duplicate > 0 && <span className="text-gray-400">，重複 {crawlResult.duplicate} 篇</span>}
                          {crawlResult.filtered > 0 && <span className="text-orange-500">，過濾 {crawlResult.filtered} 篇</span>}
                          {crawlResult.saved === 0 && crawlResult.duplicate > 0 && <span className="text-gray-400">（無新文章）</span>}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerCrawl(source)}
                      disabled={crawlingId !== null}
                    >
                      {crawlingId === source.id ? "爬取中..." : "立即爬取"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(source.id);
                        setEditName(source.name);
                        setEditUrl(source.base_url);
                      }}
                    >
                      編輯
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => deleteSource(source.id, source.name)}
                    >
                      刪除
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* 新增來源 */}
          <div className="flex items-center gap-3 p-3 border border-dashed rounded-lg">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="來源名稱（例：BBC Sport）"
              className="w-[200px]"
            />
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="網址（例：https://www.bbc.com/sport）"
              className="flex-1"
            />
            <Button
              onClick={addSource}
              disabled={adding || !newName.trim() || !newUrl.trim()}
            >
              {adding ? "新增中..." : "新增"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 球種卡片 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.entries(SPORTS) as [SportKey, (typeof SPORTS)[SportKey]][]).map(
          ([key, sport]) => {
            const isEnabled = settings[key]?.enabled ?? sport.enabled;
            const selectedSources = settings[key]?.sources || [];
            const isUpdating = updating === key;

            return (
              <Card key={key} className={!isEnabled ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{sport.label}</CardTitle>
                      <CardDescription className="mt-1">
                        關鍵字：{sport.keywords.join(", ")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`switch-${key}`} className="sr-only">
                        {sport.label}
                      </Label>
                      <Switch
                        id={`switch-${key}`}
                        checked={isEnabled}
                        onCheckedChange={(checked: boolean) =>
                          toggleSport(key, checked)
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
                            updating === `${key}-${source.name}`;
                          return (
                            <label
                              key={source.id}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  toggleSource(key, source.name, e.target.checked)
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
        )}
      </div>
    </div>
  );
}
