// Play-by-Play 解析（使用 ESPN summary API）

import { espnFetch, CACHE_TTL, getSportPath } from "./client";
import { getTeamNameZh } from "@/lib/constants";
import { translatePbpText } from "./translate-pbp";
import type { BoxScore, BoxScorePlayerGroup, BoxScoreTeam, TeamLeaders, GameLeader } from "./types";

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
  team: { id: string; displayName: string; logo?: string; logos?: Array<{ href: string }> };
  leaders?: Array<{
    name: string;
    displayName: string;
    leaders: Array<{
      displayValue: string;
      athlete: { displayName: string };
    }>;
  }>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface SummaryResponse {
  plays?: SummaryPlay[];
  header?: {
    competitions?: Array<{
      competitors?: SummaryCompetitor[];
    }>;
  };
  boxscore?: {
    teams?: Array<{
      team: { displayName: string; logo?: string; logos?: Array<{ href: string }> };
      statistics: Array<{
        name: string;
        displayValue: string;
      }>;
    }>;
    players?: Array<{
      team: { displayName: string };
      statistics: Array<{
        labels: string[];
        athletes: Array<{
          athlete: { displayName: string; position?: { abbreviation: string } };
          stats: string[];
          starter: boolean;
        }>;
      }>;
    }>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function buildTeamMap(data: SummaryResponse): Record<string, string> {
  const map: Record<string, string> = {};
  const competitors =
    data.header?.competitions?.[0]?.competitors ?? [];
  for (const c of competitors) {
    map[c.team.id] = getTeamNameZh(c.team.displayName);
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
    text: translatePbpText(p.text),
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

// ---------- Box Score ----------

function parseBoxScore(data: SummaryResponse): BoxScore | null {
  if (!data.boxscore) return null;

  const teams: BoxScoreTeam[] = (data.boxscore.teams ?? []).map((t) => ({
    teamName: getTeamNameZh(t.team.displayName),
    logo: t.team.logo ?? t.team.logos?.[0]?.href ?? "",
    stats: t.statistics.map((s) => ({
      label: s.name,
      value: s.displayValue,
    })),
  }));

  const players: BoxScorePlayerGroup[] = (data.boxscore.players ?? []).map((p) => {
    const firstStatGroup = p.statistics?.[0];
    return {
      teamName: getTeamNameZh(p.team.displayName),
      labels: firstStatGroup?.labels ?? [],
      athletes: (firstStatGroup?.athletes ?? []).map((a) => ({
        name: a.athlete.displayName,
        position: a.athlete.position?.abbreviation ?? "",
        stats: a.stats ?? [],
        starter: a.starter ?? false,
      })),
    };
  });

  return { teams, players };
}

/**
 * 取得 Box Score
 */
export async function fetchBoxScore(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<BoxScore | null> {
  const sportPath = getSportPath(league);
  const ttl = isCompleted ? CACHE_TTL.PBP_FINAL : CACHE_TTL.LIVE;

  const data = await espnFetch<SummaryResponse>(
    `${sportPath}/summary`,
    { ttl, params: { event: eventId } }
  );

  return parseBoxScore(data);
}

// ---------- Leaders ----------

function parseLeaders(data: SummaryResponse): TeamLeaders[] {
  const competitors = data.header?.competitions?.[0]?.competitors ?? [];

  return competitors.map((c) => {
    const logo = c.team.logo ?? c.team.logos?.[0]?.href ?? "";
    const leaders: GameLeader[] = (c.leaders ?? []).map((l) => ({
      category: l.name,
      displayName: l.leaders?.[0]?.athlete?.displayName ?? "",
      displayValue: l.leaders?.[0]?.displayValue ?? "",
    }));

    return {
      teamName: getTeamNameZh(c.team.displayName),
      logo,
      leaders,
    };
  });
}

/**
 * 取得本場最佳球員
 */
export async function fetchLeaders(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<TeamLeaders[]> {
  const sportPath = getSportPath(league);
  const ttl = isCompleted ? CACHE_TTL.PBP_FINAL : CACHE_TTL.LIVE;

  const data = await espnFetch<SummaryResponse>(
    `${sportPath}/summary`,
    { ttl, params: { event: eventId } }
  );

  return parseLeaders(data);
}
