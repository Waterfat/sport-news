import { NextRequest, NextResponse } from "next/server";
import { getSportPath } from "@/lib/espn/client";
import { fetchPlayerGameLog } from "@/lib/espn/player";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get("sport") || "nba";
  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const sportPath = getSportPath(sport);

  try {
    if (type === "gamelog") {
      const gamelog = await fetchPlayerGameLog(sport, sport, id);
      return NextResponse.json({ gamelog });
    }

    // Try fetching athlete from the athletes endpoint
    const res = await fetch(`${ESPN_BASE}/${sportPath}/athletes/${id}`, {
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const data = await res.json();
    const a = data.athlete ?? data;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // Parse stats if available
    const stats: Array<{ name: string; displayName: string; value: string }> = [];
    const categories = a.statistics?.categories ?? a.statistics ?? [];
    if (Array.isArray(categories)) {
      for (const cat of categories) {
        const catStats = cat.stats ?? cat.splits?.categories?.[0]?.stats ?? [];
        if (Array.isArray(catStats)) {
          for (const s of catStats) {
            stats.push({
              name: s.name ?? "",
              displayName: s.displayName ?? s.name ?? "",
              value: s.displayValue ?? String(s.value ?? ""),
            });
          }
        }
      }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return NextResponse.json({
      player: {
        id: a.id ?? id,
        displayName: a.displayName ?? a.fullName ?? "",
        jersey: a.jersey ?? "",
        position: a.position?.displayName ?? a.position?.abbreviation ?? "",
        age: a.age ?? 0,
        height: a.displayHeight ?? "",
        weight: a.displayWeight ?? "",
        headshot: a.headshot?.href ?? "",
        team: a.team
          ? {
              id: a.team.id ?? "",
              displayName: a.team.displayName ?? "",
              abbreviation: a.team.abbreviation ?? "",
              logo: a.team.logos?.[0]?.href ?? "",
            }
          : null,
        experience: a.experience?.years ?? 0,
        college: a.college?.name ?? "",
      },
      stats: stats.slice(0, 15),
    });
  } catch (err) {
    console.error("[API] player error:", err);
    return NextResponse.json(
      { error: "Failed to fetch player" },
      { status: 500 }
    );
  }
}
