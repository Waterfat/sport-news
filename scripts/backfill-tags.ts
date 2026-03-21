/**
 * 一次性回填腳本：為現有文章補上標籤
 *
 * 掃描所有 generated_articles 中 tags 為空陣列的文章，
 * 根據標題和內容提取球隊名、聯盟名作為標籤。
 *
 * 使用方式：npx tsx scripts/backfill-tags.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { extractTagsFromContent } from "./shared-tags";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("=== 文章標籤回填腳本 ===\n");

  // 查詢所有 tags 為空的文章
  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, title, content")
    .or("tags.eq.{},tags.is.null")
    .order("created_at");

  if (error) {
    console.error(`查詢失敗: ${error.message}`);
    process.exit(1);
  }

  console.log(`找到 ${articles.length} 篇需要回填標籤的文章\n`);

  let updated = 0;
  let skipped = 0;

  for (const article of articles) {
    const tags = extractTagsFromContent(article.title, article.content || "");

    if (tags.length === 0) {
      console.log(`  跳過: ${article.title.substring(0, 50)}... (無法提取標籤)`);
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("generated_articles")
      .update({ tags })
      .eq("id", article.id);

    if (updateError) {
      console.error(`  ✗ ${article.title.substring(0, 50)}... 更新失敗: ${updateError.message}`);
      continue;
    }

    console.log(`  ✓ ${article.title.substring(0, 50)}... → [${tags.join(", ")}]`);
    updated++;
  }

  console.log(`\n=== 完成 ===`);
  console.log(`更新: ${updated} 篇`);
  console.log(`跳過: ${skipped} 篇`);
  console.log(`總計: ${articles.length} 篇`);
}

main().catch(console.error);
