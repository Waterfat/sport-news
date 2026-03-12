import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { publishToChannel } from "@/lib/publishers";

// POST: 批次操作文章（通過審核、退回、刪除）
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: string };

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  if (!["approved", "rejected", "delete"].includes(action)) {
    return NextResponse.json(
      { error: "action must be approved, rejected, or delete" },
      { status: 400 }
    );
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("generated_articles")
      .delete()
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  }

  // approved or rejected
  const { error } = await supabase
    .from("generated_articles")
    .update({ status: action })
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 通過審核時自動發布到啟用的頻道
  let published = 0;
  if (action === "approved") {
    const { data: channels } = await supabase
      .from("publish_channels")
      .select("*")
      .eq("is_active", true);

    if (channels && channels.length > 0) {
      const { data: articles } = await supabase
        .from("generated_articles")
        .select("id, title, content, slug, images")
        .in("id", ids);

      if (articles) {
        for (const article of articles) {
          const results = await Promise.all(
            channels.map((ch) =>
              publishToChannel(
                {
                  title: article.title,
                  content: article.content,
                  slug: article.slug,
                  images: extractImageUrls(article.images),
                },
                ch
              )
            )
          );
          const ok = results.filter((r) => r.success).length;
          if (ok > 0) {
            published++;
            // 更新為 published
            await supabase
              .from("generated_articles")
              .update({ status: "published", published_at: new Date().toISOString() })
              .eq("id", article.id);
          }
        }
      }
    }
  }

  return NextResponse.json({ success: true, updated: ids.length, published });
}

// generated_articles.images 可能是 ArticleImage[] 或 string[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrls(images: any): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img: string | { url?: string }) =>
      typeof img === "string" ? img : img?.url
    )
    .filter((url: string | undefined): url is string => !!url);
}
