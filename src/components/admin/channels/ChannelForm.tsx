"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHANNEL_TYPES } from "./channel-types";
import type { ChannelType } from "./channel-types";
import { ChannelConfigFields } from "./ChannelConfigFields";

interface ChannelFormProps {
  name: string;
  type: ChannelType;
  config: Record<string, string>;
  adding: boolean;
  onNameChange: (name: string) => void;
  onTypeChange: (type: ChannelType) => void;
  onConfigChange: (config: Record<string, string>) => void;
  onSubmit: () => void;
}

export function ChannelForm({
  name,
  type,
  config,
  adding,
  onNameChange,
  onTypeChange,
  onConfigChange,
  onSubmit,
}: ChannelFormProps) {
  return (
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
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="例：官方 Telegram 頻道"
            />
          </div>
          <div className="w-[180px]">
            <Label className="text-sm text-gray-600 mb-1 block">
              頻道類型
            </Label>
            <Select
              value={type}
              onValueChange={(v) => onTypeChange(v as ChannelType)}
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
          <ChannelConfigFields
            type={type}
            config={config}
            onConfigChange={onConfigChange}
          />
        </div>

        <Button
          onClick={onSubmit}
          disabled={adding || !name.trim()}
        >
          {adding ? "新增中..." : "新增頻道"}
        </Button>
      </CardContent>
    </Card>
  );
}
