import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("scoreboard_configs")
      .select("league_key, label")
      .eq("enabled", true)
      .order("sort_order");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leagues = (data ?? []).map((row) => ({
      key: row.league_key,
      label: row.label,
    }));

    return NextResponse.json({ leagues });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
