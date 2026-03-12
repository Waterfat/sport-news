import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// 取得單篇改寫文章詳情
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("generated_articles")
    .select("*, writer_personas(*)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // 取得關聯的原始文章
  const rawArticleIds = data.raw_article_ids || [];
  let rawArticles: unknown[] = [];
  if (rawArticleIds.length > 0) {
    const { data: raws } = await supabase
      .from("raw_articles")
      .select("*")
      .in("id", rawArticleIds);
    rawArticles = raws || [];
  }

  return NextResponse.json({ article: data, rawArticles });
}

// 更新文章（編輯、審核）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  const allowedFields = [
    "title",
    "content",
    "images",
    "status",
    "reviewer_note",
    "published_at",
    "scheduled_at",
    "publish_channel_ids",
  ];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // 如果狀態改為 published，設定 published_at
  if (updateData.status === "published") {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("generated_articles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ article: data });
}
