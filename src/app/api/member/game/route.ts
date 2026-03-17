import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  fetchPlayByPlay,
  fetchBoxScore,
  fetchLeaders,
  fetchInjuries,
  fetchWinProbability,
  fetchSeasonSeries,
  fetchPickCenter,
} from "@/lib/espn/play-by-play";
import { fetchOdds } from "@/lib/espn/odds";

/**
 * 會員專屬比賽資料 API
 * - plays → 完整 PBP
 * - odds → 完整賠率（3 線）
 * - boxscore → Box Score 資料
 * - leaders → 本場最佳球員
 * - injuries → 傷兵名單
 * - winprobability → 勝率走勢
 * - seasonseries → 歷史交手
 * - pickcenter → 專家預測
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("eventId");
  const league = searchParams.get("league") || "nba";
  const type = searchParams.get("type");

  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  try {
    if (type === "plays") {
      const plays = await fetchPlayByPlay(league, eventId);
      return NextResponse.json({ plays, totalCount: plays.length });
    }

    if (type === "odds") {
      const odds = await fetchOdds(league, eventId);
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
      const winprobability = await fetchWinProbability(league, league, eventId);
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
    console.error("[API] game member error:", err);
    return NextResponse.json(
      { error: "Failed to fetch game data" },
      { status: 500 }
    );
  }
}
