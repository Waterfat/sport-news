import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { publishToChannel } from "@/lib/publishers";

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

    // Find articles that are approved and scheduled_at <= now
    const { data: articles, error: fetchError } = await supabase
      .from("generated_articles")
      .select("*")
      .eq("status", "approved")
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

    const summary: Array<{
      article_id: string;
      title: string;
      channels_published: number;
      channels_failed: number;
      errors: string[];
    }> = [];

    for (const article of articles) {
      const channelIds: number[] = article.publish_channel_ids || [];

      if (channelIds.length === 0) {
        // No channels assigned, just mark as published
        await supabase
          .from("generated_articles")
          .update({
            status: "published",
            published_at: now,
          })
          .eq("id", article.id);

        summary.push({
          article_id: article.id,
          title: article.title,
          channels_published: 0,
          channels_failed: 0,
          errors: [],
        });
        continue;
      }

      // Fetch channels
      const { data: channels } = await supabase
        .from("publish_channels")
        .select("*")
        .in("id", channelIds)
        .eq("is_active", true);

      const results = channels
        ? await Promise.all(
            channels.map((channel) =>
              publishToChannel(
                {
                  title: article.title,
                  content: article.content,
                  slug: article.slug,
                },
                channel
              )
            )
          )
        : [];

      const successCount = results.filter((r) => r.success).length;
      const errors = results
        .filter((r) => !r.success)
        .map((r) => `${r.channel_name}: ${r.error}`);

      // Update article status
      await supabase
        .from("generated_articles")
        .update({
          status: "published",
          published_at: now,
        })
        .eq("id", article.id);

      summary.push({
        article_id: article.id,
        title: article.title,
        channels_published: successCount,
        channels_failed: results.length - successCount,
        errors,
      });
    }

    return NextResponse.json({
      success: true,
      published: summary.length,
      summary,
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
