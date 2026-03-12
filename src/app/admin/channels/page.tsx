"use client";

import { useEffect, useState, useCallback } from "react";
import type { PublishChannel, ChannelType } from "@/components/admin/channels/channel-types";
import { resetConfigForType } from "@/components/admin/channels/channel-types";
import { ChannelForm } from "@/components/admin/channels/ChannelForm";
import { ChannelCard } from "@/components/admin/channels/ChannelCard";

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

  // --- API calls ---

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

  // --- Render ---

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

      <ChannelForm
        name={newName}
        type={newType}
        config={newConfig}
        adding={adding}
        onNameChange={setNewName}
        onTypeChange={handleNewTypeChange}
        onConfigChange={setNewConfig}
        onSubmit={addChannel}
      />

      {channels.length === 0 ? (
        <p className="text-gray-400 text-center py-8">尚未建立任何頻道</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isEditing={editingId === channel.id}
              editName={editName}
              editType={editType}
              editConfig={editConfig}
              onEditNameChange={setEditName}
              onEditTypeChange={handleEditTypeChange}
              onEditConfigChange={setEditConfig}
              onToggleActive={toggleActive}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
              onDelete={deleteChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
