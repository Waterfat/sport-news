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

/** slug → 顯示名稱 */
export const CATEGORY_LABELS: Record<string, string> = {
  nba: "NBA",
  mlb: "MLB",
  soccer: "足球",
  general: "綜合",
};

/** slug → DB 查詢用的分類值 */
export const CATEGORY_DB_MAP: Record<string, string> = {
  nba: "NBA",
  mlb: "棒球",
  soccer: "足球",
  general: "綜合",
};

/** 分類名稱 → slug */
export function getCategorySlug(category: string): string {
  const map: Record<string, string> = {
    NBA: "nba",
    籃球: "nba",
    棒球: "mlb",
    MLB: "mlb",
    足球: "soccer",
    綜合: "general",
  };
  return map[category] ?? "general";
}

export const CHANNEL_TYPE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  telegram: "Telegram",
  x_twitter: "X/Twitter",
  line: "LINE",
  custom: "自訂",
};

export const ARTICLE_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
} as const;

export const ARTICLE_STATUS_LABELS: Record<string, string> = {
  draft: "未發布",
  published: "已發布",
};

/** 排除非內容圖片（logo、tracking pixel、icon 等） */
const IMAGE_EXCLUSION_PATTERNS = [
  "logo",
  ".svg",
  "icon",
  "avatar",
  "et_track",
  "content-reactions",
  "columnists/full",
  "pixel",
  "tracker",
  "beacon",
];

export function isValidImageUrl(url: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  return !IMAGE_EXCLUSION_PATTERNS.some((pattern) => lower.includes(pattern));
}

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

/**
 * 解析分頁參數
 */
export function parsePagination(searchParams: URLSearchParams, defaultLimit = 20) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || String(defaultLimit), 10) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
