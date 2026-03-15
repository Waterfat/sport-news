// Play-by-Play 解析

import { espnFetch, CACHE_TTL, getSportPath } from "./client";
import type { ESPNPlay } from "./types";

export interface Play {
  id: string;
  sequence: number;
  text: string;
  type: string;
  period: string;
  clock: string;
  teamName: string | null;
  scoringPlay: boolean;
  homeScore: string;
  awayScore: string;
}

interface PBPApiResponse {
  items: ESPNPlay[];
}

function parsePlays(data: PBPApiResponse): Play[] {
  return (data.items ?? []).map((p) => ({
    id: p.id,
    sequence: parseInt(p.sequenceNumber) || 0,
    text: p.text,
    type: p.type?.text ?? "",
    period: p.period?.displayValue ?? "",
    clock: p.clock?.displayValue ?? "",
    teamName: p.team?.displayName ?? null,
    scoringPlay: p.scoringPlay,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
  }));
}

/**
 * 取得逐球紀錄
 * @param league - 聯賽 key (nba, mlb, etc.)
 * @param eventId - ESPN event ID
 * @param isCompleted - 是否已結束（影響快取 TTL）
 */
export async function fetchPlayByPlay(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<Play[]> {
  const sportPath = getSportPath(league);
  const ttl = isCompleted ? CACHE_TTL.PBP_FINAL : CACHE_TTL.LIVE;

  const data = await espnFetch<PBPApiResponse>(
    `${sportPath}/events/${eventId}/competitions/${eventId}/plays`,
    { ttl, params: { limit: "300" } }
  );

  return parsePlays(data);
}

/**
 * 訪客預覽版（前 5 筆）
 */
export async function fetchPlayByPlayPreview(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<{ plays: Play[]; totalCount: number }> {
  const allPlays = await fetchPlayByPlay(league, eventId, isCompleted);
  return {
    plays: allPlays.slice(0, 5),
    totalCount: allPlays.length,
  };
}
