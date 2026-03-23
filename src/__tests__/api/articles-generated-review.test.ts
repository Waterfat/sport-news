import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockCreateServiceClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

import { GET, PATCH } from "@/app/api/articles/generated/review/route";
import { NextRequest } from "next/server";

// ---- Helpers ----

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/articles/generated/review");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/articles/generated/review", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const ARTICLE_ID = "550e8400-e29b-41d4-a716-446655440099";

/**
 * 建立審稿查詢 mock。
 * Route 模式：
 *   supabase.from(...).select(...).eq(...).order(...).limit(...)
 *   → limit() 為終端，需要是 Promise
 */
function makeReviewListSupabase(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolvedValue),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

/**
 * 建立 update mock。
 * Route 模式：supabase.from(...).update({...}).eq("id", id)
 * → eq() 為終端
 */
function makeUpdateSupabase(resolvedValue: { error: unknown }) {
  const chain = {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(resolvedValue),
    }),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

beforeEach(() => vi.clearAllMocks());

// ============================================================
// GET /api/articles/generated/review
// ============================================================

describe("GET /api/articles/generated/review", () => {
  describe("R-01: 未登入回傳 401", () => {
    it("session 為 null 時回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET(makeGetRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("R-02: tab=pending（預設）", () => {
    it("不帶 tab 參數時查詢 review_status=pending 並回傳陣列", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const pendingItems = [
        { id: "a1", title: "Article 1", review_status: "pending" },
        { id: "a2", title: "Article 2", review_status: "pending" },
      ];
      mockCreateServiceClient.mockReturnValue(
        makeReviewListSupabase({ data: pendingItems, error: null })
      );

      const res = await GET(makeGetRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
    });

    it("tab=pending 明確帶入時同樣查詢 pending", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockCreateServiceClient.mockReturnValue(
        makeReviewListSupabase({ data: [], error: null })
      );

      const res = await GET(makeGetRequest({ tab: "pending" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it("DB 查詢 error 時回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockCreateServiceClient.mockReturnValue(
        makeReviewListSupabase({ data: null, error: { message: "query failed" } })
      );

      const res = await GET(makeGetRequest({ tab: "pending" }));
      expect(res.status).toBe(500);
    });

    it("DB 回傳 null 時回傳空陣列", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockCreateServiceClient.mockReturnValue(
        makeReviewListSupabase({ data: null, error: null })
      );

      const res = await GET(makeGetRequest({ tab: "pending" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });
  });

  describe("R-03: tab=history", () => {
    it("查詢 review_status in [approved, rejected] 並回傳陣列", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const historyItems = [
        { id: "a3", title: "Approved", review_status: "approved" },
        { id: "a4", title: "Rejected", review_status: "rejected" },
      ];
      mockCreateServiceClient.mockReturnValue(
        makeReviewListSupabase({ data: historyItems, error: null })
      );

      const res = await GET(makeGetRequest({ tab: "history" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(2);
    });

    it("DB error 時回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockCreateServiceClient.mockReturnValue(
        makeReviewListSupabase({ data: null, error: { message: "history query failed" } })
      );

      const res = await GET(makeGetRequest({ tab: "history" }));
      expect(res.status).toBe(500);
    });
  });
});

// ============================================================
// PATCH /api/articles/generated/review
// ============================================================

describe("PATCH /api/articles/generated/review", () => {
  describe("RU-01: 未登入回傳 401", () => {
    it("session 為 null 時回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await PATCH(makePatchRequest({ id: ARTICLE_ID, review_status: "approved" }));
      expect(res.status).toBe(401);
    });
  });

  describe("RU-02: 缺少 id 回傳 400", () => {
    it("body 無 id 欄位時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PATCH(makePatchRequest({ review_status: "approved" }));
      expect(res.status).toBe(400);
    });

    it("id 為空字串時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PATCH(makePatchRequest({ id: "", review_status: "approved" }));
      expect(res.status).toBe(400);
    });
  });

  describe("RU-03: 無效 review_status 回傳 400", () => {
    it("review_status=pending 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PATCH(makePatchRequest({ id: ARTICLE_ID, review_status: "pending" }));
      expect(res.status).toBe(400);
    });

    it("review_status 缺失時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PATCH(makePatchRequest({ id: ARTICLE_ID }));
      expect(res.status).toBe(400);
    });

    it("review_status 為任意字串時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PATCH(makePatchRequest({ id: ARTICLE_ID, review_status: "published" }));
      expect(res.status).toBe(400);
    });
  });

  describe("RU-04: approved 審核，無 reason", () => {
    it("成功更新並回傳 { success, id, review_status }", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockCreateServiceClient.mockReturnValue(makeUpdateSupabase({ error: null }));

      const res = await PATCH(
        makePatchRequest({ id: ARTICLE_ID, review_status: "approved" })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.id).toBe(ARTICLE_ID);
      expect(body.review_status).toBe("approved");
    });
  });

  describe("RU-05: rejected 審核，有 reason", () => {
    it("updateData 包含 reviewer_note", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockCreateServiceClient.mockReturnValue({
        from: vi.fn().mockReturnValue({ update: updateMock }),
      });

      const res = await PATCH(
        makePatchRequest({
          id: ARTICLE_ID,
          review_status: "rejected",
          reason: "文章品質不達標",
        })
      );
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ reviewer_note: "文章品質不達標" })
      );
    });

    it("approved 但有 reason 時 reviewer_note 也被寫入", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockCreateServiceClient.mockReturnValue({
        from: vi.fn().mockReturnValue({ update: updateMock }),
      });

      await PATCH(
        makePatchRequest({
          id: ARTICLE_ID,
          review_status: "approved",
          reason: "品質優良",
        })
      );
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ reviewer_note: "品質優良" })
      );
    });
  });

  describe("RU-06: DB 錯誤回傳 500", () => {
    it("Supabase update error 時回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockCreateServiceClient.mockReturnValue(
        makeUpdateSupabase({ error: { message: "row locked" } })
      );

      const res = await PATCH(
        makePatchRequest({ id: ARTICLE_ID, review_status: "approved" })
      );
      expect(res.status).toBe(500);
    });
  });
});
