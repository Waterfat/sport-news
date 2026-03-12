import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { publishArticle } from "@/lib/publish-article";

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

// 更新文章（編輯、審核、發布）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  const isPublishing = body.status === "published";

  // 如果是發布動作，先儲存 publish_channel_ids，再走統一發布流程
  if (isPublishing) {
    // 先更新 publish_channel_ids（如果有傳）
    if (body.publish_channel_ids !== undefined) {
      await supabase
        .from("generated_articles")
        .update({ publish_channel_ids: body.publish_channel_ids })
        .eq("id", id);
    }

    // 統一發布邏輯（更新狀態 + 發送頻道）
    const result = await publishArticle(id);

    if (result.errors.length > 0) {
      console.error(`[Publish] ${id} errors:`, result.errors);
    }

    // 回傳更新後的文章
    const { data } = await supabase
      .from("generated_articles")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json({ article: data });
  }

  // 非發布的一般更新（編輯、排程等）
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
