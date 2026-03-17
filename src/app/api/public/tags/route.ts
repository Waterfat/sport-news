import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * Tags API
 * GET ?article_id=xxx  - 查詢文章的標籤
 * GET ?tag_name=xxx    - 查詢使用此標籤的文章
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const articleId = searchParams.get("article_id");
    const tagName = searchParams.get("tag_name");

    if (articleId) {
      // Get tags for a specific article
      const { data, error } = await supabase
        .from("article_tags")
        .select("tag_name")
        .eq("article_id", articleId)
        .order("created_at", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        tags: (data || []).map((t) => t.tag_name),
      });
    }

    if (tagName) {
      // Get articles with a specific tag
      const { data, error } = await supabase
        .from("article_tags")
        .select("article_id, generated_articles(id, title, slug, category, published_at)")
        .eq("tag_name", tagName)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        tag: tagName,
        articles: (data || []).map((t) => t.generated_articles).filter(Boolean),
      });
    }

    return NextResponse.json(
      { error: "Missing article_id or tag_name parameter" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[Tags API] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
