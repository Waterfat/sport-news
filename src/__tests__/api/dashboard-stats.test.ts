import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Supabase
const mockFromImpl = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => ({ from: mockFromImpl }),
}));

import { GET } from "@/app/api/dashboard/stats/route";

// 建立 count 查詢的 mock builder（回傳 { count: N, error: null }）
function countBuilder(count: number) {
  return {
    select: vi.fn().mockReturnValue({
      count,
      error: null,
    }),
  };
}

// 建立帶有篩選條件的 count 查詢
function filteredCountBuilder(count: number) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    count,
    error: null,
  };
  return builder;
}

// 建立回傳 data 陣列的查詢
function dataBuilder(data: unknown[]) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        data,
        error: null,
      }),
    }),
  };
}

describe("/api/dashboard/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未登入回傳 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("session.user 為 undefined 回傳 401", async () => {
    mockAuth.mockResolvedValue({ user: undefined });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("正常回傳包含所有統計欄位的物件", async () => {
    mockAuth.mockResolvedValue({ user: { name: "Admin" } });

    // 按照 dashboard/stats/route.ts 的 Promise.all 呼叫順序設定 mock
    // 1. raw_articles count
    // 2. generated_articles draft count
    // 3. generated_articles published count
    // 4. writer_personas data
    // 5. raw_articles today count
    // 6. generated_articles today count
    // 7. publish_channels active data
    // 8. generated_articles today published count
    // 9. generated_articles scheduled count
    // 10. generated_articles view_count data

    mockFromImpl
      // 1. raw_articles 總數
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ count: 100, error: null }),
      })
      // 2. generated_articles draft
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ count: 10, error: null }),
        }),
      })
      // 3. generated_articles published
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ count: 50, error: null }),
        }),
      })
      // 4. writer_personas
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          data: [{ id: "p1", name: "作家A", is_active: true }],
          error: null,
        }),
      })
      // 5. raw_articles today
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({ count: 20, error: null }),
        }),
      })
      // 6. generated_articles today
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({ count: 5, error: null }),
        }),
      })
      // 7. publish_channels active
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [{ id: 1, name: "Telegram", type: "telegram", is_active: true }],
            error: null,
          }),
        }),
      })
      // 8. generated_articles today published
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({ count: 3, error: null }),
          }),
        }),
      })
      // 9. generated_articles scheduled
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({ count: 2, error: null }),
          }),
        }),
      })
      // 10. generated_articles view_count
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            data: [{ view_count: 100 }, { view_count: 200 }, { view_count: 50 }],
            error: null,
          }),
        }),
      });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    // 驗證所有欄位存在
    expect(body).toHaveProperty("raw_articles_total");
    expect(body).toHaveProperty("today_raw");
    expect(body).toHaveProperty("today_generated");
    expect(body).toHaveProperty("draft");
    expect(body).toHaveProperty("published");
    expect(body).toHaveProperty("today_published");
    expect(body).toHaveProperty("scheduled");
    expect(body).toHaveProperty("total_views");
    expect(body).toHaveProperty("personas");
    expect(body).toHaveProperty("channels");
  });

  it("view_count 加總計算正確", async () => {
    mockAuth.mockResolvedValue({ user: { name: "Admin" } });

    // 設定前 9 個查詢都返回 count: 0 或空 data
    for (let i = 0; i < 9; i++) {
      mockFromImpl.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({ count: 0, error: null }),
            not: vi.fn().mockReturnValue({ count: 0, error: null }),
            count: 0,
            error: null,
            data: [],
          }),
          gte: vi.fn().mockReturnValue({ count: 0, error: null }),
          count: 0,
          error: null,
          data: [],
        }),
      });
    }

    // 第 10 個：view_count 資料
    mockFromImpl.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [{ view_count: 100 }, { view_count: 250 }, { view_count: 50 }],
          error: null,
        }),
      }),
    });

    const res = await GET();
    const body = await res.json();

    expect(body.total_views).toBe(400);
  });

  it("view_count 為 null 時計算為 0，不產生 NaN", async () => {
    mockAuth.mockResolvedValue({ user: { name: "Admin" } });

    for (let i = 0; i < 9; i++) {
      mockFromImpl.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({ count: 0, error: null }),
            not: vi.fn().mockReturnValue({ count: 0, error: null }),
            count: 0,
            error: null,
            data: [],
          }),
          gte: vi.fn().mockReturnValue({ count: 0, error: null }),
          count: 0,
          error: null,
          data: [],
        }),
      });
    }

    // view_count 含 null 值
    mockFromImpl.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [{ view_count: null }, { view_count: 150 }, { view_count: null }],
          error: null,
        }),
      }),
    });

    const res = await GET();
    const body = await res.json();

    expect(typeof body.total_views).toBe("number");
    expect(isNaN(body.total_views)).toBe(false);
    expect(body.total_views).toBe(150);
  });

  it("personas 和 channels 為陣列結構", async () => {
    mockAuth.mockResolvedValue({ user: { name: "Admin" } });

    const personas = [
      { id: "p1", name: "寫手A", is_active: true },
      { id: "p2", name: "寫手B", is_active: false },
    ];
    const channels = [
      { id: 1, name: "Telegram主頻道", type: "telegram", is_active: true },
    ];

    // 建立符合路由實際呼叫順序的 mock
    mockFromImpl
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ count: 0, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ count: 0, error: null }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ count: 0, error: null }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({ data: personas, error: null }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({ count: 0, error: null }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({ count: 0, error: null }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: channels, error: null }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({ count: 0, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({ count: 0, error: null }),
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      });

    const res = await GET();
    const body = await res.json();

    expect(Array.isArray(body.personas)).toBe(true);
    expect(body.personas).toHaveLength(2);
    expect(Array.isArray(body.channels)).toBe(true);
    expect(body.channels).toHaveLength(1);
  });
});
