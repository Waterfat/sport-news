import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock Supabase ─────────────────────────────────────────────────────────────
const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabase,
}));

import { GET, POST } from "@/app/api/public/likes/route";

function makeGetRequest(articleId?: string) {
  const url = new URL("http://localhost/api/public/likes");
  if (articleId) url.searchParams.set("article_id", articleId);
  return new NextRequest(url.toString());
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/public/likes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1" },
  });
}

function buildCountChain(count: number) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    head: true,
    then: undefined,
    // end result
    mockResult: { count, error: null },
  };
}

describe("GET /api/public/likes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("缺少 article_id 回傳 400", async () => {
    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("article_id is required");
  });

  it("回傳 likes 計數與 liked 狀態（未按讚）", async () => {
    // First call: count query
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Simulate awaiting the chain resolves with count
    countChain.eq.mockResolvedValueOnce({ count: 5, error: null });

    // Second call: check existing like
    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(existingChain);

    const req = makeGetRequest("article-abc");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.article_id).toBe("article-abc");
    expect(body.likes).toBe(5);
    expect(body.liked).toBe(false);
  });

  it("回傳 liked=true 當 IP 已按讚", async () => {
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    countChain.eq.mockResolvedValueOnce({ count: 3, error: null });

    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "like-123" } }),
    };

    mockSupabase.from
      .mockReturnValueOnce(countChain)
      .mockReturnValueOnce(existingChain);

    const req = makeGetRequest("article-xyz");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.liked).toBe(true);
  });
});

describe("POST /api/public/likes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("缺少 article_id 回傳 400", async () => {
    const req = makePostRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("article_id is required");
  });

  it("新增按讚（之前未按）", async () => {
    // Check existing → null
    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    // Insert new like
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    // Count after insert
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    countChain.eq.mockResolvedValueOnce({ count: 1, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(countChain);

    const req = makePostRequest({ article_id: "art-1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.liked).toBe(true);
    expect(body.count).toBe(1);
  });

  it("取消按讚（之前已按）", async () => {
    // Check existing → found
    const existingChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "like-999" } }),
    };

    // Delete like
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };

    // Count after delete
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    countChain.eq.mockResolvedValueOnce({ count: 0, error: null });

    mockSupabase.from
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(deleteChain)
      .mockReturnValueOnce(countChain);

    const req = makePostRequest({ article_id: "art-1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.liked).toBe(false);
    expect(body.count).toBe(0);
  });
});
