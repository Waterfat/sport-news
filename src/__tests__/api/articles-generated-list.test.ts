import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks（必須在 import 之前）----
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockCreateServiceClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

import { GET } from "@/app/api/articles/generated/route";
import { NextRequest } from "next/server";

// ---- 工具函式 ----

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/articles/generated");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

/**
 * 建立 Supabase mock。
 *
 * Route 程式碼模式：
 *   let query = supabase.from(...).select(..., {count}).order(...).range(...)
 *   if (status) query = query.eq(...)
 *   if (category) query = query.eq(...)
 *   const { data, count, error } = await query
 *
 * 所以所有 method 都需要 mockReturnThis，
 * 且 chain 本身必須是 thenable（實作 then()）才能被 await。
 */
function makeSupabaseMock(resolvedValue: { data: unknown; error: unknown; count?: number | null }) {
  const eqCalls: unknown[][] = [];
  const notCalls: unknown[][] = [];

  // 建立 thenable chain
  const chain: Record<string, unknown> & { then: Function } = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation((...args: unknown[]) => {
      eqCalls.push(args);
      return chain;
    }),
    not: vi.fn().mockImplementation((...args: unknown[]) => {
      notCalls.push(args);
      return chain;
    }),
    // 讓 await chain 可以 resolve
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
      return Promise.resolve(resolvedValue).then(resolve, reject);
    },
  };

  const supabase = { from: vi.fn().mockReturnValue(chain) };
  return { supabase, eqCalls, notCalls };
}

beforeEach(() => vi.clearAllMocks());

// ---- 測試案例 ----

describe("GET /api/articles/generated", () => {
  describe("L-01: 未登入回傳 401", () => {
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

  describe("L-02: 正常請求，無篩選", () => {
    it("回傳 articles / total / page / limit", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const articles = [{ id: "a1", title: "Test" }];
      const { supabase } = makeSupabaseMock({ data: articles, error: null, count: 1 });
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.articles).toEqual(articles);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
    });

    it("DB 回傳 null data 時 articles 為空陣列", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      // data: null → route 直接用 data（null），count: null → total: null
      const { supabase } = makeSupabaseMock({ data: null, error: null, count: null });
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
    });
  });

  describe("L-03: status=draft 篩選", () => {
    it("查詢時呼叫 .eq('status', 'draft')", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ status: "draft" }));

      const statusCall = eqCalls.find(([f]) => f === "status");
      expect(statusCall).toBeDefined();
      expect(statusCall?.[1]).toBe("draft");
    });
  });

  describe("L-04: status=scheduled 特殊篩選", () => {
    it("查詢 eq(status=draft) 且 not(scheduled_at, is, null)", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls, notCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ status: "scheduled" }));

      // status=scheduled → eq("status", "draft")
      const statusCall = eqCalls.find(([f]) => f === "status");
      expect(statusCall?.[1]).toBe("draft");

      // 且呼叫 .not("scheduled_at", "is", null)
      expect(notCalls.length).toBeGreaterThanOrEqual(1);
      const notCall = notCalls.find(([f]) => f === "scheduled_at");
      expect(notCall).toBeDefined();
    });
  });

  describe("L-05: status=published 篩選", () => {
    it("查詢時 eq('status', 'published')", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ status: "published" }));

      const statusCall = eqCalls.find(([f]) => f === "status");
      expect(statusCall?.[1]).toBe("published");
    });
  });

  describe("L-06: category 篩選", () => {
    it("查詢時呼叫 .eq('category', 'NBA')", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ category: "NBA" }));

      const categoryCall = eqCalls.find(([f]) => f === "category");
      expect(categoryCall?.[1]).toBe("NBA");
    });

    it("可同時篩選 status 和 category", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase, eqCalls } = makeSupabaseMock({ data: [], error: null, count: 0 });
      mockCreateServiceClient.mockReturnValue(supabase);

      await GET(makeRequest({ status: "draft", category: "MLB" }));

      const statusCall = eqCalls.find(([f]) => f === "status");
      const categoryCall = eqCalls.find(([f]) => f === "category");
      expect(statusCall?.[1]).toBe("draft");
      expect(categoryCall?.[1]).toBe("MLB");
    });
  });

  describe("L-07: DB 錯誤", () => {
    it("DB 回傳 error 時回傳 500 並附帶 error message", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const { supabase } = makeSupabaseMock({
        data: null,
        error: { message: "connection refused" },
        count: null,
      });
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeRequest());
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("connection refused");
    });
  });
});
