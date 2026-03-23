import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabase,
}));

import { GET } from "@/app/api/public/search/route";

function makeRequest(q?: string) {
  const url = new URL("http://localhost/api/public/search");
  if (q !== undefined) url.searchParams.set("q", q);
  return new NextRequest(url.toString());
}

function buildSearchChain(articles: unknown[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: articles, error: null }),
  };
  return chain;
}

describe("GET /api/public/search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("空 q 回傳空陣列（不查 DB）", async () => {
    const req = makeRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("q 為空白字串回傳空陣列", async () => {
    const req = makeRequest("   ");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toEqual([]);
  });

  it("正常搜尋回傳文章列表", async () => {
    const articles = [
      { id: "1", title: "NBA 戰報", slug: "nba", category: "NBA", published_at: "2026-03-21T00:00:00Z", images: [] },
    ];
    const chain = buildSearchChain(articles);
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("NBA");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toHaveLength(1);
    expect(body.articles[0].id).toBe("1");
  });

  it("搜尋結果上限為 10 筆", async () => {
    const chain = buildSearchChain([]);
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("basketball");
    await GET(req);

    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("特殊字元（%, _, ()）被 escape 後傳入 ILIKE", async () => {
    let capturedOrArg: string | null = null;

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockImplementation((arg: string) => {
        capturedOrArg = arg;
        return chain;
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("50% wins (NBA)");
    await GET(req);

    // Should escape %, (, ) via replacement
    expect(capturedOrArg).not.toContain("%50%"); // original % should be escaped
    expect(capturedOrArg).toContain("\\%"); // escaped %
  });

  it("Supabase 錯誤回傳 500", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "Search failed" } }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("test");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Search failed");
  });

  it("回傳欄位包含 id, title, slug, category, published_at, images", async () => {
    const articles = [
      {
        id: "abc",
        title: "Test Article",
        slug: "test-article",
        category: "NBA",
        published_at: "2026-03-21T00:00:00Z",
        images: [{ url: "https://cdn.example.com/img.jpg" }],
      },
    ];
    const chain = buildSearchChain(articles);
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("test");
    const res = await GET(req);
    const body = await res.json();
    const article = body.articles[0];

    expect(article).toHaveProperty("id");
    expect(article).toHaveProperty("title");
    expect(article).toHaveProperty("slug");
    expect(article).toHaveProperty("category");
    expect(article).toHaveProperty("published_at");
    expect(article).toHaveProperty("images");
  });

  it("無搜尋結果回傳空陣列（非 null）", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("nonexistent-keyword");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toEqual([]);
  });
});
