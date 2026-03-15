// 統一 ESPN API client（快取 + 錯誤處理）

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

// ---------- Cache ----------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------- TTL 設定 ----------

export const CACHE_TTL = {
  LIVE: 10_000, // 即時比分、進行中 PBP
  ODDS: 60_000, // 賠率
  STANDINGS: 5 * 60_000, // 排名
  TEAM: 10 * 60_000, // 球隊/球員
  HISTORICAL: 24 * 60 * 60_000, // 歷史比分
  PBP_FINAL: 60 * 60_000, // 已結束比賽 PBP
} as const;

// ---------- API 請求 ----------

export class ESPNApiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message?: string
  ) {
    super(message || `ESPN API error: ${status} for ${endpoint}`);
    this.name = "ESPNApiError";
  }
}

/**
 * 統一 ESPN API 請求，帶快取 + 錯誤處理
 */
export async function espnFetch<T>(
  path: string,
  options: {
    ttl?: number;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const { ttl = CACHE_TTL.LIVE, params } = options;

  const url = new URL(`${ESPN_BASE}/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const cacheKey = url.toString();
  const cached = getCached<T>(cacheKey, ttl);
  if (cached) return cached;

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new ESPNApiError(res.status, path);
  }

  const data = (await res.json()) as T;
  setCache(cacheKey, data);
  return data;
}

/**
 * ESPN 體育路徑對應表
 */
export const SPORT_PATHS: Record<string, string> = {
  nba: "basketball/nba",
  mlb: "baseball/mlb",
  nfl: "football/nfl",
  nhl: "hockey/nhl",
  epl: "soccer/eng.1",
  laliga: "soccer/esp.1",
  ucl: "soccer/uefa.champions",
  mls: "soccer/usa.1",
} as const;

/**
 * 取得某個運動的 ESPN 路徑
 */
export function getSportPath(league: string): string {
  return SPORT_PATHS[league] || league;
}
