import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase";

/**
 * Bookmarks API
 * GET:    查詢會員的收藏列表 (可選 ?article_id=xxx 查詢是否已收藏)
 * POST:   新增收藏 { article_id }
 * DELETE:  取消收藏 { article_id }
 */

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.memberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const articleId = searchParams.get("article_id");

    if (articleId) {
      // Check if specific article is bookmarked
      const { data } = await supabase
        .from("article_bookmarks")
        .select("id")
        .eq("member_id", session.user.memberId)
        .eq("article_id", articleId)
        .maybeSingle();

      return NextResponse.json({ bookmarked: !!data });
    }

    // Get all bookmarks
    const { data, error } = await supabase
      .from("article_bookmarks")
      .select("article_id, created_at, generated_articles(id, title, slug, category, published_at)")
      .eq("member_id", session.user.memberId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      bookmarks: (data || []).map((b) => ({
        article_id: b.article_id,
        created_at: b.created_at,
        article: b.generated_articles,
      })),
    });
  } catch (err) {
    console.error("[Bookmarks] GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.memberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { article_id } = await request.json();
    if (!article_id) {
      return NextResponse.json({ error: "Missing article_id" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("article_bookmarks")
      .upsert(
        { member_id: session.user.memberId, article_id },
        { onConflict: "member_id,article_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: true });
  } catch (err) {
    console.error("[Bookmarks] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.memberId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { article_id } = await request.json();
    if (!article_id) {
      return NextResponse.json({ error: "Missing article_id" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("article_bookmarks")
      .delete()
      .eq("member_id", session.user.memberId)
      .eq("article_id", article_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bookmarked: false });
  } catch (err) {
    console.error("[Bookmarks] DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
