import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Supabase
const mockSupabaseChain = {
  from: vi.fn(),
};
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => mockSupabaseChain,
}));

import { GET, POST, PUT, DELETE } from "@/app/api/settings/scoreboard/route";
import { NextRequest } from "next/server";

function makeRequest(method: string, body?: Record<string, unknown>, url = "http://localhost/api/settings/scoreboard") {
  return new NextRequest(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/settings/scoreboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("session.user 為 undefined 回傳 401", async () => {
      mockAuth.mockResolvedValue({ user: undefined });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("正常取得設定列表，回傳 {configs: [...]}", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const mockData = [
        { id: 1, sport_key: "basketball", league_key: "nba", label: "NBA", espn_endpoint: "/nba", enabled: true, sort_order: 1 },
      ];
      mockSupabaseChain.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: mockData, error: null }),
        }),
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("configs");
      expect(body.configs).toHaveLength(1);
      expect(body.configs[0].league_key).toBe("nba");
    });

    it("無資料時回傳 {configs: []}", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: null, error: null }),
        }),
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.configs).toEqual([]);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: null, error: { message: "query failed" } }),
        }),
      });

      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("POST", { sport_key: "basketball", league_key: "nba", label: "NBA", espn_endpoint: "/nba" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("缺少 sport_key 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("POST", { league_key: "nba", label: "NBA", espn_endpoint: "/nba" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing required fields");
    });

    it("缺少 league_key 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("POST", { sport_key: "basketball", label: "NBA", espn_endpoint: "/nba" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("缺少 label 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("POST", { sport_key: "basketball", league_key: "nba", espn_endpoint: "/nba" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("缺少 espn_endpoint 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("POST", { sport_key: "basketball", league_key: "nba", label: "NBA" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("正常新增設定，enabled 預設 false", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const newConfig = { id: 1, sport_key: "basketball", league_key: "nba", label: "NBA", espn_endpoint: "/nba", enabled: false, sort_order: 0 };
      mockSupabaseChain.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: newConfig, error: null }),
          }),
        }),
      });

      const req = makeRequest("POST", { sport_key: "basketball", league_key: "nba", label: "NBA", espn_endpoint: "/nba" });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("config");
      expect(body.config.enabled).toBe(false);
    });

    it("正常新增設定，sort_order 預設 0", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const newConfig = { id: 2, sport_key: "baseball", league_key: "mlb", label: "MLB", espn_endpoint: "/mlb", enabled: false, sort_order: 0 };
      mockSupabaseChain.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: newConfig, error: null }),
          }),
        }),
      });

      const req = makeRequest("POST", { sport_key: "baseball", league_key: "mlb", label: "MLB", espn_endpoint: "/mlb" });
      const res = await POST(req);
      const body = await res.json();
      expect(body.config.sort_order).toBe(0);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: null, error: { message: "insert failed" } }),
          }),
        }),
      });

      const req = makeRequest("POST", { sport_key: "basketball", league_key: "nba", label: "NBA", espn_endpoint: "/nba" });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("PUT", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("PUT", { id: 1, enabled: true });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("缺少 id 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("PUT", { enabled: true });
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing id");
    });

    it("更新 enabled 成功，回傳 {config: {...}}", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const updatedConfig = { id: 1, sport_key: "basketball", league_key: "nba", label: "NBA", espn_endpoint: "/nba", enabled: true, sort_order: 0 };
      mockSupabaseChain.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({ data: updatedConfig, error: null }),
            }),
          }),
        }),
      });

      const req = makeRequest("PUT", { id: 1, enabled: true });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("config");
      expect(body.config.enabled).toBe(true);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({ data: null, error: { message: "update failed" } }),
            }),
          }),
        }),
      });

      const req = makeRequest("PUT", { id: 1, enabled: true });
      const res = await PUT(req);
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("DELETE", { id: 1 });
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it("缺少 id（request body）回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("DELETE", {});
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing id");
    });

    it("正常刪除成功", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null }),
        }),
      });

      const req = makeRequest("DELETE", { id: 1 });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: { message: "delete failed" } }),
        }),
      });

      const req = makeRequest("DELETE", { id: 1 });
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});
