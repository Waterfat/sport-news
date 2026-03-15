// 球隊數據

import { espnFetch, CACHE_TTL, getSportPath } from "./client";
import type { ESPNTeamResponse } from "./types";

export interface TeamDetail {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  record: string;
  standingSummary: string;
}

export interface TeamATS {
  wins: number;
  losses: number;
  pushes: number;
}

function parseTeam(data: ESPNTeamResponse): TeamDetail {
  const t = data.team;
  return {
    id: t.id,
    name: t.displayName,
    abbreviation: t.abbreviation,
    logo: t.logos?.[0]?.href ?? "",
    color: t.color ?? "",
    record: t.record?.items?.[0]?.summary ?? "",
    standingSummary: t.standingSummary ?? "",
  };
}

/**
 * 取得球隊基本資訊
 */
export async function fetchTeam(
  league: string,
  teamId: string
): Promise<TeamDetail> {
  const sportPath = getSportPath(league);

  const data = await espnFetch<ESPNTeamResponse>(
    `${sportPath}/teams/${teamId}`,
    { ttl: CACHE_TTL.TEAM }
  );

  return parseTeam(data);
}

/**
 * 取得球隊 ATS (Against the Spread)
 */
export async function fetchTeamATS(
  league: string,
  teamId: string
): Promise<TeamATS | null> {
  const sportPath = getSportPath(league);

  try {
    const data = await espnFetch<{ teamATS?: { wins: number; losses: number; pushes: number } }>(
      `${sportPath}/teams/${teamId}/ats`,
      { ttl: CACHE_TTL.TEAM }
    );

    if (!data.teamATS) return null;
    return {
      wins: data.teamATS.wins,
      losses: data.teamATS.losses,
      pushes: data.teamATS.pushes,
    };
  } catch {
    return null;
  }
}
