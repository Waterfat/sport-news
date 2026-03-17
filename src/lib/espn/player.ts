// 球員數據

import { espnFetch, CACHE_TTL, getSportPath } from "./client";
import type { ESPNPlayerResponse } from "./types";

export interface PlayerDetail {
  id: string;
  name: string;
  jersey: string;
  position: string;
  team: {
    id: string;
    name: string;
    abbreviation: string;
    logo: string;
  };
  headshot: string;
  stats: PlayerStatCategory[];
}

export interface PlayerStatCategory {
  name: string;
  displayName: string;
  stats: Array<{
    name: string;
    displayName: string;
    value: number;
    displayValue: string;
  }>;
}

function parsePlayer(data: ESPNPlayerResponse): PlayerDetail {
  const a = data.athlete;
  return {
    id: a.id,
    name: a.displayName,
    jersey: a.jersey ?? "",
    position: a.position?.displayName ?? "",
    team: {
      id: a.team?.id ?? "",
      name: a.team?.displayName ?? "",
      abbreviation: a.team?.abbreviation ?? "",
      logo: a.team?.logos?.[0]?.href ?? "",
    },
    headshot: a.headshot?.href ?? "",
    stats: (a.statistics ?? []).flatMap((s) =>
      (s.categories ?? []).map((cat) => ({
        name: cat.name,
        displayName: cat.displayName,
        stats: cat.stats ?? [],
      }))
    ),
  };
}

/**
 * 取得球員資訊
 */
export async function fetchPlayer(
  league: string,
  playerId: string
): Promise<PlayerDetail> {
  const sportPath = getSportPath(league);

  const data = await espnFetch<ESPNPlayerResponse>(
    `${sportPath}/athletes/${playerId}/overview`,
    { ttl: CACHE_TTL.TEAM }
  );

  return parsePlayer(data);
}

// ---------- Game Log ----------

export interface GameLogEntry {
  date: string;
  opponent: string;
  result: string;
  stats: Record<string, string>;
}

export interface PlayerGameLog {
  labels: string[];
  entries: GameLogEntry[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseGameLog(data: any): PlayerGameLog {
  const categories = data.categories ?? [];
  const firstCat = categories[0];
  if (!firstCat) return { labels: [], entries: [] };

  const labels: string[] = (firstCat.labels ?? []).map((l: string) => l);
  const events: any[] = firstCat.events ?? [];

  const entries: GameLogEntry[] = events.map((ev: any) => {
    const statsMap: Record<string, string> = {};
    const statsArr: string[] = ev.stats ?? [];
    labels.forEach((label, idx) => {
      statsMap[label] = statsArr[idx] ?? "-";
    });

    return {
      date: ev.eventDate ?? "",
      opponent: ev.opponent?.displayName ?? ev.opponent?.abbreviation ?? "",
      result: ev.gameResult ?? "",
      stats: statsMap,
    };
  });

  return { labels, entries };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 取得球員 Game Log
 */
export async function fetchPlayerGameLog(
  sport: string,
  league: string,
  playerId: string
): Promise<PlayerGameLog> {
  const sportPath = getSportPath(league);

  try {
    const data = await espnFetch<any>(
      `${sportPath}/athletes/${playerId}/gamelog`,
      { ttl: CACHE_TTL.TEAM }
    );
    return parseGameLog(data);
  } catch (err) {
    console.error("[ESPN] fetchPlayerGameLog error:", err);
    return { labels: [], entries: [] };
  }
}
