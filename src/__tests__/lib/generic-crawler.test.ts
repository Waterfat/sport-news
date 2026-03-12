import { describe, it, expect, vi, beforeEach } from "vitest";

// 測試 isLikelyArticleUrl 和 extractArticleLinks 的邏輯
// 因為這些是 module 內部函數，我們透過 crawlGeneric 間接測試

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// 直接測試 URL 過濾邏輯（複製自 generic.ts 以進行單元測試）
function isLikelyArticleUrl(url: string): boolean {
  const path = new URL(url).pathname;
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
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) return false;
  const lastSegment = segments[segments.length - 1];
  if (lastSegment.length < 5) return false;
  return true;
}

describe("isLikelyArticleUrl", () => {
  it("accepts real article URLs", () => {
    expect(isLikelyArticleUrl("https://www.nba.com/news/shai-gilgeous-alexander-scoring-streak")).toBe(true);
    expect(isLikelyArticleUrl("https://www.espn.com/nba/story/_/id/12345/some-article")).toBe(true);
    expect(isLikelyArticleUrl("https://example.com/news/power-rankings-2025-week-21")).toBe(true);
  });

  it("rejects category pages", () => {
    expect(isLikelyArticleUrl("https://www.nba.com/news/category/top-stories")).toBe(false);
    expect(isLikelyArticleUrl("https://www.nba.com/news/category/power-rankings")).toBe(false);
    expect(isLikelyArticleUrl("https://example.com/news/category/trending-topics")).toBe(false);
  });

  it("rejects tag pages", () => {
    expect(isLikelyArticleUrl("https://example.com/news/tag/nba")).toBe(false);
    expect(isLikelyArticleUrl("https://example.com/news/tags/basketball")).toBe(false);
  });

  it("rejects author pages", () => {
    expect(isLikelyArticleUrl("https://example.com/news/author/john-doe")).toBe(false);
  });

  it("rejects pagination pages", () => {
    expect(isLikelyArticleUrl("https://example.com/news/page/2")).toBe(false);
    expect(isLikelyArticleUrl("https://example.com/news/page/15")).toBe(false);
  });

  it("rejects static reference pages", () => {
    expect(isLikelyArticleUrl("https://www.nba.com/news/nba-guide")).toBe(false);
    expect(isLikelyArticleUrl("https://www.nba.com/news/2025-nba-trade-tracker")).toBe(false);
    expect(isLikelyArticleUrl("https://www.nba.com/news/key-dates")).toBe(false);
    expect(isLikelyArticleUrl("https://example.com/news/archive")).toBe(false);
  });

  it("rejects search pages", () => {
    expect(isLikelyArticleUrl("https://example.com/news/search?q=nba")).toBe(false);
  });

  it("rejects too-shallow paths (less than 2 segments)", () => {
    expect(isLikelyArticleUrl("https://www.nba.com/news")).toBe(false);
    expect(isLikelyArticleUrl("https://example.com/article")).toBe(false);
  });

  it("rejects short last segment (less than 5 chars)", () => {
    expect(isLikelyArticleUrl("https://example.com/news/abc")).toBe(false);
    expect(isLikelyArticleUrl("https://example.com/news/test")).toBe(false);
  });
});

describe("crawlGeneric - article image extraction", () => {
  it("extracts images from article page", async () => {
    const { crawlGeneric } = await import("@/lib/crawlers/generic");

    // Mock listing page with one article link
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `
        <html><body>
          <a href="/news/test-article-slug">Test Article</a>
        </body></html>
      `,
    });

    // Mock article page with images
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `
        <html><body>
          <h1>Test Article Title</h1>
          <article>
            <p>This is a long enough paragraph with more than twenty characters for the content check.</p>
            <p>Another paragraph with sufficient length to pass validation requirements in crawler.</p>
            <p>Third paragraph ensures we have enough content total over one hundred characters easily.</p>
            <img src="https://cdn.example.com/photo1.jpg" />
            <img src="https://cdn.example.com/photo2.jpg" />
            <img src="https://cdn.example.com/logo.png" />
            <img src="https://cdn.example.com/icon-small.svg" />
          </article>
        </body></html>
      `,
    });

    const articles = await crawlGeneric("TestSource", "https://example.com/news");
    expect(articles.length).toBe(1);
    expect(articles[0].images).toContain("https://cdn.example.com/photo1.jpg");
    expect(articles[0].images).toContain("https://cdn.example.com/photo2.jpg");
    // logo and svg should be filtered out
    expect(articles[0].images).not.toContain("https://cdn.example.com/logo.png");
    expect(articles[0].images).not.toContain("https://cdn.example.com/icon-small.svg");
  });

  it("falls back to og:image when no article images found", async () => {
    const { crawlGeneric } = await import("@/lib/crawlers/generic");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `
        <html><body>
          <a href="/news/another-article-test">Another</a>
        </body></html>
      `,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `
        <html>
        <head><meta property="og:image" content="https://cdn.example.com/og-image.jpg" /></head>
        <body>
          <h1>Another Article</h1>
          <main>
            <p>This is a long enough paragraph with more than twenty characters for the content check.</p>
            <p>Second paragraph with enough content to pass all the validation checks in the crawler module.</p>
            <p>Third paragraph makes sure total content exceeds one hundred characters requirement easily here.</p>
          </main>
        </body></html>
      `,
    });

    const articles = await crawlGeneric("TestSource", "https://example.com/news");
    expect(articles.length).toBe(1);
    expect(articles[0].images).toEqual(["https://cdn.example.com/og-image.jpg"]);
  });

  it("filters out category URLs from article links", async () => {
    const { crawlGeneric } = await import("@/lib/crawlers/generic");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `
        <html><body>
          <a href="/news/category/top-stories">Top Stories</a>
          <a href="/news/category/power-rankings">Power Rankings</a>
          <a href="/news/real-article-about-something">Real Article</a>
        </body></html>
      `,
    });

    // Only the real article should be crawled
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `
        <html><body>
          <h1>Real Article</h1>
          <article>
            <p>This is a long enough paragraph with more than twenty characters for the content check.</p>
            <p>Second paragraph with enough content to pass all the validation checks in the crawler module.</p>
            <p>Third paragraph makes sure total content exceeds one hundred characters requirement easily here.</p>
          </article>
        </body></html>
      `,
    });

    const articles = await crawlGeneric("TestSource", "https://example.com/news");
    expect(articles.length).toBe(1);
    expect(articles[0].title).toBe("Real Article");
    // Should only have made 2 fetch calls (listing + 1 article, not 3)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
