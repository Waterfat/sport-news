"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface Specialties {
  sports: string[];
  leagues: string[];
  teams: string[];
}

interface Persona {
  id: string;
  name: string;
  style_prompt: string;
  description: string | null;
  is_active: boolean;
  writer_type: string;
  specialties: Specialties;
  max_articles: number;
  created_at: string;
}

const SPORT_OPTIONS = ["籃球", "棒球", "美式足球", "足球", "冰球", "網球", "綜合"];
const LEAGUE_OPTIONS = ["NBA", "MLB", "NFL", "MLS", "英超", "西甲", "德甲", "義甲", "法甲", "歐冠", "NHL", "中職", "日職"];

const emptyForm = {
  name: "",
  description: "",
  style_prompt: "",
  is_active: true,
  writer_type: "columnist" as string,
  specialties: { sports: [], leagues: [], teams: [] } as Specialties,
  max_articles: 2,
};

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
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

  const toggleSport = (sport: string) => {
    setForm((f) => ({
      ...f,
      specialties: {
        ...f.specialties,
        sports: f.specialties.sports.includes(sport)
          ? f.specialties.sports.filter((s) => s !== sport)
          : [...f.specialties.sports, sport],
      },
    }));
  };

  const toggleLeague = (league: string) => {
    setForm((f) => ({
      ...f,
      specialties: {
        ...f.specialties,
        leagues: f.specialties.leagues.includes(league)
          ? f.specialties.leagues.filter((l) => l !== league)
          : [...f.specialties.leagues, league],
      },
    }));
  };

  const addTeam = () => {
    const team = teamInput.trim();
    if (!team || form.specialties.teams.includes(team)) return;
    setForm((f) => ({
      ...f,
      specialties: { ...f.specialties, teams: [...f.specialties.teams, team] },
    }));
    setTeamInput("");
  };

  const removeTeam = (team: string) => {
    setForm((f) => ({
      ...f,
      specialties: {
        ...f.specialties,
        teams: f.specialties.teams.filter((t) => t !== team),
      },
    }));
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

  const typeLabels: Record<string, string> = {
    columnist: "專欄作家",
    official: "官方戰報",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">寫手管理</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={startCreate}>新增寫手</Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "編輯寫手" : "新增寫手"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>名稱</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如：毒舌球評老王"
                />
              </div>
              <div className="space-y-2">
                <Label>類型</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={form.writer_type === "columnist" ? "default" : "outline"}
                    onClick={() => setForm((f) => ({ ...f, writer_type: "columnist" }))}
                  >
                    專欄作家
                  </Button>
                  <Button
                    size="sm"
                    variant={form.writer_type === "official" ? "default" : "outline"}
                    onClick={() => setForm((f) => ({ ...f, writer_type: "official" }))}
                  >
                    官方戰報
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>簡介</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="一句話描述寫手風格"
              />
            </div>

            <div className="space-y-2">
              <Label>寫作風格 Prompt</Label>
              <Textarea
                value={form.style_prompt}
                onChange={(e) => setForm((f) => ({ ...f, style_prompt: e.target.value }))}
                rows={5}
                placeholder="描述這個寫手的寫作風格、語氣、特色..."
              />
            </div>

            {/* Specialties */}
            <div className="space-y-3 border rounded-lg p-4">
              <Label className="text-base font-semibold">專長領域</Label>

              <div className="space-y-2">
                <Label className="text-sm text-gray-500">擅長球種</Label>
                <div className="flex flex-wrap gap-2">
                  {SPORT_OPTIONS.map((sport) => (
                    <Button
                      key={sport}
                      size="sm"
                      variant={form.specialties.sports.includes(sport) ? "default" : "outline"}
                      onClick={() => toggleSport(sport)}
                    >
                      {sport}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-500">擅長聯盟</Label>
                <div className="flex flex-wrap gap-2">
                  {LEAGUE_OPTIONS.map((league) => (
                    <Button
                      key={league}
                      size="sm"
                      variant={form.specialties.leagues.includes(league) ? "default" : "outline"}
                      onClick={() => toggleLeague(league)}
                    >
                      {league}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-500">擅長球隊</Label>
                <div className="flex gap-2">
                  <Input
                    value={teamInput}
                    onChange={(e) => setTeamInput(e.target.value)}
                    placeholder="輸入球隊名稱"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTeam())}
                  />
                  <Button size="sm" variant="outline" onClick={addTeam}>加入</Button>
                </div>
                {form.specialties.teams.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.specialties.teams.map((team) => (
                      <Badge key={team} variant="secondary" className="cursor-pointer" onClick={() => removeTeam(team)}>
                        {team} x
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label>啟用</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>每次最多產出</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  className="w-20"
                  value={form.max_articles}
                  onChange={(e) => setForm((f) => ({ ...f, max_articles: parseInt(e.target.value) || 2 }))}
                />
                <Label>篇</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "儲存中..." : "儲存"}
              </Button>
              <Button variant="outline" onClick={cancel}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persona List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map((persona) => (
          <Card key={persona.id} className={!persona.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{persona.name}</CardTitle>
                  <Badge variant="outline">
                    {typeLabels[persona.writer_type] || persona.writer_type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    上限 {persona.max_articles ?? 2} 篇
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={persona.is_active}
                    onCheckedChange={() => handleToggleActive(persona)}
                  />
                </div>
              </div>
              {persona.description && (
                <p className="text-sm text-gray-500">{persona.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Specialties display */}
              {persona.specialties && (
                <div className="space-y-2">
                  {persona.specialties.sports?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-400 mr-1">球種:</span>
                      {persona.specialties.sports.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {persona.specialties.leagues?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-400 mr-1">聯盟:</span>
                      {persona.specialties.leagues.map((l) => (
                        <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
                      ))}
                    </div>
                  )}
                  {persona.specialties.teams?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-gray-400 mr-1">球隊:</span>
                      {persona.specialties.teams.map((t) => (
                        <Badge key={t} className="text-xs bg-blue-100 text-blue-800">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">寫作風格</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                  {persona.style_prompt}
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(persona)}>
                  編輯
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(persona.id)}
                >
                  刪除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
