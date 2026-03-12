import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { publishToChannel } from "@/lib/publishers";

// POST: Manual publish trigger - publishes article to specified channels
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { article_id, channel_ids } = body as {
      article_id: string;
      channel_ids: number[];
    };

    if (!article_id) {
      return NextResponse.json(
        { error: "article_id is required" },
        { status: 400 }
      );
    }

    if (!channel_ids || !Array.isArray(channel_ids) || channel_ids.length === 0) {
      return NextResponse.json(
        { error: "channel_ids must be a non-empty array" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Fetch the article
    const { data: article, error: articleError } = await supabase
      .from("generated_articles")
      .select("*")
      .eq("id", article_id)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // Fetch the channels
    const { data: channels, error: channelsError } = await supabase
      .from("publish_channels")
      .select("*")
      .in("id", channel_ids);

    if (channelsError || !channels || channels.length === 0) {
      return NextResponse.json(
        { error: "No valid channels found" },
        { status: 404 }
      );
    }

    // Publish to each channel concurrently
    const results = await Promise.all(
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
    );

    // Update article status to published if not already
    if (article.status !== "published") {
      await supabase
        .from("generated_articles")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", article_id);
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      article_id,
      published: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (err) {
    console.error("[Publish] Error:", err);
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
