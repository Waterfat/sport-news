// --- Channel type definitions and constants ---

export interface PublishChannel {
  id: number;
  name: string;
  type: string;
  config: Record<string, string>;
  is_active: boolean;
  created_at: string;
}

export type ChannelType = "facebook" | "telegram" | "x_twitter" | "line" | "custom";

export const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "telegram", label: "Telegram" },
  { value: "x_twitter", label: "X/Twitter" },
  { value: "line", label: "LINE" },
  { value: "custom", label: "自訂" },
];

export const CHANNEL_CONFIG_FIELDS: Record<string, { key: string; label: string }[]> = {
  facebook: [
    { key: "page_id", label: "Page ID" },
    { key: "access_token", label: "Access Token" },
  ],
  telegram: [
    { key: "bot_token", label: "Bot Token" },
    { key: "chat_id", label: "Chat ID" },
  ],
  x_twitter: [
    { key: "api_key", label: "API Key" },
    { key: "api_secret", label: "API Secret" },
    { key: "access_token", label: "Access Token" },
    { key: "access_token_secret", label: "Access Token Secret" },
  ],
  line: [
    { key: "channel_access_token", label: "Channel Access Token" },
  ],
};

export function resetConfigForType(type: ChannelType): Record<string, string> {
  const fields = CHANNEL_CONFIG_FIELDS[type];
  if (!fields) return {};
  const config: Record<string, string> = {};
  for (const field of fields) {
    config[field.key] = "";
  }
  return config;
}

export function maskValue(value: string): string {
  if (!value) return "";
  if (value.length <= 6) return "***";
  return value.slice(0, 3) + "***" + value.slice(-3);
}

export function typeBadgeColor(type: string): string {
  switch (type) {
    case "facebook":
      return "bg-blue-100 text-blue-800";
    case "telegram":
      return "bg-sky-100 text-sky-800";
    case "x_twitter":
      return "bg-gray-800 text-white";
    case "line":
      return "bg-green-100 text-green-800";
    default:
      return "bg-purple-100 text-purple-800";
  }
}
