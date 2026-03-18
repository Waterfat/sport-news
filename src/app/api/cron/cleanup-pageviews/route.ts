import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * Cron job: 清除 90 天前的 page_views 資料
 * 建議每天跑一次
 */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const { error } = await supabase
      .from("page_views")
      .delete()
      .lt("created_at", cutoff.toISOString());

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      cutoff: cutoff.toISOString(),
    });
  } catch (err) {
    console.error("[Cron] cleanup-pageviews error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
