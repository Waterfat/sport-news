import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { SPORTS, type SportKey } from "@/lib/sport-config";

// GET: 回傳目前各球種的啟用狀態與爬蟲來源
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("sport_settings")
      .select("sport_key, enabled, sources, updated_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: Record<
      string,
      { enabled: boolean; sources: string[]; updated_at?: string }
    > = {};

    for (const [key, config] of Object.entries(SPORTS)) {
      settings[key] = { enabled: config.enabled, sources: [] };
    }

    if (data) {
      for (const row of data) {
        if (row.sport_key in SPORTS) {
          settings[row.sport_key] = {
            enabled: row.enabled,
            sources: row.sources || [],
            updated_at: row.updated_at,
          };
        }
      }
    }

    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// POST: 更新某球種的啟用狀態或爬蟲來源
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sport_key, enabled, sources } = body as {
      sport_key: SportKey;
      enabled?: boolean;
      sources?: string[];
    };

    if (!sport_key || !(sport_key in SPORTS)) {
      return NextResponse.json(
        { error: `Invalid sport_key: ${sport_key}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      sport_key,
      updated_at: new Date().toISOString(),
    };

    if (typeof enabled === "boolean") {
      updateData.enabled = enabled;
    }

    if (Array.isArray(sources)) {
      updateData.sources = sources;
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("sport_settings")
      .upsert(updateData, { onConflict: "sport_key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, sport_key, enabled, sources });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
