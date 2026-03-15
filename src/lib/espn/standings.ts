// 排名解析
// ESPN standings 使用 /apis/v2/ 而非 /apis/site/v2/

import { CACHE_TTL, getSportPath } from "./client";
import type { ESPNStandingsResponse } from "./types";

const ESPN_V2_BASE = "https://site.api.espn.com/apis/v2/sports";

// 簡易快取
const cache = new Map<string, { data: StandingsGroup[]; ts: number }>();

export interface StandingsGroup {
  name: string;
  entries: StandingsEntry[];
}

export interface StandingsEntry {
  teamId: string;
  teamName: string;
  abbreviation: string;
  logo: string;
  stats: Record<string, string>;
}

function parseStandings(data: ESPNStandingsResponse): StandingsGroup[] {
  return (data.children ?? []).map((group) => ({
    name: group.name,
    entries: (group.standings?.entries ?? []).map((entry) => {
      const statsMap: Record<string, string> = {};
      (entry.stats ?? []).forEach((s) => {
        statsMap[s.name] = s.displayValue;
      });
      return {
        teamId: entry.team?.id ?? "",
        teamName: entry.team?.displayName ?? "",
        abbreviation: entry.team?.abbreviation ?? "",
        logo: entry.team?.logos?.[0]?.href ?? "",
        stats: statsMap,
      };
    }),
  }));
}

/**
 * 取得排名
 */
export async function fetchStandings(
  league: string
): Promise<StandingsGroup[]> {
  const sportPath = getSportPath(league);
  const cacheKey = `standings:${sportPath}`;

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL.STANDINGS) {
    return cached.data;
  }

  try {
    const url = `${ESPN_V2_BASE}/${sportPath}/standings`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`ESPN standings API error: ${res.status}`);
      return [];
    }
    const data = (await res.json()) as ESPNStandingsResponse;
    const result = parseStandings(data);
    cache.set(cacheKey, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error("ESPN standings fetch failed:", err);
    return [];
  }
}
