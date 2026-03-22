/**
 * 總編輯審稿腳本
 *
 * 讀取 generated_articles 中 status='draft' AND review_status='pending' 的文章，
 * 呼叫 Claude AI 進行 9 項審查，更新 review_status/review_result/reviewed_at。
 *
 * 使用方式：
 *   npx tsx scripts/editor-in-chief.ts
 *   npx tsx scripts/editor-in-chief.ts --article-ids id1,id2
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { callClaude } from "./shared-claude";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fmakjkvkmbltqgyndijb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface ReviewResult {
  decision: "approved" | "rejected";
  scores: {
    title_quality: number;
    content_quality: number;
    fact_check: number;
    brand_tone: number;
    seo: number;
    overall: number;
  };
  checks?: {
    topic_unique: "pass" | "fail";
    image_unique: "pass" | "fail";
    has_image: "pass" | "fail";
  };
  reject_reasons: string[];
  suggestions: string[];
}

function extractFirstJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') depth--;
    if (depth === 0) return text.substring(start, i + 1);
  }
  return null;
}

function parseReviewResult(output: string): ReviewResult {
  if (!output.trim()) {
    throw new Error("Claude returned empty response");
  }
  const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  const jsonStr = extractFirstJson(cleaned);
  if (!jsonStr || !jsonStr.includes('"decision"')) {
    throw new Error(`Response is not valid JSON: ${output.substring(0, 300)}`);
  }
  return JSON.parse(jsonStr);
}

function buildReviewPrompt(
  article: { title: string; content: string; images: unknown[] },
  rawArticlesContent: string,
  recentTitles: string[],
  recentImages: string[]
): string {
  const imageList = Array.isArray(article.images)
    ? article.images
        .map((img) => (typeof img === "string" ? img : (img as { url?: string })?.url || ""))
        .filter(Boolean)
        .join("\n")
    : "（無圖片）";

  return `你是 Howger Sport 的總編輯。審查以下文章是否達到發布標準。

審查項目：
1. 標題品質（1-10）— 吸引人、準確、非標題黨
2. 內容品質（1-10）— 流暢度、深度、可讀性、結構
3. 事實查核（1-10）— 對照原始素材，無捏造或扭曲
4. 品牌調性（1-10）— 符合 Howger Sport 定位（專業體育媒體、繁體中文、球員名保留英文）
5. SEO 優化（1-10）— 關鍵字、結構、標題長度
6. 整體品質（1-10）— 綜合評分
7. 題材未重複（pass/fail）— 對比近期文章標題，主題不可重複
8. 圖片未重複（pass/fail）— 對比近期文章圖片，封面圖不可重複
9. 有圖片（pass/fail）— 至少一張圖片

判斷標準：
- 項目 1-6 平均 >= 6 分 且 無任何項 < 4 分
- 項目 7-9 全部 pass
- 符合以上 → approved，否則 → rejected

待審文章：
標題：${article.title}
內容：${article.content}
圖片：
${imageList}

原始素材：
${rawArticlesContent}

近 7 天已發布文章標題：
${recentTitles.length > 0 ? recentTitles.map((t, i) => `${i + 1}. ${t}`).join("\n") : "（無近期文章）"}

近 7 天已發布文章圖片：
${recentImages.length > 0 ? recentImages.join("\n") : "（無近期圖片）"}

只回覆 JSON，不要 markdown code block：
{"decision": "approved|rejected", "scores": {"title_quality": N, "content_quality": N, "fact_check": N, "brand_tone": N, "seo": N, "overall": N}, "checks": {"topic_unique": "pass|fail", "image_unique": "pass|fail", "has_image": "pass|fail"}, "reject_reasons": ["原因"], "suggestions": ["建議"]}`;
}

const ARTICLE_STATUS_PUBLISHED = "published";

/**
 * 審稿通過後自動發布：封面圖去重 + 更新狀態為 published
 * 注意：此函式直接操作 DB，不經過 src/lib/publish-article.ts 的統一入口，
 * 因為 scripts/ 環境無法 import @/ 路徑別名模組。
 * 頻道發布（Telegram 等）由 rewrite-listener 的 auto-pipeline API 處理。
 */
async function autoPublish(
  articleId: string,
  images: unknown
): Promise<{ success: boolean; error?: string }> {
  // 檢查圖片
  const articleImages = extractImageUrls(images);
  if (articleImages.length === 0) {
    return { success: false, error: "無圖片，無法發布" };
  }

  // 封面圖去重：查已發布文章的封面圖
  const { data: publishedCovers } = await supabase
    .from("generated_articles")
    .select("images")
    .eq("status", ARTICLE_STATUS_PUBLISHED)
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

  // 如果封面圖重複，嘗試用其他圖片替代
  let finalImages = articleImages;
  if (articleImages.length > 1 && existingCovers.has(articleImages[0])) {
    const altIndex = articleImages.findIndex(
      (url, i) => i > 0 && !existingCovers.has(url)
    );
    if (altIndex !== -1) {
      finalImages = [...articleImages];
      const [alt] = finalImages.splice(altIndex, 1);
      finalImages.unshift(alt);
    }
  }

  // 更新文章狀態為 published
  const updateData: Record<string, unknown> = {
    status: ARTICLE_STATUS_PUBLISHED,
    published_at: new Date().toISOString(),
  };

  // 如果封面圖有調整，同時更新 images
  if (finalImages[0] !== articleImages[0]) {
    updateData.images = finalImages;
  }

  const { error: publishError } = await supabase
    .from("generated_articles")
    .update(updateData)
    .eq("id", articleId);

  if (publishError) {
    return { success: false, error: publishError.message };
  }

  return { success: true };
}

/** 排除指向內部網路的 URL（防 SSRF），與 src/lib/publish-article.ts 保持一致 */
function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      (hostname.startsWith("172.") && (() => {
        const second = parseInt(hostname.split(".")[1], 10);
        return second >= 16 && second <= 31;
      })())
    ) {
      return false;
    }
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
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
    .filter((url): url is string => typeof url === "string" && url.startsWith("http") && isSafeImageUrl(url));
}

async function main() {
  console.log(`\n[${new Date().toLocaleString("zh-TW")}] === 總編輯審稿開始 ===`);

  // 解析 CLI 參數
  const articleIdsArg = process.argv.indexOf("--article-ids");
  let articleIds: string[] | null = null;
  if (articleIdsArg !== -1 && process.argv[articleIdsArg + 1]) {
    articleIds = process.argv[articleIdsArg + 1].split(",").filter(Boolean);
  }

  // 查詢待審文章
  let query = supabase
    .from("generated_articles")
    .select("id, title, content, images, raw_article_ids")
    .eq("status", "draft")
    .eq("review_status", "pending");

  if (articleIds && articleIds.length > 0) {
    query = query.in("id", articleIds);
  }

  const { data: pendingArticles, error: queryError } = await query
    .order("created_at", { ascending: true })
    .limit(20);

  if (queryError) {
    console.error(`查詢失敗: ${queryError.message}`);
    process.exit(1);
  }

  if (!pendingArticles || pendingArticles.length === 0) {
    console.log("沒有待審文章");
    return;
  }

  console.log(`找到 ${pendingArticles.length} 篇待審文章`);

  // 取得近 7 天已發布文章的標題和圖片（供去重比對）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentArticles } = await supabase
    .from("generated_articles")
    .select("title, images")
    .eq("status", "published")
    .gte("published_at", sevenDaysAgo.toISOString())
    .order("published_at", { ascending: false })
    .limit(100);

  const recentTitles = (recentArticles || []).map((a) => a.title);
  const recentImages: string[] = [];
  for (const a of recentArticles || []) {
    if (Array.isArray(a.images) && a.images.length > 0) {
      const firstImg = a.images[0];
      const url = typeof firstImg === "string" ? firstImg : (firstImg as { url?: string })?.url;
      if (url) recentImages.push(url);
    }
  }

  let approved = 0;
  let rejected = 0;
  let failed = 0;

  for (const article of pendingArticles) {
    console.log(`\n  審查: "${article.title}"`);

    try {
      // 取得原始素材內容
      let rawArticlesContent = "（無原始素材）";
      if (article.raw_article_ids && article.raw_article_ids.length > 0) {
        const { data: rawArticles } = await supabase
          .from("raw_articles")
          .select("title, content, source")
          .in("id", article.raw_article_ids);

        if (rawArticles && rawArticles.length > 0) {
          rawArticlesContent = rawArticles
            .map((r, i) => `【素材 ${i + 1}】${r.source}: ${r.title}\n${r.content.substring(0, 800)}`)
            .join("\n\n---\n\n");
        }
      }

      const prompt = buildReviewPrompt(
        article,
        rawArticlesContent,
        recentTitles,
        recentImages
      );

      const output = callClaude(prompt);
      const result = parseReviewResult(output);

      // 更新審查結果
      const { error: updateError } = await supabase
        .from("generated_articles")
        .update({
          review_status: result.decision,
          review_result: result,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", article.id);

      if (updateError) {
        console.error(`    更新失敗: ${updateError.message}`);
        failed++;
        continue;
      }

      if (result.decision === "approved") {
        const avgScore = (
          (result.scores.title_quality +
            result.scores.content_quality +
            result.scores.fact_check +
            result.scores.brand_tone +
            result.scores.seo +
            result.scores.overall) /
          6
        ).toFixed(1);
        console.log(`    通過 (平均分: ${avgScore})`);

        // 自動發布：封面圖去重 + 更新狀態
        const publishResult = await autoPublish(article.id, article.images);
        if (publishResult.success) {
          console.log(`    已自動發布`);
          approved++;
        } else {
          console.error(`    發布失敗: ${publishResult.error}`);
          // 發布失敗但審稿已通過 — review_status 保持 approved，
          // 文章可在後台手動發布，不會被遺忘
          failed++;
        }
      } else {
        console.log(`    退回: ${result.reject_reasons.join(", ")}`);
        rejected++;
      }
    } catch (err) {
      console.error(`    審查失敗: ${err}`);
      failed++;
    }
  }

  console.log(`\n=== 審稿結果: 通過 ${approved}, 退回 ${rejected}, 失敗 ${failed} ===`);
}

main().catch(console.error);
