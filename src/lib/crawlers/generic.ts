import * as cheerio from "cheerio";
import { isValidImageUrl } from "@/lib/constants";
import type { CrawledArticle } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

// 從文字中推測分類
function detectCategory(url: string, title: string, content: string): string | null {
  const text = (url + " " + title + " " + content).toLowerCase();
  if (text.includes("nba") || text.includes("basketball") || text.includes("籃球"))
    return "籃球";
  if (
    text.includes("mlb") ||
    text.includes("baseball") ||
    text.includes("棒球") ||
    text.includes("大聯盟")
  )
    return "棒球";
  if (text.includes("nfl") || text.includes("美式足球")) return "美式足球";
  if (
    text.includes("soccer") ||
    text.includes("fifa") ||
    text.includes("足球") ||
    text.includes("英超") ||
    text.includes("premier league") ||
    text.includes("世界盃")
  )
    return "足球";
  if (text.includes("nhl") || text.includes("hockey") || text.includes("冰球"))
    return "冰球";
  if (text.includes("tennis") || text.includes("網球")) return "網球";
  if (text.includes("中職") || text.includes("cpbl")) return "棒球";
  return null;
}

// 判斷 URL 是否看起來像文章（而非分類頁、導覽頁）
function isLikelyArticleUrl(url: string): boolean {
  const path = new URL(url).pathname;

  // 排除分類頁、標籤頁、導覽頁、靜態參考頁
  const excludePatterns = [
    /\/category\//i,
    /\/tag\//i,
    /\/tags\//i,
    /\/author\//i,
    /\/page\/\d+/i,
    /\/search/i,
    /\/archive/i,
    /-guide$/i,
    /\/guide$/i,
    /-tracker$/i,
    /\/tracker$/i,
    /key-dates$/i,
  ];
  if (excludePatterns.some((p) => p.test(path))) return false;

  // 排除純粹的 section 首頁（路徑段數太少，例如 /news/ 本身）
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) return false;

  // 最後一段至少要有一定長度（通常是 slug）
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.length < 5) return false;

  return true;
}

// 通用：從首頁找文章連結
function extractArticleLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links = new Set<string>();
  const baseDomain = new URL(baseUrl).origin;

  // 嘗試各種常見文章連結模式
  const selectors = [
    'a[href*="/news/"]',
    'a[href*="/story/"]',
    'a[href*="/article/"]',
    'a[href*="/post/"]',
    'a[href*="/stories/"]',
    'a[href*="/report/"]',
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.includes("#") && !href.includes("javascript:")) {
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, baseDomain).href;
        if (isLikelyArticleUrl(fullUrl)) {
          links.add(fullUrl);
        }
      }
    });
  }

  // 如果以上都找不到，嘗試找所有含有長文字的連結（可能是文章標題）
  if (links.size === 0) {
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (
        href &&
        text.length > 20 &&
        !href.includes("#") &&
        !href.includes("javascript:") &&
        href !== baseUrl
      ) {
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, baseDomain).href;
        if (isLikelyArticleUrl(fullUrl)) {
          links.add(fullUrl);
        }
      }
    });
  }

  return Array.from(links).slice(0, 15);
}

// 通用：從文章頁面提取內容
async function crawlArticle(
  url: string,
  sourceName: string
): Promise<CrawledArticle | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // 提取標題：嘗試多種選擇器
    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim();
    if (!title) return null;

    // 提取內容：嘗試多種常見的文章容器
    const paragraphs: string[] = [];
    const contentSelectors = [
      "article p",
      ".article-body p",
      ".story-body p",
      ".article_content p",
      ".story p",
      ".caas-body p",
      ".post-content p",
      ".entry-content p",
      ".content p",
      "main p",
    ];

    for (const selector of contentSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 20) paragraphs.push(text);
      });
      if (paragraphs.length > 0) break;
    }

    // 最後手段：直接取所有 <p>
    if (paragraphs.length === 0) {
      $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 30) paragraphs.push(text);
      });
    }

    const content = paragraphs.join("\n\n");
    if (!content || content.length < 100) return null;

    // 提取圖片（排除記者大頭照、作者照片等非文章內容圖片）
    const authorExcludePatterns = /author|byline|headshot|writer|staff|contributor|columnist|avatar|profile/i;
    const images: string[] = [];
    $("article img, main img, .article-body img, .story-body img, .story img, .article_content img, .caas-body img, .content img").each((_, el) => {
      // 檢查 img 自身及父元素的 class，排除記者照片
      const imgClass = $(el).attr("class") || "";
      const parentClass = $(el).parent().attr("class") || "";
      const grandparentClass = $(el).parent().parent().attr("class") || "";
      if (authorExcludePatterns.test(imgClass + " " + parentClass + " " + grandparentClass)) return;

      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
      if (src && isValidImageUrl(src) && !images.includes(src)) {
        images.push(src);
      }
    });

    // 備用：og:image
    if (images.length === 0) {
      const ogImage = $('meta[property="og:image"]').attr("content");
      if (ogImage && ogImage.startsWith("http")) {
        images.push(ogImage);
      }
    }

    const category = detectCategory(url, title, content);

    return {
      source: sourceName,
      title,
      content,
      images: images.slice(0, 5),
      url,
      category,
    };
  } catch {
    return null;
  }
}

export async function crawlGeneric(
  sourceName: string,
  baseUrl: string
): Promise<CrawledArticle[]> {
  const articles: CrawledArticle[] = [];

  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (!res.ok) {
      console.error(`[${sourceName}] HTTP ${res.status} for ${baseUrl}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const articleUrls = extractArticleLinks($, baseUrl);
    console.log(`[${sourceName}] Found ${articleUrls.length} article links`);

    for (const url of articleUrls) {
      try {
        const article = await crawlArticle(url, sourceName);
        if (article) articles.push(article);
      } catch (error) {
        console.error(`[${sourceName}] Failed to crawl ${url}:`, error);
      }
    }
  } catch (error) {
    console.error(`[${sourceName}] Failed to crawl:`, error);
  }

  return articles;
}
