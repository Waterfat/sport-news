import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createHash } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = createServiceClient();

    // Try to find article by slug first, then by id
    let { data: article } = await supabase
      .from("generated_articles")
      .select("id, view_count")
      .eq("slug", slug)
      .single();

    if (!article) {
      const { data } = await supabase
        .from("generated_articles")
        .select("id, view_count")
        .eq("id", slug)
        .single();
      article = data;
    }

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Increment view_count
    const newCount = (article.view_count || 0) + 1;
    await supabase
      .from("generated_articles")
      .update({ view_count: newCount })
      .eq("id", article.id);

    // Record detailed view for analytics
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 16);
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    await supabase.from("article_views").insert({
      article_id: article.id,
      ip_hash: ipHash,
      user_agent: userAgent.slice(0, 500),
      referrer: referrer.slice(0, 500),
    });

    return NextResponse.json({ success: true, view_count: newCount });
  } catch (err) {
    console.error("[View Count] Error:", err);
    return NextResponse.json({ error: `Internal error: ${err}` }, { status: 500 });
  }
}
