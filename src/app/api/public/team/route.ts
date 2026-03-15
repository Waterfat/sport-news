import { NextRequest, NextResponse } from "next/server";
import { getSportPath } from "@/lib/espn/client";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

export async function GET(request: NextRequest) {
  const sport = request.nextUrl.searchParams.get("sport") || "nba";
  const id = request.nextUrl.searchParams.get("id");
  const type = request.nextUrl.searchParams.get("type"); // "roster" or default

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const sportPath = getSportPath(sport);

  try {
    if (type === "roster") {
      const res = await fetch(`${ESPN_BASE}/${sportPath}/teams/${id}/roster`, {
        next: { revalidate: 600 },
      });
      if (!res.ok) return NextResponse.json({ roster: [] });
      const data = await res.json();

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const roster = (data.athletes ?? []).map((a: any) => ({
        id: a.id ?? "",
        displayName: a.displayName ?? a.fullName ?? "",
        jersey: a.jersey ?? "",
        position: a.position?.abbreviation ?? "",
        age: a.age ?? 0,
        height: a.displayHeight ?? "",
        weight: a.displayWeight ?? "",
      }));
      /* eslint-enable @typescript-eslint/no-explicit-any */

      return NextResponse.json({ roster });
    }

    // Default: team info
    const res = await fetch(`${ESPN_BASE}/${sportPath}/teams/${id}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    const data = await res.json();
    const t = data.team ?? {};

    return NextResponse.json({
      team: {
        id: t.id ?? "",
        name: t.displayName ?? "",
        abbreviation: t.abbreviation ?? "",
        logo: t.logos?.[0]?.href ?? "",
        color: t.color ?? "",
        record: t.record?.items?.[0]?.summary ?? "",
        standingSummary: t.standingSummary ?? "",
      },
    });
  } catch (err) {
    console.error("[API] team error:", err);
    return NextResponse.json({ error: "Failed to fetch team" }, { status: 500 });
  }
}
