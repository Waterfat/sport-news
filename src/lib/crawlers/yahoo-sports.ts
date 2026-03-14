import * as cheerio from "cheerio";
import { isValidImageUrl } from "@/lib/constants";
import type { Crawler, CrawledArticle } from "./types";

const YAHOO_SPORTS_URL = "https://sports.yahoo.com";

export const yahooSportsCrawler: Crawler = {
  name: "Yahoo Sports",

  async crawl(): Promise<CrawledArticle[]> {
    const articles: CrawledArticle[] = [];

    try {
      const res = await fetch(YAHOO_SPORTS_URL, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const html = await res.text();
      const $ = cheerio.load(html);

      const links = new Set<string>();
      $('a[href*="/news/"]').each((_, el) => {
        const href = $(el).attr("href");
        if (href && href.includes("/news/")) {
          const fullUrl = href.startsWith("http")
            ? href
            : `${YAHOO_SPORTS_URL}${href}`;
          links.add(fullUrl);
        }
      });

      const articleUrls = Array.from(links).slice(0, 10);

      for (const url of articleUrls) {
        try {
          const article = await crawlArticle(url);
          if (article) articles.push(article);
        } catch (error) {
          console.error(`[Yahoo Sports] Failed to crawl ${url}:`, error);
        }
      }
    } catch (error) {
      console.error("[Yahoo Sports] Failed to crawl:", error);
    }

    return articles;
  },
};

async function crawlArticle(url: string): Promise<CrawledArticle | null> {
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

  const paragraphs: string[] = [];
  $("article p, .caas-body p").each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });

  const content = paragraphs.join("\n\n");
  if (!content || content.length < 100) return null;

  const authorExclude = /author|byline|headshot|writer|staff|contributor|avatar|journalist/i;
  const images: string[] = [];
  $("article img, .caas-body img").each((_, el) => {
    const imgClass = $(el).attr("class") || "";
    const parentClass = $(el).parent().attr("class") || "";
    if (authorExclude.test(imgClass + " " + parentClass)) return;

    const src = $(el).attr("src");
    if (src && isValidImageUrl(src)) {
      images.push(src);
    }
  });

  // 根據 URL 或內容推測分類
  const category = detectCategory(url, title);

  return {
    source: "Yahoo Sports",
    title,
    content,
    images: images.slice(0, 3),
    url,
    category,
  };
}

function detectCategory(url: string, title: string): string | null {
  const text = (url + " " + title).toLowerCase();
  if (text.includes("nba") || text.includes("basketball")) return "籃球";
  if (text.includes("mlb") || text.includes("baseball")) return "棒球";
  if (text.includes("nfl") || text.includes("football")) return "美式足球";
  if (text.includes("soccer") || text.includes("fifa") || text.includes("premier"))
    return "足球";
  if (text.includes("nhl") || text.includes("hockey")) return "NHL";
  return null;
}
