// Play-by-Play 解析（使用 ESPN summary API）

import { espnFetch, CACHE_TTL, getSportPath } from "./client";

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

interface SummaryPlay {
  id: string;
  sequenceNumber: string;
  type?: { id: string; text: string };
  text: string;
  awayScore: number;
  homeScore: number;
  period: { number: number; displayValue: string };
  clock: { displayValue: string };
  scoringPlay: boolean;
  team?: { id: string };
}

interface SummaryCompetitor {
  homeAway: "home" | "away";
  team: { id: string; displayName: string };
}

interface SummaryResponse {
  plays?: SummaryPlay[];
  header?: {
    competitions?: Array<{
      competitors?: SummaryCompetitor[];
    }>;
  };
}

function buildTeamMap(data: SummaryResponse): Record<string, string> {
  const map: Record<string, string> = {};
  const competitors =
    data.header?.competitions?.[0]?.competitors ?? [];
  for (const c of competitors) {
    map[c.team.id] = c.team.displayName;
  }
  return map;
}

function parsePlays(
  plays: SummaryPlay[],
  teamMap: Record<string, string>
): Play[] {
  return plays.map((p) => ({
    id: p.id,
    sequence: parseInt(p.sequenceNumber) || 0,
    text: p.text,
    type: p.type?.text ?? "",
    period: p.period?.displayValue ?? "",
    clock: p.clock?.displayValue ?? "",
    teamName: p.team ? (teamMap[p.team.id] ?? null) : null,
    scoringPlay: p.scoringPlay,
    homeScore: String(p.homeScore),
    awayScore: String(p.awayScore),
  }));
}

/**
 * 取得逐球紀錄（透過 summary API）
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

  const data = await espnFetch<SummaryResponse>(
    `${sportPath}/summary`,
    { ttl, params: { event: eventId } }
  );

  const teamMap = buildTeamMap(data);
  return parsePlays(data.plays ?? [], teamMap);
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
