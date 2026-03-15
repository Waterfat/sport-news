// 賠率解析

import { espnFetch, CACHE_TTL, getSportPath } from "./client";

export interface OddsLine {
  provider: string;
  details: string; // e.g. "LAL -5.5"
  overUnder: number;
  spread: number;
  homeMoneyLine: number;
  awayMoneyLine: number;
  homeSpreadOdds: number;
  awaySpreadOdds: number;
  homeFavorite: boolean;
}

interface OddsApiResponse {
  items: Array<{
    provider: { id: string; name: string };
    details: string;
    overUnder: number;
    spread: number;
    overOdds: number;
    underOdds: number;
    awayTeamOdds: {
      moneyLine: number;
      spreadOdds: number;
      favorite: boolean;
    };
    homeTeamOdds: {
      moneyLine: number;
      spreadOdds: number;
      favorite: boolean;
    };
  }>;
}

function parseOdds(data: OddsApiResponse): OddsLine[] {
  return (data.items ?? []).map((o) => ({
    provider: o.provider?.name ?? "",
    details: o.details ?? "",
    overUnder: o.overUnder ?? 0,
    spread: o.spread ?? 0,
    homeMoneyLine: o.homeTeamOdds?.moneyLine ?? 0,
    awayMoneyLine: o.awayTeamOdds?.moneyLine ?? 0,
    homeSpreadOdds: o.homeTeamOdds?.spreadOdds ?? 0,
    awaySpreadOdds: o.awayTeamOdds?.spreadOdds ?? 0,
    homeFavorite: o.homeTeamOdds?.favorite ?? false,
  }));
}

/**
 * 取得比賽賠率
 */
export async function fetchOdds(
  league: string,
  eventId: string
): Promise<OddsLine[]> {
  const sportPath = getSportPath(league);

  const data = await espnFetch<OddsApiResponse>(
    `${sportPath}/events/${eventId}/competitions/${eventId}/odds`,
    { ttl: CACHE_TTL.ODDS }
  );

  return parseOdds(data);
}

/**
 * 訪客版：僅顯示 Spread 線
 */
export async function fetchOddsPreview(
  league: string,
  eventId: string
): Promise<OddsLine[]> {
  const allOdds = await fetchOdds(league, eventId);
  // 訪客只看第一個 provider 的 spread
  return allOdds.slice(0, 1).map((o) => ({
    ...o,
    homeMoneyLine: 0,
    awayMoneyLine: 0,
  }));
}
