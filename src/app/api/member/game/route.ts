import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchPlayByPlay, fetchBoxScore, fetchLeaders } from "@/lib/espn/play-by-play";
import { fetchOdds } from "@/lib/espn/odds";

/**
 * 會員專屬比賽資料 API
 * - plays → 完整 PBP
 * - odds → 完整賠率（3 線）
 * - boxscore → Box Score 資料
 * - leaders → 本場最佳球員
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("eventId");
  const league = searchParams.get("league") || "nba";
  const type = searchParams.get("type"); // "plays" | "odds" | "boxscore" | "leaders"

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

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[API] game member error:", err);
    return NextResponse.json(
      { error: "Failed to fetch game data" },
      { status: 500 }
    );
  }
}
