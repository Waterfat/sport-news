"use client";

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
import { CHANNEL_TYPE_LABELS } from "@/lib/constants";
import { CHANNEL_TYPES, typeBadgeColor } from "./channel-types";
import type { PublishChannel, ChannelType } from "./channel-types";
import { ChannelConfigFields } from "./ChannelConfigFields";
import { ChannelConfigDisplay } from "./ChannelConfigFields";

interface ChannelCardProps {
  channel: PublishChannel;
  isEditing: boolean;
  editName: string;
  editType: ChannelType;
  editConfig: Record<string, string>;
  onEditNameChange: (name: string) => void;
  onEditTypeChange: (type: ChannelType) => void;
  onEditConfigChange: (config: Record<string, string>) => void;
  onToggleActive: (channel: PublishChannel) => void;
  onStartEdit: (channel: PublishChannel) => void;
  onSaveEdit: (id: number) => void;
  onCancelEdit: () => void;
  onDelete: (id: number, name: string) => void;
}

export function ChannelCard({
  channel,
  isEditing,
  editName,
  editType,
  editConfig,
  onEditNameChange,
  onEditTypeChange,
  onEditConfigChange,
  onToggleActive,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: ChannelCardProps) {
  return (
    <Card className={!channel.is_active ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isEditing ? (
              <Input
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
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
                onValueChange={(v) => onEditTypeChange(v as ChannelType)}
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
              <Badge className={typeBadgeColor(channel.type)}>
                {CHANNEL_TYPE_LABELS[channel.type] || channel.type}
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
              onCheckedChange={() => onToggleActive(channel)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            <ChannelConfigFields
              type={editType}
              config={editConfig}
              onConfigChange={onEditConfigChange}
            />
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => onSaveEdit(channel.id)}
              >
                儲存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancelEdit}
              >
                取消
              </Button>
            </div>
          </>
        ) : (
          <>
            <ChannelConfigDisplay config={channel.config} />
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStartEdit(channel)}
              >
                編輯
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(channel.id, channel.name)}
              >
                刪除
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
