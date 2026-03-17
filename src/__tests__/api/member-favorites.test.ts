import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock member functions
const mockGetPrefs = vi.fn();
const mockUpdatePrefs = vi.fn();
vi.mock("@/lib/member", () => ({
  getMemberPreferences: (...args: unknown[]) => mockGetPrefs(...args),
  updateMemberPreferences: (...args: unknown[]) => mockUpdatePrefs(...args),
}));

import { GET, POST, DELETE } from "@/app/api/member/favorites/route";
import { NextRequest } from "next/server";

function makeRequest(method: string, body?: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/member/favorites", {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/member/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("未登入回傳 401", async () => {
      mockAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("無 memberId 回傳 401", async () => {
      mockAuth.mockResolvedValue({ user: { name: "Test" } });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("正常取得 favorites", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockResolvedValue({
        favorite_teams: [{ sport: "nba", teamId: "13", name: "Lakers" }],
      });

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.favorites).toHaveLength(1);
      expect(data.favorites[0].teamId).toBe("13");
    });

    it("無 preferences 回傳空陣列", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockResolvedValue(null);

      const res = await GET();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.favorites).toEqual([]);
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockRejectedValue(new Error("DB connection failed"));

      const res = await GET();
      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("缺少欄位回傳 400", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });

      const req = makeRequest("POST", { sport: "nba" });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("正常新增 favorite", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockResolvedValue({ favorite_teams: [] });
      mockUpdatePrefs.mockResolvedValue(null);

      const req = makeRequest("POST", {
        sport: "nba",
        teamId: "13",
        name: "Lakers",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.favorites).toHaveLength(1);
      expect(mockUpdatePrefs).toHaveBeenCalledWith("m1", {
        favorite_teams: [{ sport: "nba", teamId: "13", name: "Lakers" }],
      });
    });

    it("重複新增不產生重複項", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockResolvedValue({
        favorite_teams: [{ sport: "nba", teamId: "13", name: "Lakers" }],
      });

      const req = makeRequest("POST", {
        sport: "nba",
        teamId: "13",
        name: "Lakers",
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.favorites).toHaveLength(1);
      expect(mockUpdatePrefs).not.toHaveBeenCalled();
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockRejectedValue(new Error("DB error"));

      const req = makeRequest("POST", {
        sport: "nba",
        teamId: "13",
        name: "Lakers",
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("正常刪除 favorite", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockResolvedValue({
        favorite_teams: [
          { sport: "nba", teamId: "13", name: "Lakers" },
          { sport: "mlb", teamId: "5", name: "Yankees" },
        ],
      });
      mockUpdatePrefs.mockResolvedValue(null);

      const req = makeRequest("DELETE", { sport: "nba", teamId: "13" });
      const res = await DELETE(req);
      const data = await res.json();

      expect(data.favorites).toHaveLength(1);
      expect(data.favorites[0].sport).toBe("mlb");
    });

    it("DB 錯誤回傳 500", async () => {
      mockAuth.mockResolvedValue({
        user: { memberId: "m1", role: "member" },
      });
      mockGetPrefs.mockRejectedValue(new Error("DB error"));

      const req = makeRequest("DELETE", { sport: "nba", teamId: "13" });
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});
