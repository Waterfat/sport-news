import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { auth } from "@/auth";

// GET: 取得自動化設定 + 目前未處理素材數
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const [settingsRes, countRes] = await Promise.all([
      supabase.from("automation_settings").select("*").eq("id", 1).single(),
      supabase
        .from("raw_articles")
        .select("*", { count: "exact", head: true })
        .eq("is_processed", false),
    ]);

    if (settingsRes.error) {
      return NextResponse.json(
        { error: settingsRes.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...settingsRes.data,
      pending_raw_count: countRes.count ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// PUT: 更新自動化設定
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { is_auto_mode, article_threshold, check_interval_minutes } =
      body as {
        is_auto_mode?: boolean;
        article_threshold?: number;
        check_interval_minutes?: number;
      };

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof is_auto_mode === "boolean") {
      updates.is_auto_mode = is_auto_mode;
    }
    if (typeof article_threshold === "number" && article_threshold >= 1) {
      updates.article_threshold = article_threshold;
    }
    if (
      typeof check_interval_minutes === "number" &&
      check_interval_minutes >= 1
    ) {
      updates.check_interval_minutes = check_interval_minutes;
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("automation_settings")
      .update(updates)
      .eq("id", 1)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
