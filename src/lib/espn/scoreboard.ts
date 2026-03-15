// 重構 scoreboard — 使用統一 ESPN client

import { espnFetch, CACHE_TTL, getSportPath } from "./client";
import type { ESPNScoreboardResponse } from "./types";

// ---------- 前台使用的型別（保持與現有 scoreboard.ts 相容） ----------

export interface TeamInfo {
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  record: string;
}

export interface Game {
  id: string;
  date: string;
  status: "in_progress" | "final" | "scheduled";
  statusDetail: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
}

export interface ScoreboardResponse {
  league: string;
  label: string;
  games: Game[];
}

export interface LeagueConfig {
  key: string;
  label: string;
  espn_endpoint: string;
}

// ---------- 解析 ----------

function mapStatus(statusName: string): Game["status"] {
  if (statusName === "STATUS_FINAL") return "final";
  if (statusName === "STATUS_IN_PROGRESS") return "in_progress";
  return "scheduled";
}

function parseGames(data: ESPNScoreboardResponse): Game[] {
  return (data.events ?? []).map((event) => {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors ?? [];

    const home =
      competitors.find((c) => c.homeAway === "home") ?? competitors[0];
    const away =
      competitors.find((c) => c.homeAway === "away") ?? competitors[1];

    return {
      id: event.id,
      date: event.date,
      status: mapStatus(event.status?.type?.name ?? ""),
      statusDetail: event.status?.type?.shortDetail ?? "",
      homeTeam: {
        name: home?.team?.displayName ?? "",
        abbreviation: home?.team?.abbreviation ?? "",
        logo: home?.team?.logo ?? "",
        score: home?.score ?? "0",
        record: home?.records?.[0]?.summary ?? "",
      },
      awayTeam: {
        name: away?.team?.displayName ?? "",
        abbreviation: away?.team?.abbreviation ?? "",
        logo: away?.team?.logo ?? "",
        score: away?.score ?? "0",
        record: away?.records?.[0]?.summary ?? "",
      },
    };
  });
}

// ---------- API ----------

/**
 * 取得即時比分（預設今天）
 */
export async function fetchScoreboard(
  espnEndpoint: string,
  date?: string
): Promise<Game[]> {
  const params: Record<string, string> = {};
  const ttl = date ? CACHE_TTL.HISTORICAL : CACHE_TTL.LIVE;

  if (date) {
    // date 格式: YYYYMMDD
    params.dates = date;
  }

  const data = await espnFetch<ESPNScoreboardResponse>(
    `${espnEndpoint}/scoreboard`,
    { ttl, params }
  );
  return parseGames(data);
}

/**
 * 以 league key 取得比分（方便前端呼叫）
 */
export async function fetchScoreboardByLeague(
  league: string,
  date?: string
): Promise<Game[]> {
  const sportPath = getSportPath(league);
  return fetchScoreboard(sportPath, date);
}
