import * as cheerio from "cheerio";
import { isValidImageUrl } from "@/lib/constants";
import type { Crawler, CrawledArticle } from "./types";

const ESPN_BASE_URL = "https://www.espn.com";

const CATEGORY_MAP: Record<string, string> = {
  nba: "籃球",
  mlb: "棒球",
  nfl: "美式足球",
  soccer: "足球",
};

export const espnCrawler: Crawler = {
  name: "ESPN",

  async crawl(): Promise<CrawledArticle[]> {
    const articles: CrawledArticle[] = [];

    for (const [section, category] of Object.entries(CATEGORY_MAP)) {
      try {
        const sectionArticles = await crawlSection(section, category);
        articles.push(...sectionArticles);
      } catch (error) {
        console.error(`[ESPN] Failed to crawl ${section}:`, error);
      }
    }

    return articles;
  },
};

async function crawlSection(
  section: string,
  category: string
): Promise<CrawledArticle[]> {
  const url = `${ESPN_BASE_URL}/${section}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const articles: CrawledArticle[] = [];

  // ESPN 首頁文章連結
  const links = new Set<string>();
  $('a[href*="/story/"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href) {
      const fullUrl = href.startsWith("http") ? href : `${ESPN_BASE_URL}${href}`;
      links.add(fullUrl);
    }
  });

  // 限制每個分類最多抓 5 篇
  const articleUrls = Array.from(links).slice(0, 5);

  for (const articleUrl of articleUrls) {
    try {
      const article = await crawlArticle(articleUrl, category);
      if (article) {
        articles.push(article);
      }
    } catch (error) {
      console.error(`[ESPN] Failed to crawl article ${articleUrl}:`, error);
    }
  }

  return articles;
}

async function crawlArticle(
  url: string,
  category: string
): Promise<CrawledArticle | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!res.ok) return null;

  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $("h1").first().text().trim();
  if (!title) return null;

  // 取得文章內容（放寬容器選擇器，ESPN 不一定使用 <article>）
  const paragraphs: string[] = [];
  const seenTexts = new Set<string>();
  $("article p, .article-body p, .story-body p, .story p, main p").each((_, el) => {
    const text = $(el).text().trim();
    if (text && !seenTexts.has(text)) {
      seenTexts.add(text);
      paragraphs.push(text);
    }
  });

  const content = paragraphs.join("\n\n");
  if (!content || content.length < 100) return null;

  // 取得圖片（排除記者大頭照，放寬容器選擇器）
  const authorExclude = /author|byline|headshot|writer|staff|contributor|columnist|avatar|profile/i;
  const images: string[] = [];
  $("article img, .article-body img, .story-body img, .story img, main img, picture img").each((_, el) => {
    const imgClass = $(el).attr("class") || "";
    const parentClass = $(el).parent().attr("class") || "";
    const grandparentClass = $(el).parent().parent().attr("class") || "";
    if (authorExclude.test(imgClass + " " + parentClass + " " + grandparentClass)) return;

    // 優先讀 src / data-default-src，若無則檢查 <picture><source srcset>
    let src = $(el).attr("src") || $(el).attr("data-default-src");
    if (!src) {
      const pictureParent = $(el).closest("picture");
      if (pictureParent.length) {
        const srcset = pictureParent.find("source").first().attr("srcset");
        if (srcset) {
          // srcset 格式："url1 width1, url2 width2, ..."，取第一個 URL
          src = srcset.split(",")[0].trim().split(/\s+/)[0];
        }
      }
    }
    if (src && isValidImageUrl(src)) {
      images.push(src);
    }
  });

  // 備用：og:image（當無法從內文提取圖片時）
  if (images.length === 0) {
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage && ogImage.startsWith("http")) {
      images.push(ogImage);
    }
  }

  return {
    source: "ESPN",
    title,
    content,
    images: images.slice(0, 3),
    url,
    category,
  };
}
