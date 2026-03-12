"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- 型別定義 ---

interface PublishChannel {
  id: number;
  name: string;
  type: string;
  config: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

type ChannelType = "facebook" | "telegram" | "x_twitter" | "line" | "custom";

const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "x_twitter", label: "X/Twitter" },
  { value: "line", label: "LINE" },
  { value: "custom", label: "自訂" },
];

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  telegram: "Telegram",
  x_twitter: "X/Twitter",
  line: "LINE",
  custom: "自訂",
};

const CHANNEL_CONFIG_FIELDS: Record<string, { key: string; label: string }[]> = {
  facebook: [
    { key: "page_id", label: "Page ID" },
    { key: "access_token", label: "Access Token" },
  ],
  telegram: [
    { key: "bot_token", label: "Bot Token" },
    { key: "chat_id", label: "Chat ID" },
  ],
  x_twitter: [
    { key: "api_key", label: "API Key" },
    { key: "api_secret", label: "API Secret" },
    { key: "access_token", label: "Access Token" },
    { key: "access_token_secret", label: "Access Token Secret" },
  ],
  line: [
    { key: "channel_access_token", label: "Channel Access Token" },
  ],
};

// --- 遮罩工具 ---

function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 6) return "***";
  return value.slice(0, 3) + "***" + value.slice(-3);
}

// --- 自訂欄位元件 ---

function CustomConfigEditor({
  config,
  onChange,
}: {
  config: Record<string, string>;
  onChange: (config: Record<string, string>) => void;
}) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const entries = Object.entries(config);

  function addEntry() {
    if (!newKey.trim()) return;
    onChange({ ...config, [newKey.trim()]: newValue });
    setNewKey("");
    setNewValue("");
  }

  function removeEntry(key: string) {
    const next = { ...config };
    delete next[key];
    onChange(next);
  }

  function updateValue(key: string, value: string) {
    onChange({ ...config, [key]: value });
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <Input value={key} disabled className="w-[140px] bg-gray-50" />
          <Input
            value={val}
            onChange={(e) => updateValue(key, e.target.value)}
            className="flex-1"
            placeholder="值"
          />
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={() => removeEntry(key)}
          >
            移除
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="鍵 (Key)"
          className="w-[140px]"
        />
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="值 (Value)"
          className="flex-1"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={addEntry}
          disabled={!newKey.trim()}
        >
          新增
        </Button>
      </div>
    </div>
  );
}

// --- 主頁面 ---

export default function ChannelsPage() {
  const [channels, setChannels] = useState<PublishChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // 新增表單
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ChannelType>("telegram");
  const [newConfig, setNewConfig] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);

  // 編輯
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<ChannelType>("telegram");
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/channels");
      const data = await res.json();
      if (Array.isArray(data)) setChannels(data);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // 當選擇的類型變更時，重設 config 欄位
  function resetConfigForType(type: ChannelType): Record<string, string> {
    const fields = CHANNEL_CONFIG_FIELDS[type];
    if (!fields) return {};
    const config: Record<string, string> = {};
    for (const field of fields) {
      config[field.key] = "";
    }
    return config;
  }

  // 新增表單：切換類型
  function handleNewTypeChange(type: ChannelType) {
    setNewType(type);
    setNewConfig(resetConfigForType(type));
  }

  // 新增頻道
  async function addChannel() {
    if (!newName.trim() || !newType) return;
    setAdding(true);
    try {
      const res = await fetch("/api/settings/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          config: newConfig,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setChannels((prev) => [...prev, data]);
        setNewName("");
        setNewType("telegram");
        setNewConfig({});
      } else {
        alert(data.error || "新增失敗");
      }
    } catch (err) {
      console.error("Failed to add channel:", err);
    } finally {
      setAdding(false);
    }
  }

  // 刪除頻道
  async function deleteChannel(id: number, name: string) {
    if (!confirm(`確定刪除「${name}」？`)) return;
    try {
      const res = await fetch(`/api/settings/channels?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setChannels((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete channel:", err);
    }
  }

  // 切換啟用狀態
  async function toggleActive(channel: PublishChannel) {
    const newActive = !channel.is_active;
    try {
      const res = await fetch("/api/settings/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channel.id, is_active: newActive }),
      });
      const data = await res.json();
      if (data.success) {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === channel.id ? { ...c, is_active: newActive } : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle channel:", err);
    }
  }

  // 開始編輯
  function startEdit(channel: PublishChannel) {
    setEditingId(channel.id);
    setEditName(channel.name);
    setEditType(channel.type as ChannelType);
    setEditConfig({ ...channel.config });
  }

  // 儲存編輯
  async function saveEdit(id: number) {
    if (!editName.trim()) return;
    try {
      const res = await fetch("/api/settings/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          type: editType,
          config: editConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  name: editName.trim(),
                  type: editType,
                  config: editConfig,
                }
              : c
          )
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error("Failed to update channel:", err);
    }
  }

  // 編輯表單：切換類型
  function handleEditTypeChange(type: ChannelType) {
    setEditType(type);
    setEditConfig(resetConfigForType(type));
  }

  // --- 渲染 config 欄位（新增/編輯共用） ---

  function renderConfigFields(
    type: ChannelType,
    config: Record<string, string>,
    setConfig: (config: Record<string, string>) => void
  ) {
    if (type === "custom") {
      return <CustomConfigEditor config={config} onChange={setConfig} />;
    }

    const fields = CHANNEL_CONFIG_FIELDS[type];
    if (!fields) return null;

    return (
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center gap-2">
            <Label className="w-[160px] text-sm text-gray-600 shrink-0">
              {field.label}
            </Label>
            <Input
              value={config[field.key] || ""}
              onChange={(e) =>
                setConfig({ ...config, [field.key]: e.target.value })
              }
              placeholder={field.label}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    );
  }

  // --- 渲染 config 顯示（唯讀，遮罩） ---

  function renderConfigDisplay(config: Record<string, string>) {
    const entries = Object.entries(config);
    if (entries.length === 0) {
      return (
        <p className="text-xs text-gray-400">尚未設定任何參數</p>
      );
    }
    return (
      <div className="space-y-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 font-mono text-xs w-[160px] shrink-0">
              {key}
            </span>
            <span className="text-gray-700 font-mono text-xs">
              {maskValue(value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // --- 類型對應顏色 ---

  function typeBadgeColor(type: string): string {
    switch (type) {
      case "facebook":
        return "bg-blue-100 text-blue-800";
      case "telegram":
        return "bg-sky-100 text-sky-800";
      case "x_twitter":
        return "bg-gray-800 text-white";
      case "line":
        return "bg-green-100 text-green-800";
      default:
        return "bg-purple-100 text-purple-800";
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
        <h1 className="text-2xl font-bold">發布頻道</h1>
        <p className="text-gray-500 mt-1">
          管理新聞發布的社群媒體與通訊頻道
        </p>
      </div>

      {/* 新增頻道表單 */}
      <Card>
        <CardHeader>
          <CardTitle>新增頻道</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-[200px]">
              <Label className="text-sm text-gray-600 mb-1 block">
                頻道名稱
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：官方 Telegram 頻道"
              />
            </div>
            <div className="w-[180px]">
              <Label className="text-sm text-gray-600 mb-1 block">
                頻道類型
              </Label>
              <Select
                value={newType}
                onValueChange={(v) =>
                  handleNewTypeChange(v as ChannelType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm text-gray-600 mb-2 block">
              設定參數
            </Label>
            {renderConfigFields(newType, newConfig, setNewConfig)}
          </div>

          <Button
            onClick={addChannel}
            disabled={adding || !newName.trim()}
          >
            {adding ? "新增中..." : "新增頻道"}
          </Button>
        </CardContent>
      </Card>

      {/* 頻道列表 */}
      {channels.length === 0 ? (
        <p className="text-gray-400 text-center py-8">尚未建立任何頻道</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map((channel) => {
            const isEditing = editingId === channel.id;

            return (
              <Card
                key={channel.id}
                className={!channel.is_active ? "opacity-60" : ""}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-[180px]"
                        />
                      ) : (
                        <CardTitle className="truncate">
                          {channel.name}
                        </CardTitle>
                      )}
                      {isEditing ? (
                        <Select
                          value={editType}
                          onValueChange={(v) =>
                            handleEditTypeChange(v as ChannelType)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHANNEL_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          className={typeBadgeColor(channel.type)}
                        >
                          {CHANNEL_TYPE_LABELS[channel.type] ||
                            channel.type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label
                        htmlFor={`active-${channel.id}`}
                        className="sr-only"
                      >
                        啟用
                      </Label>
                      <Switch
                        id={`active-${channel.id}`}
                        checked={channel.is_active}
                        onCheckedChange={() => toggleActive(channel)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isEditing ? (
                    <>
                      {renderConfigFields(
                        editType,
                        editConfig,
                        setEditConfig
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(channel.id)}
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
                      </div>
                    </>
                  ) : (
                    <>
                      {renderConfigDisplay(channel.config)}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(channel)}
                        >
                          編輯
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() =>
                            deleteChannel(channel.id, channel.name)
                          }
                        >
                          刪除
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
