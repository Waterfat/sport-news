import * as cheerio from "cheerio";
import type { Crawler, CrawledArticle } from "./types";

const ETTODAY_SPORT_URL = "https://sports.ettoday.net";

export const ettodaySportCrawler: Crawler = {
  name: "ETtoday 體育",

  async crawl(): Promise<CrawledArticle[]> {
    const articles: CrawledArticle[] = [];

    try {
      const res = await fetch(`${ETTODAY_SPORT_URL}/news/news-list.htm`, {
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
        if (href && /\/news\/\d+/.test(href)) {
          const fullUrl = href.startsWith("http")
            ? href
            : `https://sports.ettoday.net${href}`;
          links.add(fullUrl);
        }
      });

      const articleUrls = Array.from(links).slice(0, 10);

      for (const url of articleUrls) {
        try {
          const article = await crawlArticle(url);
          if (article) articles.push(article);
        } catch (error) {
          console.error(`[ETtoday] Failed to crawl ${url}:`, error);
        }
      }
    } catch (error) {
      console.error("[ETtoday] Failed to crawl:", error);
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
  $(".story p, .article_content p").each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });

  const content = paragraphs.join("\n\n");
  if (!content || content.length < 50) return null;

  const images: string[] = [];
  $(".story img, .article_content img").each((_, el) => {
    const src = $(el).attr("src");
    if (src && src.startsWith("http") && !src.includes("logo")) {
      images.push(src);
    }
  });

  const category = detectCategory(title, content);

  return {
    source: "ETtoday 體育",
    title,
    content,
    images: images.slice(0, 3),
    url,
    category,
  };
}

function detectCategory(title: string, content: string): string | null {
  const text = (title + " " + content).toLowerCase();
  if (text.includes("nba") || text.includes("籃球")) return "籃球";
  if (text.includes("mlb") || text.includes("棒球") || text.includes("大聯盟"))
    return "棒球";
  if (text.includes("中職") || text.includes("cpbl")) return "棒球";
  if (text.includes("nfl") || text.includes("美式足球")) return "美式足球";
  if (text.includes("足球") || text.includes("世界盃") || text.includes("英超"))
    return "足球";
  if (text.includes("網球") || text.includes("tennis")) return "網球";
  return "綜合";
}
