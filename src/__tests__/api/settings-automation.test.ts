import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Supabase：需要支援同一個 from() 被呼叫多次（automation_settings + raw_articles）
const mockFromImpl = vi.fn();
vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => ({ from: mockFromImpl }),
}));

import { GET, PUT } from "@/app/api/settings/automation/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/settings/automation", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/settings/automation", () => {
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

    it("正常取得設定 + pending_raw_count", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });

      // automation_settings 查詢
      const settingsData = {
        id: 1,
        is_auto_mode: true,
        article_threshold: 5,
        check_interval_minutes: 30,
        updated_at: "2026-01-01T00:00:00Z",
      };
      // raw_articles count 查詢
      const countData = { count: 12 };

      // 第一次呼叫 from("automation_settings")，第二次呼叫 from("raw_articles")
      mockFromImpl
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({ data: settingsData, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: 12, error: null }),
          }),
        });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.is_auto_mode).toBe(true);
      expect(body.article_threshold).toBe(5);
      expect(body.check_interval_minutes).toBe(30);
      expect(body).toHaveProperty("pending_raw_count");
    });

    it("pending count 查詢失敗時 pending_raw_count 為 0", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });

      const settingsData = { id: 1, is_auto_mode: false, article_threshold: 3, check_interval_minutes: 10 };

      mockFromImpl
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({ data: settingsData, error: null }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: null, error: { message: "count failed" } }),
          }),
        });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pending_raw_count).toBe(0);
    });

    it("設定查詢失敗回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });

      mockFromImpl
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({ data: null, error: { message: "settings not found" } }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ count: 0, error: null }),
          }),
        });

      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe("PUT", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const req = makeRequest({ is_auto_mode: true });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("article_threshold < 1 被忽略，不傳入 DB", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });

      const capturedUpdates: Record<string, unknown>[] = [];
      mockFromImpl.mockReturnValue({
        update: vi.fn().mockImplementation((data) => {
          capturedUpdates.push(data);
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({ data: { id: 1 }, error: null }),
              }),
            }),
          };
        }),
      });

      const req = makeRequest({ article_threshold: 0 });
      await PUT(req);

      // article_threshold 不應出現在 updates 中
      expect(capturedUpdates[0]).not.toHaveProperty("article_threshold");
    });

    it("check_interval_minutes < 1 被忽略", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });

      const capturedUpdates: Record<string, unknown>[] = [];
      mockFromImpl.mockReturnValue({
        update: vi.fn().mockImplementation((data) => {
          capturedUpdates.push(data);
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({ data: { id: 1 }, error: null }),
              }),
            }),
          };
        }),
      });

      const req = makeRequest({ check_interval_minutes: 0 });
      await PUT(req);

      expect(capturedUpdates[0]).not.toHaveProperty("check_interval_minutes");
    });

    it("合法值全部更新成功", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const updatedData = {
        id: 1,
        is_auto_mode: true,
        article_threshold: 10,
        check_interval_minutes: 60,
        updated_at: "2026-01-01T00:00:00Z",
      };
      mockFromImpl.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({ data: updatedData, error: null }),
            }),
          }),
        }),
      });

      const req = makeRequest({ is_auto_mode: true, article_threshold: 10, check_interval_minutes: 60 });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.is_auto_mode).toBe(true);
      expect(body.article_threshold).toBe(10);
      expect(body.check_interval_minutes).toBe(60);
    });

    it("is_auto_mode=false 也可以正確更新", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      const updatedData = { id: 1, is_auto_mode: false, article_threshold: 5, check_interval_minutes: 30 };

      const capturedUpdates: Record<string, unknown>[] = [];
      mockFromImpl.mockReturnValue({
        update: vi.fn().mockImplementation((data) => {
          capturedUpdates.push(data);
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({ data: updatedData, error: null }),
              }),
            }),
          };
        }),
      });

      const req = makeRequest({ is_auto_mode: false });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      expect(capturedUpdates[0]).toHaveProperty("is_auto_mode", false);
    });

    it("article_threshold = 1 為最小合法值，應被接受", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });

      const capturedUpdates: Record<string, unknown>[] = [];
      mockFromImpl.mockReturnValue({
        update: vi.fn().mockImplementation((data) => {
          capturedUpdates.push(data);
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockReturnValue({ data: { id: 1 }, error: null }),
              }),
            }),
          };
        }),
      });

      const req = makeRequest({ article_threshold: 1 });
      await PUT(req);
      expect(capturedUpdates[0]).toHaveProperty("article_threshold", 1);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Admin" } });
      mockFromImpl.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockReturnValue({ data: null, error: { message: "update failed" } }),
            }),
          }),
        }),
      });

      const req = makeRequest({ is_auto_mode: true });
      const res = await PUT(req);
      expect(res.status).toBe(500);
    });
  });
});
