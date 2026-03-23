/**
 * 整合測試：src/app/api/member/bookmarks/route.ts
 * 覆蓋 GET / POST / DELETE 的認證邊界與 DB 互動
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock auth ─────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

// ── Mock Supabase ─────────────────────────────────────────────────────────

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  order: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  // 讓 builder 可以被 await（返回 { data, error }）
  then: undefined as unknown,
};

// 讓每個方法都返回 self 以支援鏈式呼叫
Object.keys(mockQueryBuilder).forEach((k) => {
  if (k !== "then" && typeof (mockQueryBuilder as Record<string, unknown>)[k] === "function") {
    ((mockQueryBuilder as Record<string, unknown>)[k] as ReturnType<typeof vi.fn>).mockReturnValue(mockQueryBuilder);
  }
});

let dbResult: { data: unknown; error: unknown } = { data: null, error: null };

mockQueryBuilder.then = (resolve: (v: unknown) => unknown) =>
  Promise.resolve(resolve(dbResult));

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => ({
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  }),
}));

import { GET, POST, DELETE } from "@/app/api/member/bookmarks/route";

// ── Helpers ───────────────────────────────────────────────────────────────

const MEMBER_SESSION = { user: { memberId: "mem-001" } };

function makeRequest(method: string, body?: Record<string, unknown>, search?: string): NextRequest {
  const url = `http://localhost/api/member/bookmarks${search ? `?${search}` : ""}`;
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── GET ───────────────────────────────────────────────────────────────────

describe("GET /api/member/bookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockQueryBuilder).forEach((k) => {
      const fn = (mockQueryBuilder as Record<string, unknown>)[k];
      if (k !== "then" && typeof fn === "function") {
        (fn as ReturnType<typeof vi.fn>).mockReturnValue(mockQueryBuilder);
      }
    });
    mockQueryBuilder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve(dbResult));
  });

  it("BKM-001: 未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("BKM-002: 查詢已收藏文章 → { bookmarked: true }", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    dbResult = { data: { id: "bkm-1" }, error: null };
    const res = await GET(makeRequest("GET", undefined, "article_id=art-1"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookmarked).toBe(true);
  });

  it("BKM-003: 查詢未收藏文章 → { bookmarked: false }", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    dbResult = { data: null, error: null };
    const res = await GET(makeRequest("GET", undefined, "article_id=art-2"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookmarked).toBe(false);
  });

  it("BKM-004: 取得收藏列表 → { bookmarks: [...] }", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    dbResult = {
      data: [
        { article_id: "art-1", created_at: "2024-01-01", generated_articles: { id: "art-1", title: "Test" } },
      ],
      error: null,
    };
    const res = await GET(makeRequest("GET"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.bookmarks)).toBe(true);
    expect(json.bookmarks[0].article_id).toBe("art-1");
  });
});

// ── POST ──────────────────────────────────────────────────────────────────

describe("POST /api/member/bookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockQueryBuilder).forEach((k) => {
      const fn = (mockQueryBuilder as Record<string, unknown>)[k];
      if (k !== "then" && typeof fn === "function") {
        (fn as ReturnType<typeof vi.fn>).mockReturnValue(mockQueryBuilder);
      }
    });
    mockQueryBuilder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve(dbResult));
  });

  it("BKM-005: 未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest("POST", { article_id: "art-1" }));
    expect(res.status).toBe(401);
  });

  it("BKM-006: 缺少 article_id → 400", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    const res = await POST(makeRequest("POST", {}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing article_id");
  });

  it("BKM-007: 成功新增 → { bookmarked: true }", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    dbResult = { data: null, error: null };
    const res = await POST(makeRequest("POST", { article_id: "art-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookmarked).toBe(true);
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────

describe("DELETE /api/member/bookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockQueryBuilder).forEach((k) => {
      const fn = (mockQueryBuilder as Record<string, unknown>)[k];
      if (k !== "then" && typeof fn === "function") {
        (fn as ReturnType<typeof vi.fn>).mockReturnValue(mockQueryBuilder);
      }
    });
    mockQueryBuilder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve(resolve(dbResult));
  });

  it("BKM-008: 未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", { article_id: "art-1" }));
    expect(res.status).toBe(401);
  });

  it("BKM-009: 成功取消收藏 → { bookmarked: false }", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    dbResult = { data: null, error: null };
    const res = await DELETE(makeRequest("DELETE", { article_id: "art-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.bookmarked).toBe(false);
  });

  it("缺少 article_id → 400", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    const res = await DELETE(makeRequest("DELETE", {}));
    expect(res.status).toBe(400);
  });
});
