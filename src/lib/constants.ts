// Shared constants across the application

export const POLLING_INTERVAL_MS = 3000;
export const POLLING_TIMEOUT_MS = 600000;
export const SCOREBOARD_POLLING_MS = 10_000;

export const SPORT_KEY_LABELS: Record<string, string> = {
  basketball: "籃球",
  baseball: "棒球",
  soccer: "足球",
};

/** ESPN displayName → 中文隊名對照表 */
export const TEAM_NAME_ZH: Record<string, string> = {
  // NBA
  "Atlanta Hawks": "亞特蘭大老鷹",
  "Boston Celtics": "波士頓塞爾提克",
  "Brooklyn Nets": "布魯克林籃網",
  "Charlotte Hornets": "夏洛特黃蜂",
  "Chicago Bulls": "芝加哥公牛",
  "Cleveland Cavaliers": "克里夫蘭騎士",
  "Dallas Mavericks": "達拉斯獨行俠",
  "Denver Nuggets": "丹佛金塊",
  "Detroit Pistons": "底特律活塞",
  "Golden State Warriors": "金州勇士",
  "Houston Rockets": "休士頓火箭",
  "Indiana Pacers": "印第安納溜馬",
  "LA Clippers": "洛杉磯快艇",
  "Los Angeles Lakers": "洛杉磯湖人",
  "Memphis Grizzlies": "曼菲斯灰熊",
  "Miami Heat": "邁阿密熱火",
  "Milwaukee Bucks": "密爾瓦基公鹿",
  "Minnesota Timberwolves": "明尼蘇達灰狼",
  "New Orleans Pelicans": "紐奧良鵜鶘",
  "New York Knicks": "紐約尼克",
  "Oklahoma City Thunder": "奧克拉荷馬雷霆",
  "Orlando Magic": "奧蘭多魔術",
  "Philadelphia 76ers": "費城乘者",
  "Phoenix Suns": "鳳凰城太陽",
  "Portland Trail Blazers": "波特蘭拓荒者",
  "Sacramento Kings": "沙加緬度國王",
  "San Antonio Spurs": "聖安東尼奧馬刺",
  "Toronto Raptors": "多倫多暴龍",
  "Utah Jazz": "猶他爵士",
  "Washington Wizards": "華盛頓巫師",
  // MLB
  "Arizona Diamondbacks": "亞利桑那響尾蛇",
  "Atlanta Braves": "亞特蘭大勇士",
  "Baltimore Orioles": "巴爾的摩金鶯",
  "Boston Red Sox": "波士頓紅襪",
  "Chicago Cubs": "芝加哥小熊",
  "Chicago White Sox": "芝加哥白襪",
  "Cincinnati Reds": "辛辛那提紅人",
  "Cleveland Guardians": "克里夫蘭乘者",
  "Colorado Rockies": "科羅拉多落磯",
  "Detroit Tigers": "底特律老虎",
  "Houston Astros": "休士頓太空人",
  "Kansas City Royals": "堪薩斯城皇家",
  "Los Angeles Angels": "洛杉磯天使",
  "Los Angeles Dodgers": "洛杉磯道奇",
  "Miami Marlins": "邁阿密馬林魚",
  "Milwaukee Brewers": "密爾瓦基釀酒人",
  "Minnesota Twins": "明尼蘇達雙城",
  "New York Mets": "紐約大都會",
  "New York Yankees": "紐約洋基",
  "Oakland Athletics": "奧克蘭運動家",
  "Philadelphia Phillies": "費城費城人",
  "Pittsburgh Pirates": "匹茲堡海盜",
  "San Diego Padres": "聖地牙哥教士",
  "San Francisco Giants": "舊金山巨人",
  "Seattle Mariners": "西雅圖水手",
  "St. Louis Cardinals": "聖路易紅雀",
  "Tampa Bay Rays": "坦帕灣光芒",
  "Texas Rangers": "德州遊騎兵",
  "Toronto Blue Jays": "多倫多藍鳥",
  "Washington Nationals": "華盛頓國民",
  // 足球（英超 / 主要聯賽）
  "Arsenal": "兵工廠",
  "Aston Villa": "阿斯頓維拉",
  "AFC Bournemouth": "伯恩茅斯",
  "Brentford": "布倫特福德",
  "Brighton & Hove Albion": "布萊頓",
  "Brighton and Hove Albion": "布萊頓",
  "Chelsea": "乍得",
  "Crystal Palace": "水晶宮",
  "Everton": "艾佛頓",
  "Fulham": "富勒姆",
  "Ipswich Town": "伊普斯維奇",
  "Leicester City": "萊斯特城",
  "Liverpool": "利物浦",
  "Manchester City": "曼城",
  "Manchester United": "曼聯",
  "Newcastle United": "紐卡素聯",
  "Nottingham Forest": "諾丁漢森林",
  "Southampton": "修咸頓",
  "Tottenham Hotspur": "熱刺",
  "West Ham United": "韋斯咸",
  "Wolverhampton Wanderers": "狼隊",
  // 西甲
  "Real Madrid": "皇家馬德里",
  "Barcelona": "巴塞隆納",
  "Atletico Madrid": "馬德里競技",
  "Atlético Madrid": "馬德里競技",
  // 意甲
  "AC Milan": "AC米蘭",
  "Inter Milan": "國際米蘭",
  "Juventus": "尤文圖斯",
  "SSC Napoli": "拿坡里",
  // 德甲
  "Bayern Munich": "拜仁慕尼黑",
  "Borussia Dortmund": "多特蒙德",
  // 法甲
  "Paris Saint-Germain": "巴黎聖日耳曼",
};

/** 將英文隊名轉為中文，找不到則回傳原文 */
export function getTeamNameZh(englishName: string): string {
  return TEAM_NAME_ZH[englishName] ?? englishName;
}

export const SITE_NAME = "超級運動資訊網";
export const SITE_NAME_SHORT = "超級運動";
export const SITE_DESCRIPTION = "最新體育新聞、NBA、MLB、足球賽事報導與深度分析";

export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://howger-sport.com").trim();

export const TELEGRAM_CHANNEL_URL = "https://t.me/howger_sport_news";

/** 頁面路徑 → 中文名稱，用於後台分析顯示 */
const PAGE_NAME_MAP: Record<string, string> = {
  "/": "首頁",
  "/scores": "即時比分",
  "/odds": "賠率",
  "/search": "搜尋",
  "/install": "安裝 App",
  "/settings": "設定",
  "/privacy": "隱私權政策",
  "/standings/nba": "NBA 排名",
  "/standings/mlb": "MLB 排名",
  "/category/nba": "NBA 新聞",
  "/category/mlb": "MLB 新聞",
  "/category/soccer": "足球新聞",
  "/category/general": "綜合新聞",
};

export function getPageName(path: string): string {
  // Exact match
  if (PAGE_NAME_MAP[path]) return PAGE_NAME_MAP[path];
  // Pattern match
  if (path.startsWith("/news/")) return "文章";
  if (path.startsWith("/game/")) return "比賽詳情";
  if (path.startsWith("/team/")) return "球隊頁";
  if (path.startsWith("/player/")) return "球員頁";
  if (path.startsWith("/writer/")) return "作者頁";
  if (path.startsWith("/standings/")) return "排名";
  if (path.startsWith("/category/")) return "分類";
  return path;
}

export const CATEGORY_COLORS: Record<string, string> = {
  NBA: "bg-orange-500 text-white rounded-md",
  籃球: "bg-orange-500 text-white rounded-md",
  棒球: "bg-emerald-600 text-white rounded-md",
  MLB: "bg-emerald-600 text-white rounded-md",
  足球: "bg-sky-600 text-white rounded-md",
  綜合: "bg-violet-600 text-white rounded-md",
};

/** 從 images 欄位取第一張圖片 URL（相容 string[] 和 { url: string }[] 兩種格式） */
export function getFirstImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "url" in first && typeof (first as { url: string }).url === "string") {
    return (first as { url: string }).url;
  }
  return null;
}

/** 分類名稱 → 分類底圖 fallback（無文章配圖時使用） */
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  NBA: "/images/category-nba.jpg",
  籃球: "/images/category-nba.jpg",
  棒球: "/images/category-mlb.jpg",
  MLB: "/images/category-mlb.jpg",
  足球: "/images/category-soccer.jpg",
  綜合: "/images/category-general.jpg",
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

export const ARTICLE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  published: "default",
};

export const PAGE_SIZE_OPTIONS = [20, 50, 100, 300];

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
  "headshot",
  "author",
  "byline",
  "/staff/",
  "/writers/",
  "/columnist/",
];

export function isValidImageUrl(url: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  return !IMAGE_EXCLUSION_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * 格式化相對時間，用於文章列表
 * < 1分鐘 → "剛剛"
 * < 60分鐘 → "N 分鐘前"
 * < 24小時 → "N 小時前"
 * < 7天 → "N 天前"
 * >= 7天 → 原有 formatDateShort 格式
 */
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const diffMs = now - then;
  if (diffMs < 0) return formatDateShort(dateStr);

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${hours} 小時前`;

  const days = Math.floor(diffMs / 86_400_000);
  if (days < 7) return `${days} 天前`;

  return formatDateShort(dateStr);
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
