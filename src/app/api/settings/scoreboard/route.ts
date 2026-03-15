import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET: 回傳所有 scoreboard 設定
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("scoreboard_configs")
      .select("*")
      .order("sort_order");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configs: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// POST: 新增 scoreboard 設定
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sport_key, league_key, label, espn_endpoint, enabled, sort_order } = body;

    if (!sport_key || !league_key || !label || !espn_endpoint) {
      return NextResponse.json(
        { error: "Missing required fields: sport_key, league_key, label, espn_endpoint" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("scoreboard_configs")
      .insert({
        sport_key,
        league_key,
        label,
        espn_endpoint,
        enabled: enabled ?? false,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// PUT: 更新 scoreboard 設定
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("scoreboard_configs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config: data });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// DELETE: 刪除 scoreboard 設定
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("scoreboard_configs")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
