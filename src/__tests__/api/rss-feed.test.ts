import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabase,
}));

// Mock constants to have predictable values
vi.mock("@/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/constants")>();
  return {
    ...actual,
    SITE_URL: "https://howger-sport.com",
    SITE_NAME: "好球研究所",
  };
});

import { GET } from "@/app/(public)/rss.xml/route";

function buildArticlesChain(articles: unknown[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: articles }),
  };
  return chain;
}

const mockArticles = [
  {
    id: "uuid-1",
    title: "NBA 季後賽熱身賽戰報",
    content: "# 標題\n\n這是文章內文，包含 **markdown** 格式。\n\n更多內容...",
    category: "NBA",
    published_at: "2026-03-21T10:00:00Z",
    slug: "nba-playoff-warmup",
  },
  {
    id: "uuid-2",
    title: "MLB 開幕戰預測",
    content: "棒球分析文章",
    category: "棒球",
    published_at: "2026-03-20T08:00:00Z",
    slug: null, // no slug, should fallback to id
  },
];

describe("GET /rss.xml", () => {
  beforeEach(() => vi.clearAllMocks());

  it("回傳 Content-Type: application/rss+xml", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();

    expect(res.headers.get("Content-Type")).toContain("application/rss+xml");
    expect(res.headers.get("Content-Type")).toContain("utf-8");
  });

  it("回傳 Cache-Control: public, max-age=3600", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();

    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toContain("max-age=3600");
    expect(cacheControl).toContain("public");
  });

  it("回傳有效的 RSS 2.0 XML 結構", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("</channel>");
    expect(xml).toContain("</rss>");
  });

  it("包含 channel 基本資訊", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain("<title>好球研究所</title>");
    expect(xml).toContain("<language>zh-TW</language>");
    expect(xml).toContain("https://howger-sport.com");
  });

  it("包含 Atom self link", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain('rel="self"');
    expect(xml).toContain('type="application/rss+xml"');
  });

  it("文章標題以 CDATA 包裹", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain("<![CDATA[NBA 季後賽熱身賽戰報]]>");
    expect(xml).toContain("<![CDATA[MLB 開幕戰預測]]>");
  });

  it("文章 link 使用 slug（當有 slug 時）", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain("https://howger-sport.com/news/nba-playoff-warmup");
  });

  it("文章 link fallback 使用 id（當無 slug 時）", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain("https://howger-sport.com/news/uuid-2");
  });

  it("description 為前 300 字元（去除 markdown 符號）", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    // Content had markdown symbols stripped: # * _ > - \n
    expect(xml).not.toMatch(/\<description\>\<!\[CDATA\[#/);
    // Description should contain the text content
    expect(xml).toContain("這是文章內文");
  });

  it("pubDate 格式為 UTC 字串", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    // pubDate should be in UTC format (contains GMT)
    expect(xml).toMatch(/<pubDate>[^<]*GMT[^<]*<\/pubDate>/);
  });

  it("限制最多 50 篇文章", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    await GET();

    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it("無文章時回傳空 channel（仍為合法 XML）", async () => {
    const chain = buildArticlesChain([]);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });

  it("包含分類（category）欄位", async () => {
    const chain = buildArticlesChain(mockArticles);
    mockSupabase.from.mockReturnValue(chain);

    const res = await GET();
    const xml = await res.text();

    expect(xml).toContain("<category>NBA</category>");
  });
});
