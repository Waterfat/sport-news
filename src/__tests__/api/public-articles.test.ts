import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Thenable query chain mock ─────────────────────────────────────────────────
// Both articles and trending routes build a query with terminal method (.range/.limit),
// then conditionally call .eq()/.gte() on the result before awaiting.
// Supabase real client supports this. Our mock must too.

function buildThenableChain(finalResult: { data: unknown; count?: number | null; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "range", "limit", "gte", "or"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // Make chain thenable
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(finalResult).then(resolve);
  return chain;
}

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabase,
}));

import { GET } from "@/app/api/public/articles/route";
import { GET as getTrending } from "@/app/api/public/articles/trending/route";

function makeRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL(`http://localhost${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe("GET /api/public/articles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("回傳文章列表（預設分頁）", async () => {
    const articles = [
      { id: "1", title: "NBA 戰報", slug: "nba-report", category: "NBA", published_at: "2026-03-21T10:00:00Z" },
    ];
    const chain = buildThenableChain({ data: articles, count: 1, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
  });

  it("支援 category 篩選", async () => {
    const chain = buildThenableChain({ data: [], count: 0, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles", { category: "NBA" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("category", "NBA");
  });

  it("支援 writer_id 篩選", async () => {
    const chain = buildThenableChain({ data: [], count: 0, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles", { writer_id: "writer-uuid-123" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("writer_persona_id", "writer-uuid-123");
  });

  it("limit 上限為 100（即使傳入更大值）", async () => {
    const chain = buildThenableChain({ data: [], count: 0, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles", { limit: "500" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.limit).toBe(100);
  });

  it("支援自訂分頁（page=2, limit=5）", async () => {
    const chain = buildThenableChain({ data: [], count: 30, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles", { page: "2", limit: "5" });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(5);
    expect(chain.range).toHaveBeenCalledWith(5, 9);
  });

  it("Supabase 錯誤回傳 500", async () => {
    const chain = buildThenableChain({ data: null, count: null, error: { message: "DB connection failed" } });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("DB connection failed");
  });

  it("無文章時回傳空陣列", async () => {
    const chain = buildThenableChain({ data: null, count: 0, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toEqual([]);
  });
});

describe("GET /api/public/articles/trending", () => {
  beforeEach(() => vi.clearAllMocks());

  it("回傳熱門文章列表（預設 limit=5）", async () => {
    const articles = [
      { id: "1", title: "最熱門文章", slug: "top", category: "NBA", view_count: 500, published_at: "2026-03-20T00:00:00Z" },
    ];
    const chain = buildThenableChain({ data: articles, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles/trending");
    const res = await getTrending(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toHaveLength(1);
  });

  it("支援 category 篩選", async () => {
    const chain = buildThenableChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles/trending", { category: "NBA" });
    const res = await getTrending(req);

    expect(res.status).toBe(200);
    expect(chain.eq).toHaveBeenCalledWith("category", "NBA");
  });

  it("支援 period=week 套用時間篩選", async () => {
    const chain = buildThenableChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles/trending", { period: "week" });
    const res = await getTrending(req);

    expect(res.status).toBe(200);
    expect(chain.gte).toHaveBeenCalled();
  });

  it("支援 period=month 套用時間篩選", async () => {
    const chain = buildThenableChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles/trending", { period: "month" });
    const res = await getTrending(req);

    expect(res.status).toBe(200);
    expect(chain.gte).toHaveBeenCalled();
  });

  it("period=all 不套用時間篩選", async () => {
    const chain = buildThenableChain({ data: [], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles/trending", { period: "all" });
    const res = await getTrending(req);

    expect(res.status).toBe(200);
    expect(chain.gte).not.toHaveBeenCalled();
  });

  it("非法 period 回傳 400", async () => {
    const req = makeRequest("/api/public/articles/trending", { period: "invalid_period" });
    const res = await getTrending(req);

    expect(res.status).toBe(400);
  });

  it("limit 超過 20 回傳 400", async () => {
    const req = makeRequest("/api/public/articles/trending", { limit: "50" });
    const res = await getTrending(req);

    expect(res.status).toBe(400);
  });

  it("limit=0 回傳 400", async () => {
    const req = makeRequest("/api/public/articles/trending", { limit: "0" });
    const res = await getTrending(req);

    expect(res.status).toBe(400);
  });

  it("Supabase 錯誤回傳 500", async () => {
    const chain = buildThenableChain({ data: null, error: { message: "Query failed" } });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles/trending");
    const res = await getTrending(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBeDefined();
  });

  it("無資料時回傳空陣列", async () => {
    const chain = buildThenableChain({ data: null, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest("/api/public/articles/trending");
    const res = await getTrending(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.articles).toEqual([]);
  });
});
