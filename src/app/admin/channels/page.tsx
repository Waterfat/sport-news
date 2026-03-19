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
import type { PublishChannel, ChannelType } from "@/components/admin/channels/channel-types";
import { resetConfigForType } from "@/components/admin/channels/channel-types";
import { ChannelForm } from "@/components/admin/channels/ChannelForm";
import { ChannelCard } from "@/components/admin/channels/ChannelCard";

export default function ChannelsPage() {
  const queryClient = useQueryClient();

  // 新增表單
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ChannelType>("telegram");
  const [newConfig, setNewConfig] = useState<Record<string, string>>({});

  // 刪除確認
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  // 編輯
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<ChannelType>("telegram");
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});

  const { data: channels = [], isLoading } = useQuery<PublishChannel[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/settings/channels");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
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
      if (!data.id) throw new Error(data.error || "新增失敗");
      return data;
    },
    onSuccess: () => {
      setNewName("");
      setNewType("telegram");
      setNewConfig({});
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/settings/channels?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error("delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (channel: PublishChannel) => {
      const res = await fetch("/api/settings/channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: channel.id, is_active: !channel.is_active }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("toggle failed");
      return { id: channel.id, is_active: !channel.is_active };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: async (id: number) => {
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
      if (!data.success) throw new Error("update failed");
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  // 新增表單：切換類型
  function handleNewTypeChange(type: ChannelType) {
    setNewType(type);
    setNewConfig(resetConfigForType(type));
  }

  function addChannel() {
    if (!newName.trim() || !newType) return;
    addMutation.mutate();
  }

  function deleteChannel(id: number, name: string) {
    setDeleteTarget({ id, name });
  }

  function confirmDeleteChannel() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
    setDeleteTarget(null);
  }

  function toggleActive(channel: PublishChannel) {
    toggleActiveMutation.mutate(channel);
  }

  function startEdit(channel: PublishChannel) {
    setEditingId(channel.id);
    setEditName(channel.name);
    setEditType(channel.type as ChannelType);
    setEditConfig({ ...channel.config });
  }

  function saveEdit(id: number) {
    if (!editName.trim()) return;
    saveEditMutation.mutate(id);
  }

  function handleEditTypeChange(type: ChannelType) {
    setEditType(type);
    setEditConfig(resetConfigForType(type));
  }

  if (isLoading) {
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
        adding={addMutation.isPending}
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
            <AlertDialogAction onClick={confirmDeleteChannel}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
