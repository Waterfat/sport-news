// 賠率解析 — 從 summary API 取得 odds

import { espnFetch, CACHE_TTL, getSportPath } from "./client";
import type { ESPNOdds } from "./types";

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

interface OddsSummaryResponse {
  odds?: ESPNOdds[];
}

function parseOdds(data: OddsSummaryResponse): OddsLine[] {
  return (data.odds ?? []).map((o) => ({
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
 * 取得比賽賠率（從 summary API）
 */
export async function fetchOdds(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<OddsLine[]> {
  const sportPath = getSportPath(league);
  const ttl = isCompleted ? CACHE_TTL.PBP_FINAL : CACHE_TTL.ODDS;

  const data = await espnFetch<OddsSummaryResponse>(
    `${sportPath}/summary`,
    { ttl, params: { event: eventId } }
  );

  return parseOdds(data);
}

/**
 * 訪客版：僅顯示 Spread 線
 */
export async function fetchOddsPreview(
  league: string,
  eventId: string,
  isCompleted = false
): Promise<OddsLine[]> {
  const allOdds = await fetchOdds(league, eventId, isCompleted);
  // 訪客只看第一個 provider 的 spread
  return allOdds.slice(0, 1).map((o) => ({
    ...o,
    homeMoneyLine: 0,
    awayMoneyLine: 0,
  }));
}
