import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockSupabase = { from: vi.fn() };

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabase,
}));

import { POST } from "@/app/api/public/submissions/route";

const validBody = {
  name: "王小明",
  email: "wang@example.com",
  specialty: "NBA 分析",
  portfolio_url: "https://portfolio.example.com",
  introduction: "熱愛運動寫作",
};

// Use unique IPs per test to avoid rate limit state pollution
let ipCounter = 1;
function makeRequest(body: Record<string, unknown>, ip?: string) {
  const testIp = ip ?? `10.${ipCounter++}.0.1`;
  return new NextRequest("http://localhost/api/public/submissions", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": testIp,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset IP counter at start of each test group
  ipCounter = Math.floor(Math.random() * 200) + 10;
});

describe("POST /api/public/submissions", () => {
  it("缺少必填欄位（name）回傳 400 with VALIDATION_ERROR", async () => {
    const { name: _name, ...bodyWithoutName } = validBody;
    const req = makeRequest(bodyWithoutName);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors[0].code).toBe("VALIDATION_ERROR");
  });

  it("缺少必填欄位（email）回傳 400", async () => {
    const { email: _email, ...bodyWithoutEmail } = validBody;
    const req = makeRequest(bodyWithoutEmail);
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("email 格式不正確回傳 400", async () => {
    const req = makeRequest({ ...validBody, email: "bad-email" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("name 過長（> 50 字）回傳 400", async () => {
    const req = makeRequest({ ...validBody, name: "A".repeat(51) });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("introduction 過長（> 500 字）回傳 400", async () => {
    const req = makeRequest({ ...validBody, introduction: "X".repeat(501) });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("portfolio_url 格式不正確回傳 400", async () => {
    const req = makeRequest({ ...validBody, portfolio_url: "not-a-url" });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("portfolio_url 可為空字串", async () => {
    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain);

    const req = makeRequest({ ...validBody, portfolio_url: "" });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("重複申請（相同 email + pending status）回傳 409", async () => {
    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-app" } }),
    };
    mockSupabase.from.mockReturnValue(checkChain);

    const req = makeRequest(validBody);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.errors[0].code).toBe("DUPLICATE");
  });

  it("成功提交回傳 201", async () => {
    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabase.from
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain);

    const req = makeRequest(validBody);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("rate limit：同 IP 超過 3 次回傳 429", async () => {
    // Use a fixed IP specifically for this test
    const testIp = "192.0.99.250";

    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    // First 3 requests: provide mocks for success
    for (let i = 0; i < 3; i++) {
      mockSupabase.from
        .mockReturnValueOnce(checkChain)
        .mockReturnValueOnce(insertChain);
      const req = makeRequest({ ...validBody, email: `user-rl-${i}@example.com` }, testIp);
      await POST(req);
    }

    // 4th request from same IP should be rate limited (no mock needed)
    const req = makeRequest({ ...validBody, email: "user-rl-4@example.com" }, testIp);
    const res = await POST(req);

    expect(res.status).toBe(429);
  });

  it("DB 錯誤回傳 500", async () => {
    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: { message: "Insert failed" } }),
    };
    mockSupabase.from
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain);

    const req = makeRequest(validBody);
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
