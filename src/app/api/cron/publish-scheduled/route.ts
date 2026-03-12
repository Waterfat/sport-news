import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { publishArticle } from "@/lib/publish-article";

export const maxDuration = 60;

// GET: Cron job to publish scheduled articles
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Find articles that are scheduled (draft/approved with scheduled_at <= now)
    const { data: articles, error: fetchError } = await supabase
      .from("generated_articles")
      .select("id, title")
      .in("status", ["draft", "approved"])
      .not("scheduled_at", "is", null)
      .lte("scheduled_at", now);

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No scheduled articles to publish",
        published: 0,
        timestamp: now,
      });
    }

    // 統一發布邏輯
    const results = [];
    for (const article of articles) {
      const result = await publishArticle(article.id);
      results.push(result);
    }

    const published = results.filter((r) => r.success).length;

    console.log(
      `[Cron/PublishScheduled] Published ${published}/${articles.length} articles`
    );

    return NextResponse.json({
      success: true,
      published,
      results,
      timestamp: now,
    });
  } catch (err) {
    console.error("[Cron/PublishScheduled] Error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
