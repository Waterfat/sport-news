"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TYPE_LABELS, type Persona } from "./types";

interface PersonaCardProps {
  persona: Persona;
  onEdit: (persona: Persona) => void;
  onDelete: (id: string) => void;
  onToggleActive: (persona: Persona) => void;
}

export function PersonaCard({
  persona,
  onEdit,
  onDelete,
  onToggleActive,
}: PersonaCardProps) {
  return (
    <Card className={!persona.is_active ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{persona.name}</CardTitle>
            <Badge variant="outline">
              {TYPE_LABELS[persona.writer_type] || persona.writer_type}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              上限 {persona.max_articles ?? 2} 篇
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={persona.is_active}
              onCheckedChange={() => onToggleActive(persona)}
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
          <Button size="sm" variant="outline" onClick={() => onEdit(persona)}>
            編輯
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(persona.id)}
          >
            刪除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
