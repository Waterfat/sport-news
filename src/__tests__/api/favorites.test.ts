/**
 * 整合測試：src/app/api/member/favorites/route.ts
 * 覆蓋 GET / POST / DELETE 的認證邊界、防重複邏輯
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock auth ─────────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

// ── Mock member lib ───────────────────────────────────────────────────────

const mockGetMemberPreferences = vi.fn();
const mockUpdateMemberPreferences = vi.fn();

vi.mock("@/lib/member", () => ({
  getMemberPreferences: (...args: unknown[]) => mockGetMemberPreferences(...args),
  updateMemberPreferences: (...args: unknown[]) => mockUpdateMemberPreferences(...args),
}));

import { GET, POST, DELETE } from "@/app/api/member/favorites/route";

// ── Helpers ───────────────────────────────────────────────────────────────

const MEMBER_SESSION = { user: { memberId: "mem-001" } };
const LAKERS = { sport: "nba", teamId: "LAL", name: "Lakers" };
const WARRIORS = { sport: "nba", teamId: "GSW", name: "Warriors" };

function makeRequest(method: string, body?: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/member/favorites", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const EMPTY_PREFS = {
  member_id: "mem-001",
  favorite_teams: [],
  favorite_leagues: [],
  notification_line: false,
  notification_telegram: false,
};

// ── GET ───────────────────────────────────────────────────────────────────

describe("GET /api/member/favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("FAV-001: 未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("FAV-002: 已登入 → 返回 favorite_teams", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    mockGetMemberPreferences.mockResolvedValue({
      ...EMPTY_PREFS,
      favorite_teams: [LAKERS],
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.favorites).toEqual([LAKERS]);
  });

  it("偏好不存在時 favorites 為空陣列", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    mockGetMemberPreferences.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.favorites).toEqual([]);
  });
});

// ── POST ──────────────────────────────────────────────────────────────────

describe("POST /api/member/favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeRequest("POST", LAKERS));
    expect(res.status).toBe(401);
  });

  it("FAV-003: 缺少 sport 欄位 → 400", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    const res = await POST(makeRequest("POST", { teamId: "LAL", name: "Lakers" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing fields");
  });

  it("缺少 teamId 欄位 → 400", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    const res = await POST(makeRequest("POST", { sport: "nba", name: "Lakers" }));
    expect(res.status).toBe(400);
  });

  it("FAV-004: 新增球隊 → 包含新球隊的 favorites", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    mockGetMemberPreferences.mockResolvedValue(EMPTY_PREFS);
    mockUpdateMemberPreferences.mockResolvedValue({ ...EMPTY_PREFS, favorite_teams: [LAKERS] });

    const res = await POST(makeRequest("POST", LAKERS));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.favorites).toContainEqual(LAKERS);
    expect(mockUpdateMemberPreferences).toHaveBeenCalledWith("mem-001", {
      favorite_teams: [LAKERS],
    });
  });

  it("FAV-005: 重複新增同一球隊 → 不重複，直接返回原有陣列", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    mockGetMemberPreferences.mockResolvedValue({
      ...EMPTY_PREFS,
      favorite_teams: [LAKERS],
    });

    const res = await POST(makeRequest("POST", LAKERS));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.favorites).toEqual([LAKERS]); // 沒有重複
    expect(mockUpdateMemberPreferences).not.toHaveBeenCalled();
  });
});

// ── DELETE ────────────────────────────────────────────────────────────────

describe("DELETE /api/member/favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE", { sport: "nba", teamId: "LAL" }));
    expect(res.status).toBe(401);
  });

  it("FAV-006: 移除球隊 → 過濾後陣列（僅移除指定 sport+teamId）", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    mockGetMemberPreferences.mockResolvedValue({
      ...EMPTY_PREFS,
      favorite_teams: [LAKERS, WARRIORS],
    });
    mockUpdateMemberPreferences.mockResolvedValue({
      ...EMPTY_PREFS,
      favorite_teams: [WARRIORS],
    });

    const res = await DELETE(makeRequest("DELETE", { sport: "nba", teamId: "LAL" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.favorites).toEqual([WARRIORS]);
    expect(mockUpdateMemberPreferences).toHaveBeenCalledWith("mem-001", {
      favorite_teams: [WARRIORS],
    });
  });

  it("移除不存在的球隊 → 陣列不變", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    mockGetMemberPreferences.mockResolvedValue({
      ...EMPTY_PREFS,
      favorite_teams: [LAKERS],
    });
    mockUpdateMemberPreferences.mockResolvedValue({
      ...EMPTY_PREFS,
      favorite_teams: [LAKERS],
    });

    const res = await DELETE(makeRequest("DELETE", { sport: "nba", teamId: "BOS" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.favorites).toEqual([LAKERS]);
  });
});
