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
