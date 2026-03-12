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

interface CrawlResult {
  total: number;
  saved: number;
  duplicate: number;
  filtered: number;
  errors: string[];
}

// 儲存文章到 DB（含圖片下載、去重計數）
async function saveArticles(
  supabase: ReturnType<typeof createServiceClient>,
  articles: CrawledArticle[]
): Promise<{ saved: number; duplicate: number; errors: string[] }> {
  let saved = 0;
  let duplicate = 0;
  const errors: string[] = [];

  if (articles.length === 0) return { saved, duplicate, errors };

  await ensureBucket();

  // 批次查詢已存在的 URL
  const urls = articles.map((a) => a.url);
  const { data: existing } = await supabase
    .from("raw_articles")
    .select("url")
    .in("url", urls);
  const existingUrls = new Set((existing || []).map((r) => r.url));

  for (const article of articles) {
    if (existingUrls.has(article.url)) {
      duplicate++;
      continue;
    }

    try {
      let storedImages = article.images;
      if (article.images.length > 0) {
        const downloaded = await downloadAndStoreImages(article.images, article.source);
        if (downloaded.length > 0) {
          storedImages = downloaded;
          console.log(`[Crawler] Downloaded ${downloaded.length}/${article.images.length} images for "${article.title}"`);
        }
      }

      const { error } = await supabase.from("raw_articles").insert({
        source: article.source,
        title: article.title,
        content: article.content,
        images: storedImages,
        url: article.url,
        category: article.category,
      });

      if (error) {
        if (error.code === "23505") {
          // unique violation — race condition
          duplicate++;
        } else {
          errors.push(`Failed to save "${article.title}": ${error.message}`);
        }
      } else {
        saved++;
      }
    } catch (err) {
      errors.push(`Exception saving "${article.title}": ${err}`);
    }
  }

  return { saved, duplicate, errors };
}

// 球種過濾
function filterByCategory(
  articles: CrawledArticle[],
  sportConfigs: Map<string, SportConfig>
): CrawledArticle[] {
  return articles.filter((article) => {
    if (!article.category) return false;
    const config = sportConfigs.get(article.category);
    if (!config || !config.enabled) return false;
    return config.sources.includes(article.source);
  });
}

export async function runAllCrawlers(): Promise<CrawlResult> {
  const supabase = createServiceClient();
  const errors: string[] = [];

  const [sportConfigs, allSources] = await Promise.all([
    getSportConfigs(supabase),
    getActiveSources(supabase),
  ]);

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

  const total = allArticles.length;
  const filteredArticles = filterByCategory(allArticles, sportConfigs);
  const filtered = total - filteredArticles.length;
  console.log(`[Crawler] Filtered out ${filtered} articles`);

  const saveResult = await saveArticles(supabase, filteredArticles);
  errors.push(...saveResult.errors);

  console.log(
    `[Crawler] Done: ${saveResult.saved} new, ${saveResult.duplicate} duplicate, ${filtered} filtered (${total} total)`
  );
  return { total, saved: saveResult.saved, duplicate: saveResult.duplicate, filtered, errors };
}

// 手動觸發：直接爬、直接存，不做球種過濾
export async function runSingleCrawler(sourceId: number): Promise<CrawlResult> {
  const supabase = createServiceClient();

  const { data: source, error: sourceError } = await supabase
    .from("crawl_sources")
    .select("*")
    .eq("id", sourceId)
    .single();

  if (sourceError || !source) {
    return { total: 0, saved: 0, duplicate: 0, filtered: 0, errors: ["Source not found"] };
  }

  console.log(`[Crawler] Manual run: ${source.name} (${source.base_url})`);
  const articles = await crawlGeneric(source.name, source.base_url);
  const total = articles.length;

  // 手動觸發不過濾，全部儲存
  const saveResult = await saveArticles(supabase, articles);

  return { total, saved: saveResult.saved, duplicate: saveResult.duplicate, filtered: 0, errors: saveResult.errors };
}

export type { CrawledArticle };
