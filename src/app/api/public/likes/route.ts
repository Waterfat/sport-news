import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { createHash } from "crypto";

function getIpHash(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

// GET: Get like count for an article
export async function GET(request: NextRequest) {
  try {
    const articleId = request.nextUrl.searchParams.get("article_id");

    if (!articleId) {
      return NextResponse.json(
        { error: "article_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { count, error } = await supabase
      .from("article_likes")
      .select("*", { count: "exact", head: true })
      .eq("article_id", articleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if current user already liked
    const ipHash = getIpHash(request);
    const { data: existingLike } = await supabase
      .from("article_likes")
      .select("id")
      .eq("article_id", articleId)
      .eq("ip_hash", ipHash)
      .maybeSingle();

    return NextResponse.json({
      article_id: articleId,
      likes: count || 0,
      liked: !!existingLike,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}

// POST: Toggle like for an article (uses IP hash for dedup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { article_id } = body as { article_id: string };

    if (!article_id) {
      return NextResponse.json(
        { error: "article_id is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const ipHash = getIpHash(request);

    // Check if already liked
    const { data: existingLike } = await supabase
      .from("article_likes")
      .select("id")
      .eq("article_id", article_id)
      .eq("ip_hash", ipHash)
      .maybeSingle();

    if (existingLike) {
      // Unlike: remove the like
      const { error } = await supabase
        .from("article_likes")
        .delete()
        .eq("id", existingLike.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Get updated count
      const { count } = await supabase
        .from("article_likes")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article_id);

      return NextResponse.json({ success: true, liked: false, count: count || 0 });
    } else {
      // Like: insert new like
      const { error } = await supabase
        .from("article_likes")
        .insert({ article_id, ip_hash: ipHash });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { count } = await supabase
        .from("article_likes")
        .select("*", { count: "exact", head: true })
        .eq("article_id", article_id);

      return NextResponse.json({ success: true, liked: true, count: count || 0 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
