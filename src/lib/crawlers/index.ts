import { createServiceClient } from "@/lib/supabase";
import type { CrawledArticle } from "./types";
import { SPORTS, type SportKey } from "@/lib/sport-config";
import { crawlGeneric } from "./generic";
import { ensureBucket, downloadAndStoreImages } from "@/lib/image-storage";

interface CrawlSource {
  id: number;
  name: string;
  base_url: string;
  is_active: boolean;
}

interface SportConfig {
  enabled: boolean;
  sources: string[];
  label: string;
}

// 從 DB 讀取球種設定（含來源）
async function getSportConfigs(
  supabase: ReturnType<typeof createServiceClient>
): Promise<Map<string, SportConfig>> {
  const { data, error } = await supabase
    .from("sport_settings")
    .select("sport_key, enabled, sources");

  const configs = new Map<string, SportConfig>();

  for (const [, sport] of Object.entries(SPORTS)) {
    configs.set(sport.label, {
      enabled: sport.enabled,
      sources: [],
      label: sport.label,
    });
  }

  if (!error && data) {
    for (const row of data) {
      if (row.sport_key in SPORTS) {
        const label = SPORTS[row.sport_key as SportKey].label;
        configs.set(label, {
          enabled: row.enabled,
          sources: row.sources || [],
          label,
        });
      }
    }
  }

  return configs;
}

// 從 DB 讀取所有啟用的爬蟲來源
async function getActiveSources(
  supabase: ReturnType<typeof createServiceClient>
): Promise<CrawlSource[]> {
  const { data, error } = await supabase
    .from("crawl_sources")
    .select("*")
    .eq("is_active", true);

  if (error || !data) return [];
  return data;
}

export async function runAllCrawlers(): Promise<{
  total: number;
  saved: number;
  filtered: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  let total = 0;
  let saved = 0;
  let filtered = 0;
  const errors: string[] = [];

  const [sportConfigs, allSources] = await Promise.all([
    getSportConfigs(supabase),
    getActiveSources(supabase),
  ]);

  // 找出需要執行的來源（至少有一個啟用球種使用該來源）
  const neededSourceNames = new Set<string>();
  for (const config of sportConfigs.values()) {
    if (config.enabled) {
      for (const source of config.sources) {
        neededSourceNames.add(source);
      }
    }
  }

  const sourcesToRun = allSources.filter((s) => neededSourceNames.has(s.name));
  console.log(
    `[Crawler] Running sources: ${sourcesToRun.map((s) => s.name).join(", ") || "(none)"}`
  );

  // 並行執行所有爬蟲（全部使用通用爬蟲）
  const results = await Promise.allSettled(
    sourcesToRun.map((source) => crawlGeneric(source.name, source.base_url))
  );

  const allArticles: CrawledArticle[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      allArticles.push(...result.value);
      console.log(
        `[Crawler] ${sourcesToRun[index].name}: ${result.value.length} articles`
      );
    } else {
      const msg = `[Crawler] ${sourcesToRun[index].name} failed: ${result.reason}`;
      console.error(msg);
      errors.push(msg);
    }
  });

  total = allArticles.length;

  // 根據球種設定過濾
  const filteredArticles = allArticles.filter((article) => {
    if (!article.category) return false;
    const config = sportConfigs.get(article.category);
    if (!config || !config.enabled) return false;
    return config.sources.includes(article.source);
  });

  filtered = total - filteredArticles.length;
  console.log(`[Crawler] Filtered out ${filtered} articles`);

  // 確保 Storage bucket 存在
  await ensureBucket();

  // 批次寫入資料庫（含圖片下載）
  for (const article of filteredArticles) {
    try {
      // 下載圖片到 Supabase Storage
      let storedImages = article.images;
      if (article.images.length > 0) {
        const downloaded = await downloadAndStoreImages(article.images, article.source);
        if (downloaded.length > 0) {
          storedImages = downloaded;
          console.log(`[Crawler] Downloaded ${downloaded.length}/${article.images.length} images for "${article.title}"`);
        }
      }

      const { error } = await supabase.from("raw_articles").upsert(
        {
          source: article.source,
          title: article.title,
          content: article.content,
          images: storedImages,
          url: article.url,
          category: article.category,
        },
        { onConflict: "url", ignoreDuplicates: true }
      );

      if (error) {
        errors.push(`[DB] Failed to save "${article.title}": ${error.message}`);
      } else {
        saved++;
      }
    } catch (err) {
      errors.push(`[DB] Exception saving "${article.title}": ${err}`);
    }
  }

  console.log(
    `[Crawler] Done: ${saved}/${total} articles saved (${filtered} filtered)`
  );
  return { total, saved, filtered, errors };
}

export type { CrawledArticle };
