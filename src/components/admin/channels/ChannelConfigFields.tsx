"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CHANNEL_CONFIG_FIELDS, maskValue } from "./channel-types";
import type { ChannelType } from "./channel-types";

// --- Custom config editor for "custom" type ---

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

// --- Config fields (editable) ---

interface ChannelConfigFieldsProps {
  type: ChannelType;
  config: Record<string, string>;
  onConfigChange: (config: Record<string, string>) => void;
}

export function ChannelConfigFields({
  type,
  config,
  onConfigChange,
}: ChannelConfigFieldsProps) {
  if (type === "custom") {
    return <CustomConfigEditor config={config} onChange={onConfigChange} />;
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
              onConfigChange({ ...config, [field.key]: e.target.value })
            }
            placeholder={field.label}
            className="flex-1"
          />
        </div>
      ))}
    </div>
  );
}

// --- Config display (read-only with masking) ---

interface ChannelConfigDisplayProps {
  config: Record<string, string>;
}

export function ChannelConfigDisplay({ config }: ChannelConfigDisplayProps) {
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
