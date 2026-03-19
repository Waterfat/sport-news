import { NextRequest, NextResponse } from "next/server";
import {
  fetchPlayByPlayPreview,
  fetchBoxScore,
  fetchLeaders,
  fetchInjuries,
  fetchWinProbability,
  fetchSeasonSeries,
  fetchPickCenter,
} from "@/lib/espn/play-by-play";
import { fetchOddsPreview } from "@/lib/espn/odds";

/**
 * 公開版比賽資料 API
 * - plays → 前 5 筆 PBP
 * - odds → 僅 Spread
 * - boxscore → Box Score 資料
 * - leaders → 本場最佳球員
 * - injuries → 傷兵名單
 * - winprobability → 勝率走勢
 * - seasonseries → 歷史交手
 * - pickcenter → 專家預測
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("eventId");
  const league = searchParams.get("league") || "nba";
  const type = searchParams.get("type");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  try {
    if (type === "plays") {
      const data = await fetchPlayByPlayPreview(league, eventId);
      return NextResponse.json(data);
    }

    if (type === "odds") {
      const odds = await fetchOddsPreview(league, eventId);
      return NextResponse.json({ odds });
    }

    if (type === "boxscore") {
      const boxscore = await fetchBoxScore(league, eventId);
      return NextResponse.json({ boxscore });
    }

    if (type === "leaders") {
      const leaders = await fetchLeaders(league, eventId);
      return NextResponse.json({ leaders });
    }

    if (type === "injuries") {
      const injuries = await fetchInjuries(league, eventId);
      return NextResponse.json({ injuries });
    }

    if (type === "winprobability") {
      const winprobability = await fetchWinProbability(league, eventId);
      return NextResponse.json({ winprobability });
    }

    if (type === "seasonseries") {
      const seasonseries = await fetchSeasonSeries(league, eventId);
      return NextResponse.json({ seasonseries });
    }

    if (type === "pickcenter") {
      const pickcenter = await fetchPickCenter(league, eventId);
      return NextResponse.json({ pickcenter });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[API] game public error:", err);
    return NextResponse.json({ error: "Failed to fetch game data" }, { status: 500 });
  }
}
