"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PersonaForm } from "@/components/admin/personas/PersonaForm";
import { PersonaCard } from "@/components/admin/personas/PersonaCard";
import { emptyForm, type Persona, type PersonaFormData } from "@/components/admin/personas/types";

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<PersonaFormData>(emptyForm);
  const [teamInput, setTeamInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPersonas = useCallback(async () => {
    const res = await fetch("/api/personas");
    const data = await res.json();
    setPersonas(data.personas || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPersonas(); }, [fetchPersonas]);

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
    setSaving(true);

    try {
      if (editingId) {
        await fetch("/api/personas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch("/api/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      cancel();
      fetchPersonas();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此寫手？")) return;
    await fetch(`/api/personas?id=${id}`, { method: "DELETE" });
    fetchPersonas();
  };

  const handleToggleActive = async (p: Persona) => {
    await fetch("/api/personas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
    });
    fetchPersonas();
  };

  if (loading) {
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
          saving={saving}
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
    </div>
  );
}
