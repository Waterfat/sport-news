import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks ----
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockCreateServiceClient = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockCreateServiceClient(),
}));

const mockPublishArticle = vi.fn();
vi.mock("@/lib/publish-article", () => ({
  publishArticle: (...args: unknown[]) => mockPublishArticle(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/api/articles/generated/batch/route";
import { NextRequest } from "next/server";

// ---- Helpers ----

const ID_1 = "550e8400-e29b-41d4-a716-446655440001";
const ID_2 = "550e8400-e29b-41d4-a716-446655440002";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/articles/generated/batch", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDeleteSupabase(resolvedError: unknown = null) {
  return {
    from: vi.fn().mockReturnValue({
      delete: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: resolvedError }),
      }),
    }),
  };
}

function makePublishResult(success: boolean, id: string) {
  return {
    success,
    article_id: id,
    title: `Article ${id}`,
    channels_published: success ? 1 : 0,
    channels_failed: success ? 0 : 1,
    errors: success ? [] : ["channel error"],
  };
}

beforeEach(() => vi.clearAllMocks());

// ============================================================
// POST /api/articles/generated/batch
// ============================================================

describe("POST /api/articles/generated/batch", () => {
  describe("B-01: 未登入回傳 401", () => {
    it("session 為 null 時回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await POST(makeRequest({ ids: [ID_1], action: "delete" }));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  describe("B-02: Zod 驗證 - ids 為空陣列", () => {
    it("ids 空陣列回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await POST(makeRequest({ ids: [], action: "publish" }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });

    it("ids 缺失回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await POST(makeRequest({ action: "publish" }));
      expect(res.status).toBe(400);
    });
  });

  describe("B-03: Zod 驗證 - 無效 action", () => {
    it("action 為不支援的字串時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await POST(makeRequest({ ids: [ID_1], action: "archive" }));
      expect(res.status).toBe(400);
    });

    it("ids 包含非 UUID 格式時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await POST(makeRequest({ ids: ["not-a-uuid"], action: "delete" }));
      expect(res.status).toBe(400);
    });
  });

  describe("B-04: action=delete，成功刪除", () => {
    it("刪除 2 篇文章，回傳 success 和 deleted 數量", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockCreateServiceClient.mockReturnValue(makeDeleteSupabase(null));

      const res = await POST(makeRequest({ ids: [ID_1, ID_2], action: "delete" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deleted).toBe(2);
    });

    it("刪除單篇，deleted 為 1", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockCreateServiceClient.mockReturnValue(makeDeleteSupabase(null));

      const res = await POST(makeRequest({ ids: [ID_1], action: "delete" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.deleted).toBe(1);
    });
  });

  describe("B-05: action=delete，DB 錯誤", () => {
    it("DB delete error 時回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      mockCreateServiceClient.mockReturnValue(
        makeDeleteSupabase({ message: "FK constraint violation" })
      );

      const res = await POST(makeRequest({ ids: [ID_1], action: "delete" }));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });
  });

  describe("B-06: action=publish，全部成功", () => {
    it("2 篇全部發布成功，published=2，results 包含兩篇", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockPublishArticle
        .mockResolvedValueOnce(makePublishResult(true, ID_1))
        .mockResolvedValueOnce(makePublishResult(true, ID_2));

      const res = await POST(makeRequest({ ids: [ID_1, ID_2], action: "publish" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.published).toBe(2);
      expect(body.results).toHaveLength(2);
    });

    it("publishArticle 被依序串行呼叫（非 Promise.all）", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const callOrder: string[] = [];
      mockPublishArticle.mockImplementation(async (id: string) => {
        callOrder.push(id);
        return makePublishResult(true, id);
      });

      await POST(makeRequest({ ids: [ID_1, ID_2], action: "publish" }));

      // 串行順序應與 ids 一致
      expect(callOrder).toEqual([ID_1, ID_2]);
      expect(mockPublishArticle).toHaveBeenCalledTimes(2);
    });
  });

  describe("B-07: action=publish，部分失敗", () => {
    it("1 成 1 失，published=1，results 反映實際狀態", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockPublishArticle
        .mockResolvedValueOnce(makePublishResult(true, ID_1))
        .mockResolvedValueOnce(makePublishResult(false, ID_2));

      const res = await POST(makeRequest({ ids: [ID_1, ID_2], action: "publish" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.published).toBe(1);
      expect(body.results).toHaveLength(2);
      expect(body.results[0].success).toBe(true);
      expect(body.results[1].success).toBe(false);
    });

    it("全部失敗，published=0，response 仍為 200", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockPublishArticle
        .mockResolvedValueOnce(makePublishResult(false, ID_1))
        .mockResolvedValueOnce(makePublishResult(false, ID_2));

      const res = await POST(makeRequest({ ids: [ID_1, ID_2], action: "publish" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.published).toBe(0);
    });
  });
});
