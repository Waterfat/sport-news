import { NextRequest, NextResponse } from "next/server";
import { fetchPlayByPlayPreview } from "@/lib/espn/play-by-play";
import { fetchOddsPreview } from "@/lib/espn/odds";

/**
 * 公開版比賽資料 API
 * - plays?preview=true → 前 5 筆 PBP
 * - odds?preview=true → 僅 Spread
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("eventId");
  const league = searchParams.get("league") || "nba";
  const type = searchParams.get("type"); // "plays" | "odds"

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

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[API] game public error:", err);
    return NextResponse.json({ error: "Failed to fetch game data" }, { status: 500 });
  }
}
