// Play-by-Play 解析（使用 ESPN summary API）

import { espnFetch, CACHE_TTL, getSportPath } from "./client";
import { getTeamNameZh } from "@/lib/constants";
import { translatePbpText } from "./translate-pbp";
import type { BoxScore, BoxScorePlayerGroup, BoxScoreTeam, TeamLeaders, GameLeader } from "./types";
import { safeValidate, pctZeroOneSchema, pctZeroHundredSchema } from "./schemas";

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
    stats: (t.statistics ?? []).map((s) => ({
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
  // Leaders data is at top-level data.leaders, NOT header.competitions[].competitors[].leaders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topLeaders: any[] = (data as any).leaders ?? [];

  if (topLeaders.length > 0) {
    return topLeaders.map((teamGroup: any) => {
      const team = teamGroup.team ?? {};
      const leaders: GameLeader[] = (teamGroup.leaders ?? []).map((cat: any) => {
        const topAthlete = cat.leaders?.[0] ?? {};
        return {
          category: cat.name ?? cat.displayName ?? "",
          displayName: topAthlete.athlete?.displayName ?? "",
          displayValue: topAthlete.displayValue ?? "",
        };
      });
      return {
        teamName: getTeamNameZh(team.displayName ?? ""),
        logo: team.logo ?? team.logos?.[0]?.href ?? "",
        leaders,
      };
    });
  }

  // Fallback: try header.competitions (older API format)
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

// ---------- Injuries ----------

export interface InjuryPlayer {
  name: string;
  status: string;
  description: string;
}

export interface TeamInjuries {
  team: string;
  teamLogo: string;
  players: InjuryPlayer[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseInjuries(data: any): TeamInjuries[] {
  const injuries: any[] = data.injuries ?? [];
  return injuries.map((teamGroup: any) => {
    const team = teamGroup.team ?? {};
    const players: InjuryPlayer[] = (teamGroup.injuries ?? []).map((inj: any) => ({
      name: inj.athlete?.displayName ?? "",
      status: inj.status ?? inj.type?.description ?? "",
      description: inj.details?.detail ?? inj.details?.type ?? "",
    }));
    return {
      team: getTeamNameZh(team.displayName ?? ""),
      teamLogo: team.logo ?? team.logos?.[0]?.href ?? "",
      players,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 取得傷兵名單
 */
export async function fetchInjuries(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<TeamInjuries[]> {
  const sportPath = getSportPath(league);
  const ttl = isCompleted ? CACHE_TTL.PBP_FINAL : CACHE_TTL.LIVE;

  try {
    const data = await espnFetch<any>(
      `${sportPath}/summary`,
      { ttl, params: { event: eventId } }
    );
    return parseInjuries(data);
  } catch (err) {
    console.error("[ESPN] fetchInjuries error:", err);
    return [];
  }
}

// ---------- Win Probability ----------

export interface WinProbabilityPoint {
  homeWinPct: number;
  playId: string;
  secondsLeft: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseWinProbability(data: any): WinProbabilityPoint[] {
  const items: any[] = data.winprobability ?? [];
  return items.map((p: any) => ({
    homeWinPct: safeValidate(pctZeroHundredSchema, (p.homeWinPercentage ?? 0) * 100, "winProb.homeWinPct", 50),
    playId: p.playId ?? "",
    secondsLeft: p.secondsLeft ?? 0,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 取得勝率走勢
 */
export async function fetchWinProbability(
  league: string,
  eventId: string
): Promise<WinProbabilityPoint[]> {
  const sportPath = getSportPath(league);
  const ttl = CACHE_TTL.PBP_FINAL;

  try {
    const data = await espnFetch<any>(
      `${sportPath}/summary`,
      { ttl, params: { event: eventId } }
    );
    return parseWinProbability(data);
  } catch (err) {
    console.error("[ESPN] fetchWinProbability error:", err);
    return [];
  }
}

// ---------- Season Series ----------

export interface SeasonSeriesGame {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
}

export interface SeasonSeriesData {
  summary: string;
  seriesScore: string;
  games: SeasonSeriesGame[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseSeasonSeries(data: any): SeasonSeriesData | null {
  const seriesArr: any[] = data.seasonseries ?? [];
  if (seriesArr.length === 0) return null;
  const series = seriesArr[0];
  const events: any[] = series.events ?? [];
  const games: SeasonSeriesGame[] = events.map((e: any) => {
    const competitors = e.competitors ?? [];
    const home = competitors.find((c: any) => c.homeAway === "home") ?? competitors[0] ?? {};
    const away = competitors.find((c: any) => c.homeAway === "away") ?? competitors[1] ?? {};
    return {
      date: e.date ?? "",
      homeTeam: getTeamNameZh(home.team?.displayName ?? ""),
      awayTeam: getTeamNameZh(away.team?.displayName ?? ""),
      homeScore: home.score ?? "0",
      awayScore: away.score ?? "0",
      status: e.statusType?.shortDetail ?? e.status ?? "",
    };
  });
  return {
    summary: series.summary ?? "",
    seriesScore: series.seriesScore ?? "",
    games,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 取得歷史交手紀錄（本季）
 */
export async function fetchSeasonSeries(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<SeasonSeriesData | null> {
  const sportPath = getSportPath(league);
  const ttl = isCompleted ? CACHE_TTL.PBP_FINAL : CACHE_TTL.LIVE;

  try {
    const data = await espnFetch<any>(
      `${sportPath}/summary`,
      { ttl, params: { event: eventId } }
    );
    return parseSeasonSeries(data);
  } catch (err) {
    console.error("[ESPN] fetchSeasonSeries error:", err);
    return null;
  }
}

// ---------- Pick Center ----------

export interface PickCenterData {
  provider: string;
  details: string;
  homeWinPct: number;
  awayWinPct: number;
}

/** Convert American moneyline to implied probability */
function moneyLineToProb(ml: number): number {
  if (ml === 0) return 0;
  if (ml < 0) return Math.abs(ml) / (Math.abs(ml) + 100);
  return 100 / (ml + 100);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parsePickCenter(data: any): PickCenterData[] {
  const picks: any[] = data.pickcenter ?? [];
  return picks.map((p: any) => {
    const homeMl = p.homeTeamOdds?.moneyLine ?? 0;
    const awayMl = p.awayTeamOdds?.moneyLine ?? 0;
    let homeWinPct = p.homeTeamOdds?.winPercentage ?? 0;
    let awayWinPct = p.awayTeamOdds?.winPercentage ?? 0;
    // If no winPercentage, derive from moneyLine (return 0-1 scale)
    if (homeWinPct === 0 && awayWinPct === 0 && (homeMl !== 0 || awayMl !== 0)) {
      const rawHome = moneyLineToProb(homeMl);
      const rawAway = moneyLineToProb(awayMl);
      const total = rawHome + rawAway;
      homeWinPct = total > 0 ? rawHome / total : 0.5;
      awayWinPct = total > 0 ? rawAway / total : 0.5;
    }
    homeWinPct = safeValidate(pctZeroOneSchema, homeWinPct, "pickCenter.homeWinPct", 0.5);
    awayWinPct = safeValidate(pctZeroOneSchema, awayWinPct, "pickCenter.awayWinPct", 0.5);
    return {
      provider: p.provider?.name ?? "",
      details: p.details ?? "",
      homeWinPct,
      awayWinPct,
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 取得專家預測
 */
export async function fetchPickCenter(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<PickCenterData[]> {
  const sportPath = getSportPath(league);
  const ttl = isCompleted ? CACHE_TTL.PBP_FINAL : CACHE_TTL.LIVE;

  try {
    const data = await espnFetch<any>(
      `${sportPath}/summary`,
      { ttl, params: { event: eventId } }
    );
    return parsePickCenter(data);
  } catch (err) {
    console.error("[ESPN] fetchPickCenter error:", err);
    return [];
  }
}
