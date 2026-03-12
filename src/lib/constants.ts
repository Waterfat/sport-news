// Shared constants across the application

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sportnews.example.com";

export const TELEGRAM_CHANNEL_URL = "https://t.me/howger_sport_news";

export const CATEGORY_COLORS: Record<string, string> = {
  NBA: "bg-orange-100 text-orange-800",
  籃球: "bg-orange-100 text-orange-800",
  棒球: "bg-green-100 text-green-800",
  MLB: "bg-green-100 text-green-800",
  足球: "bg-blue-100 text-blue-800",
  綜合: "bg-purple-100 text-purple-800",
};

/**
 * 格式化日期 - 完整版（含時間），用於文章詳情頁
 */
export function formatDateFull(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 格式化日期 - 簡短版，用於文章列表
 */
export function formatDateShort(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
