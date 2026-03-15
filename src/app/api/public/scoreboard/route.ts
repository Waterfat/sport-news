import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { fetchScoreboard } from "@/lib/scoreboard";

export async function GET(request: NextRequest) {
  try {
    const league = request.nextUrl.searchParams.get("league");
    if (!league) {
      return NextResponse.json(
        { error: "Missing league parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("scoreboard_configs")
      .select("league_key, label, espn_endpoint, enabled")
      .eq("league_key", league)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: `League not found: ${league}` },
        { status: 404 }
      );
    }

    if (!data.enabled) {
      return NextResponse.json(
        { error: `League not enabled: ${league}` },
        { status: 404 }
      );
    }

    const games = await fetchScoreboard(data.espn_endpoint);

    return NextResponse.json({
      league: data.league_key,
      label: data.label,
      games,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
