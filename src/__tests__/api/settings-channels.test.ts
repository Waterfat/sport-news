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

import { GET, POST, PUT, DELETE } from "@/app/api/settings/channels/route";
import { NextRequest } from "next/server";

function makeRequest(method: string, body?: Record<string, unknown>, url = "http://localhost/api/settings/channels") {
  return new NextRequest(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("/api/settings/channels", () => {
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

    it("正常取得頻道列表", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const mockData = [
        { id: 1, name: "主頻道", type: "telegram", config: {}, is_active: true, created_at: "2026-01-01T00:00:00Z" },
      ];
      mockSupabaseChain.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: mockData, error: null }),
        }),
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("主頻道");
    });

    it("無頻道時回傳空陣列", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({ data: null, error: null }),
        }),
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
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
      const req = makeRequest("POST", { name: "test", type: "telegram" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("缺少 name 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("POST", { type: "telegram" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("name and type are required");
    });

    it("缺少 type 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("POST", { name: "主頻道" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("正常新增頻道，is_active 預設 true", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const newChannel = { id: 1, name: "主頻道", type: "telegram", config: {}, is_active: true };
      mockSupabaseChain.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: newChannel, error: null }),
          }),
        }),
      });

      const req = makeRequest("POST", { name: "主頻道", type: "telegram" });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("主頻道");
      expect(body.is_active).toBe(true);
    });

    it("明確傳入 is_active=false", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const newChannel = { id: 2, name: "備用頻道", type: "line", config: {}, is_active: false };
      mockSupabaseChain.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: newChannel, error: null }),
          }),
        }),
      });

      const req = makeRequest("POST", { name: "備用頻道", type: "line", is_active: false });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.is_active).toBe(false);
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

      const req = makeRequest("POST", { name: "主頻道", type: "telegram" });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("PUT", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("PUT", { id: 1, is_active: false });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("缺少 id 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("PUT", { is_active: false });
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("id is required");
    });

    it("更新 is_active 成功", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null }),
        }),
      });

      const req = makeRequest("PUT", { id: 1, is_active: false });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("更新 name 和 type 成功", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null }),
        }),
      });

      const req = makeRequest("PUT", { id: 1, name: "新名稱", type: "facebook" });
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: { message: "update failed" } }),
        }),
      });

      const req = makeRequest("PUT", { id: 1, is_active: false });
      const res = await PUT(req);
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest("DELETE", undefined, "http://localhost/api/settings/channels?id=1");
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it("缺少 id query param 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("DELETE", undefined, "http://localhost/api/settings/channels");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("valid numeric id is required");
    });

    it("非數字 id 回傳 400", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const req = makeRequest("DELETE", undefined, "http://localhost/api/settings/channels?id=abc");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("正常刪除成功", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockSupabaseChain.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null }),
        }),
      });

      const req = makeRequest("DELETE", undefined, "http://localhost/api/settings/channels?id=1");
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

      const req = makeRequest("DELETE", undefined, "http://localhost/api/settings/channels?id=1");
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});
