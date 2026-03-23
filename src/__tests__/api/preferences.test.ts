/**
 * 整合測試：src/app/api/member/preferences/route.ts
 * 覆蓋 GET / PUT 的認證邊界與 member lib 互動
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

import { GET, PUT } from "@/app/api/member/preferences/route";

// ── Helpers ───────────────────────────────────────────────────────────────

const MEMBER_SESSION = { user: { memberId: "mem-001" } };
const PREFS = {
  member_id: "mem-001",
  favorite_teams: [],
  favorite_leagues: [],
  notification_line: false,
  notification_telegram: false,
};

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/member/preferences", { method: "GET" });
}

function makePutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/member/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET ───────────────────────────────────────────────────────────────────

describe("GET /api/member/preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PRF-001: 未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("PRF-002: 已登入 → { preferences: {...} }", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    mockGetMemberPreferences.mockResolvedValue(PREFS);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toEqual(PREFS);
    expect(mockGetMemberPreferences).toHaveBeenCalledWith("mem-001");
  });
});

// ── PUT ───────────────────────────────────────────────────────────────────

describe("PUT /api/member/preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PRF-003: 未登入 → 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(makePutRequest({ notification_line: true }));
    expect(res.status).toBe(401);
  });

  it("PRF-004: 已登入 → 呼叫 updateMemberPreferences，返回更新後偏好", async () => {
    mockAuth.mockResolvedValue(MEMBER_SESSION);
    const updated = { ...PREFS, notification_line: true };
    mockUpdateMemberPreferences.mockResolvedValue(updated);

    const res = await PUT(makePutRequest({ notification_line: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preferences).toEqual(updated);
    expect(mockUpdateMemberPreferences).toHaveBeenCalledWith("mem-001", { notification_line: true });
  });
});
