import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock Supabase ─────────────────────────────────────────────────────────────
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabase,
}));

import { POST } from "@/app/api/public/articles/[slug]/view/route";

function makeRequest(slug: string) {
  return new NextRequest(`http://localhost/api/public/articles/${slug}/view`, {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makeContext(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe("POST /api/public/articles/[slug]/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("以 slug 找到文章並累計 view_count", async () => {
    const articleData = { id: "uuid-123", view_count: 10 };

    // slug lookup → found
    const slugChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: articleData }),
    };

    // article_views insert
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(slugChain)    // slug lookup
      .mockReturnValueOnce(insertChain); // article_views insert

    mockSupabase.rpc.mockResolvedValue({ data: 11, error: null });

    const req = makeRequest("nba-report");
    const res = await POST(req, makeContext("nba-report"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.view_count).toBe(11);
  });

  it("slug 找不到時 fallback 以 id 查找", async () => {
    const articleData = { id: "uuid-456", view_count: 5 };

    // slug lookup → null
    const slugChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    };

    // id lookup → found
    const idChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: articleData }),
    };

    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(slugChain)    // slug lookup fails
      .mockReturnValueOnce(idChain)      // id lookup succeeds
      .mockReturnValueOnce(insertChain); // analytics insert

    mockSupabase.rpc.mockResolvedValue({ data: 6, error: null });

    const req = makeRequest("uuid-456");
    const res = await POST(req, makeContext("uuid-456"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("slug 與 id 均找不到回傳 404", async () => {
    const emptyChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(emptyChain)
      .mockReturnValueOnce(emptyChain);

    const req = makeRequest("non-existent");
    const res = await POST(req, makeContext("non-existent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Article not found");
  });

  it("RPC 失敗時仍回傳 success（fallback 計數）", async () => {
    const articleData = { id: "uuid-789", view_count: 20 };

    const slugChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: articleData }),
    };

    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(slugChain)
      .mockReturnValueOnce(insertChain);

    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } });

    const req = makeRequest("some-slug");
    const res = await POST(req, makeContext("some-slug"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.view_count).toBe(21); // fallback: view_count + 1
  });
});
