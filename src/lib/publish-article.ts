import { createServiceClient } from "@/lib/supabase";
import { publishToChannel } from "@/lib/publishers";
import { ARTICLE_STATUS } from "@/lib/constants";

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
 * - 發布前自動偵測重複封面圖並遞補
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

  // 封面圖去重：查詢已發布文章的封面圖，重複時自動遞補
  const articleImages = extractImageUrls(article.images);
  if (articleImages.length > 0) {
    const { data: publishedCovers } = await supabase
      .from("generated_articles")
      .select("images")
      .eq("status", ARTICLE_STATUS.PUBLISHED)
      .neq("id", articleId)
      .order("published_at", { ascending: false })
      .limit(500);

    const existingCovers = new Set<string>();
    for (const row of publishedCovers || []) {
      const urls = extractImageUrls(row.images);
      if (urls.length > 0) {
        existingCovers.add(urls[0]);
      }
    }

    const deduped = deduplicateCoverImage(articleImages, existingCovers);
    if (deduped[0] !== articleImages[0]) {
      const { error: dedupUpdateError } = await supabase
        .from("generated_articles")
        .update({ images: deduped })
        .eq("id", articleId);
      if (dedupUpdateError) {
        errors.push(`Cover image dedup update failed: ${dedupUpdateError.message}`);
      } else {
        article.images = deduped;
      }
    }
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
      status: ARTICLE_STATUS.PUBLISHED,
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

/**
 * 封面圖去重：如果 images[0] 已被其他已發布文章使用，
 * 找第一張不在 existingCovers 中的圖片移到首位。
 * 若全部重複或只有一張圖，維持原樣。
 */
export function deduplicateCoverImage(
  images: string[],
  existingCovers: Set<string>
): string[] {
  if (images.length <= 1 || !existingCovers.has(images[0])) {
    return images;
  }

  const altIndex = images.findIndex(
    (url, i) => i > 0 && !existingCovers.has(url)
  );

  if (altIndex === -1) {
    return images;
  }

  const result = [...images];
  const [alt] = result.splice(altIndex, 1);
  result.unshift(alt);
  return result;
}

function extractImageUrls(images: unknown): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img: unknown) => {
      if (typeof img === "string") return img;
      if (typeof img === "object" && img !== null && "url" in img) {
        const url = (img as { url?: unknown }).url;
        return typeof url === "string" ? url : undefined;
      }
      return undefined;
    })
    .filter((url): url is string => typeof url === "string" && url.startsWith("http"));
}
