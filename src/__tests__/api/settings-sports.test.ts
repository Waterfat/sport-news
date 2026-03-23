import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Supabase
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { GET, POST } from "@/app/api/settings/sports/route";
import { NextRequest } from "next/server";

// 模擬 Supabase 鏈式呼叫的 builder
function makeSelectBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      ...result,
    }),
  };
}

function makeUpsertBuilder(result: { error: unknown }) {
  return {
    upsert: vi.fn().mockReturnValue(result),
  };
}

describe("/api/settings/sports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
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

    it("DB 回傳空陣列時使用 SPORTS 預設值", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(makeSelectBuilder({ data: [], error: null }));

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();

      // 應包含四個球種
      expect(body).toHaveProperty("basketball");
      expect(body).toHaveProperty("baseball");
      expect(body).toHaveProperty("football");
      expect(body).toHaveProperty("soccer");

      // basketball 預設 enabled = true
      expect(body.basketball.enabled).toBe(true);
      // 其他三個預設 enabled = false
      expect(body.baseball.enabled).toBe(false);
      expect(body.football.enabled).toBe(false);
      expect(body.soccer.enabled).toBe(false);
    });

    it("DB 有資料時覆蓋預設值", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(
        makeSelectBuilder({
          data: [
            {
              sport_key: "basketball",
              enabled: false,
              sources: ["ESPN"],
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          error: null,
        })
      );

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      // DB 值覆蓋預設
      expect(body.basketball.enabled).toBe(false);
      expect(body.basketball.sources).toEqual(["ESPN"]);
    });

    it("DB 回傳含 sources 的資料，sources 正確對應", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(
        makeSelectBuilder({
          data: [
            {
              sport_key: "baseball",
              enabled: true,
              sources: ["udn", "mlb.com"],
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
          error: null,
        })
      );

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.baseball.sources).toEqual(["udn", "mlb.com"]);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(
        makeSelectBuilder({ data: null, error: { message: "connection refused" } })
      );

      const res = await GET();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("connection refused");
    });

    it("DB 回傳未知 sport_key 時被忽略", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(
        makeSelectBuilder({
          data: [
            { sport_key: "tennis", enabled: true, sources: [], updated_at: null },
          ],
          error: null,
        })
      );

      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      // tennis 不在 SPORTS，不應出現在回應
      expect(body).not.toHaveProperty("tennis");
    });
  });

  describe("POST", () => {
    function makePostRequest(body: Record<string, unknown>) {
      return new NextRequest("http://localhost/api/settings/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makePostRequest({ sport_key: "basketball" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("無效 sport_key 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makePostRequest({ sport_key: "tennis", enabled: true });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid sport_key");
    });

    it("缺少 sport_key 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makePostRequest({ enabled: true });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("合法 sport_key + enabled=true 成功更新", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(makeUpsertBuilder({ error: null }));

      const req = makePostRequest({ sport_key: "basketball", enabled: true });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.sport_key).toBe("basketball");
      expect(body.enabled).toBe(true);
    });

    it("合法 sport_key + sources 陣列成功更新", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(makeUpsertBuilder({ error: null }));

      const req = makePostRequest({
        sport_key: "baseball",
        sources: ["mlb.com", "udn"],
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.sources).toEqual(["mlb.com", "udn"]);
    });

    it("DB upsert 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(makeUpsertBuilder({ error: { message: "upsert failed" } }));

      const req = makePostRequest({ sport_key: "basketball", enabled: true });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });

    it("所有四個球種 key 皆合法", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFrom.mockReturnValue(makeUpsertBuilder({ error: null }));

      for (const key of ["basketball", "baseball", "football", "soccer"]) {
        const req = makePostRequest({ sport_key: key, enabled: true });
        const res = await POST(req);
        expect(res.status).toBe(200);
      }
    });
  });
});
