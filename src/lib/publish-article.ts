import { createServiceClient } from "@/lib/supabase";
import { publishToChannel } from "@/lib/publishers";

interface PublishResult {
  success: boolean;
  article_id: string;
  title: string;
  channels_published: number;
  channels_failed: number;
  errors: string[];
}

/**
 * 統一發布邏輯：更新 DB 狀態 + 發送到勾選的頻道
 * - 讀取文章的 publish_channel_ids
 * - 如果沒有指定頻道，預設發送到所有啟用的頻道
 */
export async function publishArticle(articleId: string): Promise<PublishResult> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  // 讀取文章
  const { data: article, error: articleError } = await supabase
    .from("generated_articles")
    .select("id, title, content, slug, images, publish_channel_ids")
    .eq("id", articleId)
    .single();

  if (articleError || !article) {
    return {
      success: false,
      article_id: articleId,
      title: "",
      channels_published: 0,
      channels_failed: 0,
      errors: [articleError?.message || "Article not found"],
    };
  }

  // 決定要發到哪些頻道
  const channelIds: number[] = article.publish_channel_ids || [];
  let channels;

  if (channelIds.length > 0) {
    // 有指定頻道：只發到指定的
    const { data } = await supabase
      .from("publish_channels")
      .select("*")
      .in("id", channelIds)
      .eq("is_active", true);
    channels = data || [];
  } else {
    // 沒指定：發到所有啟用的頻道
    const { data } = await supabase
      .from("publish_channels")
      .select("*")
      .eq("is_active", true);
    channels = data || [];
  }

  // 發送到各頻道
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

  const successCount = results.filter((r) => r.success).length;
  const failedErrors = results
    .filter((r) => !r.success)
    .map((r) => `${r.channel_name}: ${r.error}`);
  errors.push(...failedErrors);

  // 更新文章狀態
  const { error: updateError } = await supabase
    .from("generated_articles")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", articleId);

  if (updateError) {
    errors.push(`DB update failed: ${updateError.message}`);
  }

  return {
    success: errors.length === 0,
    article_id: articleId,
    title: article.title,
    channels_published: successCount,
    channels_failed: results.length - successCount,
    errors,
  };
}

function extractImageUrls(images: unknown): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img: string | { url?: string }) =>
      typeof img === "string" ? img : img?.url
    )
    .filter((url: string | undefined): url is string => !!url);
}
