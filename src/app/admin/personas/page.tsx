"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { PersonaForm } from "@/components/admin/personas/PersonaForm";
import { PersonaCard } from "@/components/admin/personas/PersonaCard";
import { emptyForm, type Persona, type PersonaFormData } from "@/components/admin/personas/types";

export default function PersonasPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<PersonaFormData>(emptyForm);
  const [teamInput, setTeamInput] = useState("");

  const { data, isLoading } = useQuery<{ personas: Persona[] }>({
    queryKey: ["personas"],
    queryFn: async () => {
      const res = await fetch("/api/personas");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
  });

  const personas = data?.personas || [];

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: string } & PersonaFormData) => {
      const { id, ...body } = payload;
      const res = await fetch("/api/personas", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id, ...body } : body),
      });
      if (!res.ok) throw new Error("save failed");
    },
    onSuccess: () => {
      cancel();
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/personas?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (p: Persona) => {
      const res = await fetch("/api/personas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
      });
      if (!res.ok) throw new Error("toggle failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personas"] });
    },
  });

  const startEdit = (p: Persona) => {
    setEditingId(p.id);
    setShowCreate(false);
    setForm({
      name: p.name,
      description: p.description || "",
      style_prompt: p.style_prompt,
      is_active: p.is_active,
      writer_type: p.writer_type || "columnist",
      specialties: p.specialties || { sports: [], leagues: [], teams: [] },
      max_articles: p.max_articles ?? 2,
      avatar_url: p.avatar_url || "",
      specialty_tags: p.specialty_tags?.join(", ") || "",
    });
    setTeamInput("");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const startCreate = () => {
    setEditingId(null);
    setShowCreate(true);
    setForm(emptyForm);
    setTeamInput("");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const cancel = () => {
    setEditingId(null);
    setShowCreate(false);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name || !form.style_prompt) return;
    if (editingId) {
      saveMutation.mutate({ id: editingId, ...form });
    } else {
      saveMutation.mutate(form);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget);
    setDeleteTarget(null);
  };

  const handleToggleActive = async (p: Persona) => {
    toggleActiveMutation.mutate(p);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">寫手管理</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={startCreate}>新增寫手</Button>
        </div>
      </div>

      {(showCreate || editingId) && (
        <PersonaForm
          editingId={editingId}
          form={form}
          teamInput={teamInput}
          saving={saveMutation.isPending}
          onFormChange={(updater) => setForm(updater)}
          onTeamInputChange={setTeamInput}
          onSave={handleSave}
          onCancel={cancel}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            onEdit={startEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>

      {/* 刪除確認 Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除此寫手？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
