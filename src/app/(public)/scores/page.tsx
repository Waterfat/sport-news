import type { Metadata } from "next";
import ScoreboardClient from "@/components/scoreboard/ScoreboardClient";
import { createServiceClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "即時比分 — 小豪哥體育資訊網",
  description: "NBA、MLB 即時比分，自動更新賽事資訊",
};

export const dynamic = "force-dynamic";

async function getEnabledLeagues() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("scoreboard_configs")
      .select("league_key, label")
      .eq("enabled", true)
      .order("sort_order");

    return (data ?? []).map((row) => ({
      key: row.league_key,
      label: row.label,
    }));
  } catch {
    return [];
  }
}

export default async function ScoresPage() {
  const leagues = await getEnabledLeagues();

  return <ScoreboardClient initialLeagues={leagues} />;
}
