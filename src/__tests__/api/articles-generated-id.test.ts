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

import { GET, PATCH } from "@/app/api/articles/generated/[id]/route";
import { NextRequest } from "next/server";

// ---- Helpers ----

const ARTICLE_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeGetRequest(id = ARTICLE_ID) {
  return new NextRequest(`http://localhost/api/articles/generated/${id}`);
}

function makePatchRequest(id = ARTICLE_ID, body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost/api/articles/generated/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id = ARTICLE_ID) {
  return Promise.resolve({ id });
}

/** 建立 Supabase mock，支援多次 from() 呼叫，依序回傳 handlers 結果 */
function makeSequentialSupabase(handlers: Array<() => Record<string, unknown>>) {
  let idx = 0;
  return {
    from: vi.fn().mockImplementation(() => handlers[idx++]?.() ?? {}),
  };
}

/** 建立 single() 結尾的查詢鏈 */
function singleChain(resolvedValue: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
}

/** 建立 in() 結尾的查詢鏈（raw_articles query） */
function inChain(resolvedValue: { data: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(resolvedValue),
  };
}

/** 建立 update().eq() 結尾的鏈 */
function updateChain(resolvedValue: { data: unknown; error: unknown }) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(resolvedValue),
        }),
      }),
    }),
  };
}

const sampleArticle = {
  id: ARTICLE_ID,
  title: "Test Article",
  content: "Content",
  slug: "test-article",
  status: "draft",
  raw_article_ids: [],
  writer_personas: null,
};

beforeEach(() => vi.clearAllMocks());

// ============================================================
// GET /api/articles/generated/[id]
// ============================================================

describe("GET /api/articles/generated/[id]", () => {
  describe("D-01: 未登入回傳 401", () => {
    it("session 為 null 時回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET(makeGetRequest(), { params: makeParams() });
      expect(res.status).toBe(401);
    });
  });

  describe("D-02: 找不到文章回傳 404", () => {
    it("DB error 時回傳 404", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const supabase = {
        from: vi.fn().mockReturnValue(
          singleChain({ data: null, error: { message: "Not found" } })
        ),
      };
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeGetRequest(), { params: makeParams() });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });
  });

  describe("D-03: raw_article_ids 為空時不查詢 raw_articles", () => {
    it("回傳空 rawArticles 且不發出 raw_articles 查詢", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const articleWithNoRaw = { ...sampleArticle, raw_article_ids: [] };

      const fromMock = vi.fn().mockReturnValue(
        singleChain({ data: articleWithNoRaw, error: null })
      );
      mockCreateServiceClient.mockReturnValue({ from: fromMock });

      const res = await GET(makeGetRequest(), { params: makeParams() });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rawArticles).toEqual([]);

      // 只應該查詢一次 generated_articles，不應查詢 raw_articles
      const tableNames = fromMock.mock.calls.map(([table]: [string]) => table);
      expect(tableNames).not.toContain("raw_articles");
    });
  });

  describe("D-04: raw_article_ids 有值時查詢 raw_articles", () => {
    it("查詢並回傳 rawArticles", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const articleWithRaw = { ...sampleArticle, raw_article_ids: ["r1", "r2"] };
      const rawArticles = [{ id: "r1", title: "Raw 1" }, { id: "r2", title: "Raw 2" }];

      const supabase = makeSequentialSupabase([
        () => singleChain({ data: articleWithRaw, error: null }),
        () => inChain({ data: rawArticles }),
      ]);
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeGetRequest(), { params: makeParams() });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.article).toEqual(articleWithRaw);
      expect(body.rawArticles).toEqual(rawArticles);
    });

    it("raw_articles 查詢回傳 null 時 rawArticles 為空陣列", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const articleWithRaw = { ...sampleArticle, raw_article_ids: ["r1"] };

      const supabase = makeSequentialSupabase([
        () => singleChain({ data: articleWithRaw, error: null }),
        () => inChain({ data: null }),
      ]);
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await GET(makeGetRequest(), { params: makeParams() });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.rawArticles).toEqual([]);
    });
  });
});

// ============================================================
// PATCH /api/articles/generated/[id]
// ============================================================

describe("PATCH /api/articles/generated/[id]", () => {
  describe("U-01: 未登入回傳 401", () => {
    it("session 為 null 時回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await PATCH(makePatchRequest(), { params: makeParams() });
      expect(res.status).toBe(401);
    });
  });

  describe("U-02: Zod 驗證失敗回傳 400", () => {
    it("title 為空字串時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PATCH(
        makePatchRequest(ARTICLE_ID, { title: "" }),
        { params: makeParams() }
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });

    it("content 為空字串時回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });
      const res = await PATCH(
        makePatchRequest(ARTICLE_ID, { content: "" }),
        { params: makeParams() }
      );
      expect(res.status).toBe(400);
    });
  });

  describe("U-03: 更新 title + content", () => {
    it("成功更新並回傳 { article }", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const updatedArticle = { ...sampleArticle, title: "New Title", content: "New Content" };
      const supabase = {
        from: vi.fn().mockReturnValue(updateChain({ data: updatedArticle, error: null })),
      };
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await PATCH(
        makePatchRequest(ARTICLE_ID, { title: "New Title", content: "New Content" }),
        { params: makeParams() }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.article).toBeDefined();
    });
  });

  describe("U-04: 設定 scheduled_at", () => {
    it("成功設定排程時間", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const scheduledArticle = { ...sampleArticle, scheduled_at: "2026-12-01T10:00:00Z" };
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: scheduledArticle, error: null }),
          }),
        }),
      });

      mockCreateServiceClient.mockReturnValue({
        from: vi.fn().mockReturnValue({ update: updateMock }),
      });

      const res = await PATCH(
        makePatchRequest(ARTICLE_ID, { scheduled_at: "2026-12-01T10:00:00Z" }),
        { params: makeParams() }
      );
      expect(res.status).toBe(200);
      // updateMock 應被呼叫，且 scheduled_at 在傳入的 updateData 中
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ scheduled_at: "2026-12-01T10:00:00Z" })
      );
    });
  });

  describe("U-05: 發布路徑（status=published）", () => {
    it("呼叫 publishArticle(id) 並回傳 { article }", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockPublishArticle.mockResolvedValue({
        success: true,
        article_id: ARTICLE_ID,
        title: "Test",
        channels_published: 1,
        channels_failed: 0,
        errors: [],
      });

      // 發布後 route 會再查一次文章
      const publishedArticle = { ...sampleArticle, status: "published" };
      const supabase = {
        from: vi.fn().mockReturnValue(
          singleChain({ data: publishedArticle, error: null })
        ),
      };
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await PATCH(
        makePatchRequest(ARTICLE_ID, { status: "published" }),
        { params: makeParams() }
      );
      expect(res.status).toBe(200);
      expect(mockPublishArticle).toHaveBeenCalledWith(ARTICLE_ID);
    });

    it("publishArticle 回傳 errors 仍回傳 200（錯誤記錄在 log）", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      mockPublishArticle.mockResolvedValue({
        success: false,
        article_id: ARTICLE_ID,
        title: "Test",
        channels_published: 0,
        channels_failed: 1,
        errors: ["Bot token invalid"],
      });

      const publishedArticle = { ...sampleArticle, status: "published" };
      const supabase = {
        from: vi.fn().mockReturnValue(
          singleChain({ data: publishedArticle, error: null })
        ),
      };
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await PATCH(
        makePatchRequest(ARTICLE_ID, { status: "published" }),
        { params: makeParams() }
      );
      // route 不因為 channel 失敗而回傳非 200
      expect(res.status).toBe(200);
    });
  });

  describe("U-06: 發布時先更新 publish_channel_ids", () => {
    it("有傳入 publish_channel_ids 時先 update 再呼叫 publishArticle", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockPublishArticle.mockResolvedValue({
        success: true,
        article_id: ARTICLE_ID,
        title: "Test",
        channels_published: 1,
        channels_failed: 0,
        errors: [],
      });

      const publishedArticle = { ...sampleArticle, status: "published" };
      let fromCallCount = 0;
      const supabase = {
        from: vi.fn().mockImplementation(() => {
          fromCallCount++;
          if (fromCallCount === 1) {
            // 第一次：update publish_channel_ids
            return { update: updateMock };
          }
          // 後續：publishArticle 後查詢文章
          return singleChain({ data: publishedArticle, error: null });
        }),
      };
      mockCreateServiceClient.mockReturnValue(supabase);

      await PATCH(
        makePatchRequest(ARTICLE_ID, {
          status: "published",
          publish_channel_ids: [1, 2],
        }),
        { params: makeParams() }
      );

      // 確認 updateMock 被呼叫且包含 publish_channel_ids
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ publish_channel_ids: [1, 2] })
      );
      // publishArticle 應在更新後才被呼叫
      expect(mockPublishArticle).toHaveBeenCalledWith(ARTICLE_ID);
    });
  });

  describe("U-07: 非發布路徑 DB 更新失敗", () => {
    it("DB update error 時回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { id: "u1" } });

      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "DB write failed" },
                }),
              }),
            }),
          }),
        }),
      };
      mockCreateServiceClient.mockReturnValue(supabase);

      const res = await PATCH(
        makePatchRequest(ARTICLE_ID, { title: "Updated Title" }),
        { params: makeParams() }
      );
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });
  });
});
