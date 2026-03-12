import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET: Analytics data for admin dashboard
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Run all queries concurrently
    const [topArticlesResult, allArticlesResult] = await Promise.all([
      // Top 10 articles by view count
      supabase
        .from("generated_articles")
        .select("id, title, slug, category, view_count, published_at")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(10),

      // All published articles for aggregation (views by day, by category)
      supabase
        .from("generated_articles")
        .select("id, category, view_count, published_at")
        .eq("status", "published"),
    ]);

    if (topArticlesResult.error) {
      return NextResponse.json(
        { error: topArticlesResult.error.message },
        { status: 500 }
      );
    }

    if (allArticlesResult.error) {
      return NextResponse.json(
        { error: allArticlesResult.error.message },
        { status: 500 }
      );
    }

    const allArticles = allArticlesResult.data || [];

    // Views by category
    const viewsByCategory: Record<string, { articles: number; views: number }> = {};
    for (const article of allArticles) {
      const cat = article.category || "uncategorized";
      if (!viewsByCategory[cat]) {
        viewsByCategory[cat] = { articles: 0, views: 0 };
      }
      viewsByCategory[cat].articles += 1;
      viewsByCategory[cat].views += article.view_count || 0;
    }

    // Views by day (last 30 days) - based on published_at date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsByDay: Record<string, { articles: number; views: number }> = {};

    // Initialize all 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      viewsByDay[dateKey] = { articles: 0, views: 0 };
    }

    for (const article of allArticles) {
      if (!article.published_at) continue;
      const dateKey = article.published_at.split("T")[0];
      if (viewsByDay[dateKey] !== undefined) {
        viewsByDay[dateKey].articles += 1;
        viewsByDay[dateKey].views += article.view_count || 0;
      }
    }

    // Convert to sorted array
    const viewsByDayArray = Object.entries(viewsByDay)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Total stats
    const totalViews = allArticles.reduce(
      (sum, a) => sum + (a.view_count || 0),
      0
    );
    const totalArticles = allArticles.length;

    return NextResponse.json({
      top_articles: topArticlesResult.data || [],
      views_by_day: viewsByDayArray,
      views_by_category: viewsByCategory,
      totals: {
        total_views: totalViews,
        total_articles: totalArticles,
      },
    });
  } catch (err) {
    console.error("[Analytics] Error:", err);
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
