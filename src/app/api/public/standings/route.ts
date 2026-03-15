import { NextRequest, NextResponse } from "next/server";
import { fetchStandings } from "@/lib/espn/standings";

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get("league") || "nba";

  try {
    const standings = await fetchStandings(sport);
    return NextResponse.json({ standings });
  } catch (err) {
    console.error("[API] standings error:", err);
    return NextResponse.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}
