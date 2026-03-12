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
    approvedCount,
    publishedCount,
    rejectedCount,
    personaStats,
    todayRaw,
    todayGenerated,
    channelCount,
    todayPublished,
    scheduledCount,
  ] = await Promise.all([
    supabase.from("raw_articles").select("*", { count: "exact", head: true }),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft"),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected"),
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
      .not("scheduled_at", "is", null)
      .eq("status", "approved"),
  ]);

  return NextResponse.json({
    raw_articles_total: rawCount.count || 0,
    today_raw: todayRaw.count || 0,
    today_generated: todayGenerated.count || 0,
    draft: draftCount.count || 0,
    approved: approvedCount.count || 0,
    published: publishedCount.count || 0,
    rejected: rejectedCount.count || 0,
    personas: personaStats.data || [],
    channels: channelCount.data || [],
    today_published: todayPublished.count || 0,
    scheduled: scheduledCount.count || 0,
  });
}
