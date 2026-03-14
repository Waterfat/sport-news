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

  // 取得文章內容
  const paragraphs: string[] = [];
  $("article p, .article-body p").each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });

  const content = paragraphs.join("\n\n");
  if (!content || content.length < 100) return null;

  // 取得圖片（排除記者大頭照）
  const authorExclude = /author|byline|headshot|writer|staff|contributor|avatar/i;
  const images: string[] = [];
  $("article img, .article-body img, picture img").each((_, el) => {
    const imgClass = $(el).attr("class") || "";
    const parentClass = $(el).parent().attr("class") || "";
    if (authorExclude.test(imgClass + " " + parentClass)) return;

    const src = $(el).attr("src") || $(el).attr("data-default-src");
    if (src && isValidImageUrl(src)) {
      images.push(src);
    }
  });

  return {
    source: "ESPN",
    title,
    content,
    images: images.slice(0, 3),
    url,
    category,
  };
}
