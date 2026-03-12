"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  SPORT_OPTIONS,
  LEAGUE_OPTIONS,
  type PersonaFormData,
} from "./types";

interface PersonaFormProps {
  editingId: string | null;
  form: PersonaFormData;
  teamInput: string;
  saving: boolean;
  onFormChange: (updater: (f: PersonaFormData) => PersonaFormData) => void;
  onTeamInputChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PersonaForm({
  editingId,
  form,
  teamInput,
  saving,
  onFormChange,
  onTeamInputChange,
  onSave,
  onCancel,
}: PersonaFormProps) {
  const toggleSport = (sport: string) => {
    onFormChange((f) => ({
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
    onFormChange((f) => ({
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
    onFormChange((f) => ({
      ...f,
      specialties: { ...f.specialties, teams: [...f.specialties.teams, team] },
    }));
    onTeamInputChange("");
  };

  const removeTeam = (team: string) => {
    onFormChange((f) => ({
      ...f,
      specialties: {
        ...f.specialties,
        teams: f.specialties.teams.filter((t) => t !== team),
      },
    }));
  };

  return (
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
              onChange={(e) => onFormChange((f) => ({ ...f, name: e.target.value }))}
              placeholder="例如：毒舌球評老王"
            />
          </div>
          <div className="space-y-2">
            <Label>類型</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={form.writer_type === "columnist" ? "default" : "outline"}
                onClick={() => onFormChange((f) => ({ ...f, writer_type: "columnist" }))}
              >
                專欄作家
              </Button>
              <Button
                size="sm"
                variant={form.writer_type === "official" ? "default" : "outline"}
                onClick={() => onFormChange((f) => ({ ...f, writer_type: "official" }))}
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
            onChange={(e) => onFormChange((f) => ({ ...f, description: e.target.value }))}
            placeholder="一句話描述寫手風格"
          />
        </div>

        <div className="space-y-2">
          <Label>寫作風格 Prompt</Label>
          <Textarea
            value={form.style_prompt}
            onChange={(e) => onFormChange((f) => ({ ...f, style_prompt: e.target.value }))}
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
                onChange={(e) => onTeamInputChange(e.target.value)}
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
              onCheckedChange={(v) => onFormChange((f) => ({ ...f, is_active: v }))}
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
              onChange={(e) => onFormChange((f) => ({ ...f, max_articles: parseInt(e.target.value) || 2 }))}
            />
            <Label>篇</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "儲存中..." : "儲存"}
          </Button>
          <Button variant="outline" onClick={onCancel}>取消</Button>
        </div>
      </CardContent>
    </Card>
  );
}
