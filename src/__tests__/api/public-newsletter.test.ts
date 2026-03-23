import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabase,
}));

import { POST } from "@/app/api/public/newsletter/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/public/newsletter", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/public/newsletter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("缺少 email 回傳 400", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("email is required");
  });

  it("空白 email 回傳 400", async () => {
    const req = makeRequest({ email: "   " });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("email is required");
  });

  it("email 格式不正確回傳 400", async () => {
    const req = makeRequest({ email: "not-an-email" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid email format");
  });

  it("email 格式各種無效變體", async () => {
    const invalids = ["@example.com", "user@", "user@@example.com", "plain-text"];
    for (const email of invalids) {
      const req = makeRequest({ email });
      const res = await POST(req);
      expect(res.status).toBe(400);
    }
  });

  it("已訂閱的 email 回傳 200 + Already subscribed", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "sub-1" } }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const req = makeRequest({ email: "existing@example.com" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Already subscribed");
  });

  it("成功訂閱新 email 回傳 201", async () => {
    // check existing → null
    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    // insert
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain);

    const req = makeRequest({ email: "new@example.com" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Subscribed successfully");
  });

  it("email 自動轉小寫並去除空白", async () => {
    let capturedEmail: string | null = null;

    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((_col: string, val: string) => {
        capturedEmail = val;
        return checkChain;
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain);

    const req = makeRequest({ email: "  TEST@EXAMPLE.COM  " });
    await POST(req);

    expect(capturedEmail).toBe("test@example.com");
  });

  it("DB 錯誤回傳 500", async () => {
    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: { message: "DB insert failed" } }),
    };

    mockSupabase.from
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain);

    const req = makeRequest({ email: "user@example.com" });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
