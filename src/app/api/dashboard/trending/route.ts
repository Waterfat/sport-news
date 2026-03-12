import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { analyzeTrending } from "@/lib/trending";
import { RawArticle } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createServiceClient();

    // 查詢近 24 小時的 raw_articles
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("raw_articles")
      .select("id, source, title, content, url, category, crawled_at, is_processed")
      .gte("crawled_at", twentyFourHoursAgo)
      .order("crawled_at", { ascending: false });

    if (error) {
      console.error("Error fetching raw_articles:", error);
      return NextResponse.json(
        { error: "Failed to fetch articles" },
        { status: 500 }
      );
    }

    const articles = (data || []) as RawArticle[];
    const result = analyzeTrending(articles);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Trending analysis error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
