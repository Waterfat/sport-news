import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockCreateServiceClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

import { GET } from "@/app/api/articles/raw/route";
import { NextRequest } from "next/server";

// ---- Helpers ----

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/articles/raw");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

/**
 * Route 模式：
 *   let query = supabase.from("raw_articles").select("*", {count}).order(...).range(...)
 *   if (category) query = query.eq("category", ...)
 *   if (source) query = query.eq("source", ...)
 *   const { data, count, error } = await query
 *
 * 需要 thenable chain（同 articles-generated-list 模式）
 */
function makeSupabaseMock(resolvedValue: { data: unknown; error: unknown; count?: number | null }) {
  const eqCalls: unknown[][] = [];

  const chain: Record<string, unknown> & { then: Function } = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((...args: unknown[]) => {
      eqCalls.push(args);
      return chain;
    }),
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(resolvedValue).then(resolve, reject),
  };

  const supabase = { from: vi.fn().mockReturnValue(chain) };
  return { supabase, eqCalls };
}

beforeEach(() => vi.clearAllMocks());

// ============================================================
// GET /api/articles/raw
// ============================================================

describe("GET /api/articles/raw", () => {
  describe("RA-01: 未登入回傳 401", () => {
    it("session 為 null 時回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("session.user 為 undefined 時回傳 401", async () => {
      mockAuth.mockResolvedValue({ user: undefined });
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  describe("RA-02: 正常請求，無篩選", () => {
    it("回傳 articles / total / page / limit", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const rawArticles = [
        { id: "r1", title: "Raw Article 1", source: "ESPN" },
        { id: "r2", title: "Raw Article 2", source: "MLB.com" },
      ];
      const { supabase } = makeSupabaseMock({ data: rawArticles, error: null, count: 2 });
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.articles).toEqual(rawArticles);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
    });

    it("DB 回傳空陣列時正常回傳", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.articles).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("分頁參數 page=2&limit=10 正確傳遞", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase } = makeSupabaseMock({ data: [], error: null, count: 25 });
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeRequest({ page: "2", limit: "10" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.page).toBe(2);
      expect(body.limit).toBe(10);
    });
  });

  describe("RA-03: category 篩選", () => {
    it("查詢時呼叫 .eq('category', 'NBA')", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ category: "NBA" }));

      const categoryCall = eqCalls.find(([f]) => f === "category");
      expect(categoryCall).toBeDefined();
      expect(categoryCall?.[1]).toBe("NBA");
    });

    it("category=baseball 也能正確篩選", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ category: "baseball" }));

      const categoryCall = eqCalls.find(([f]) => f === "category");
      expect(categoryCall?.[1]).toBe("baseball");
    });
  });

  describe("RA-04: source 篩選", () => {
    it("查詢時呼叫 .eq('source', 'ESPN')", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ source: "ESPN" }));

      const sourceCall = eqCalls.find(([f]) => f === "source");
      expect(sourceCall).toBeDefined();
      expect(sourceCall?.[1]).toBe("ESPN");
    });

    it("可同時篩選 category 和 source", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ category: "NBA", source: "ESPN" }));

      const categoryCall = eqCalls.find(([f]) => f === "category");
      const sourceCall = eqCalls.find(([f]) => f === "source");
      expect(categoryCall?.[1]).toBe("NBA");
      expect(sourceCall?.[1]).toBe("ESPN");
    });
  });

  describe("RA-05: DB 錯誤", () => {
    it("DB error 時回傳 500 並附帶 error message", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase } = makeSupabaseMock({
        data: null,
        error: { message: "table not found" },
        count: null,
      });
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeRequest());
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("table not found");
    });
  });
});
