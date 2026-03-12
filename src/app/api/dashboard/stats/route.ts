import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    rawCount,
    draftCount,
    publishedCount,
    personaStats,
    todayRaw,
    todayGenerated,
    channelCount,
    todayPublished,
    scheduledCount,
    totalViews,
  ] = await Promise.all([
    supabase.from("raw_articles").select("*", { count: "exact", head: true }),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("writer_personas").select("id, name, is_active"),
    supabase
      .from("raw_articles")
      .select("*", { count: "exact", head: true })
      .gte("crawled_at", todayISO),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO),
    supabase
      .from("publish_channels")
      .select("id, name, type, is_active")
      .eq("is_active", true),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", todayISO),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft")
      .not("scheduled_at", "is", null),
    supabase
      .from("generated_articles")
      .select("view_count")
      .eq("status", "published"),
  ]);

  const totalViewCount = (totalViews.data || []).reduce(
    (sum, row) => sum + (row.view_count || 0),
    0
  );

  return NextResponse.json({
    raw_articles_total: rawCount.count || 0,
    today_raw: todayRaw.count || 0,
    today_generated: todayGenerated.count || 0,
    draft: draftCount.count || 0,
    published: publishedCount.count || 0,
    today_published: todayPublished.count || 0,
    scheduled: scheduledCount.count || 0,
    total_views: totalViewCount,
    personas: personaStats.data || [],
    channels: channelCount.data || [],
  });
}
