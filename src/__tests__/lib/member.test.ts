/**
 * 整合測試：src/lib/member.ts
 * 覆蓋 findOrCreateMember 三條路徑 + getMemberPreferences / updateMemberPreferences / getMemberById
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase mock ──────────────────────────────────────────────────────────

/**
 * Chainable query builder factory
 * 支援 .from().select().eq().single() 等任意鏈式呼叫
 */
function makeQueryBuilder(returnData: unknown = null, returnError: unknown = null) {
  const builder: Record<string, unknown> = {};
  const methods = ["select", "eq", "single", "maybeSingle", "update", "insert", "upsert", "delete", "order"];
  methods.forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  // 最後一個 await 解析為 { data, error }
  (builder as { then: (resolve: (v: unknown) => unknown) => unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: returnData, error: returnError }));
  return builder;
}

let mockFrom: ReturnType<typeof vi.fn>;

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import {
  findOrCreateMember,
  getMemberPreferences,
  updateMemberPreferences,
  getMemberById,
} from "@/lib/member";

// ── helpers ───────────────────────────────────────────────────────────────

const MEMBER = {
  id: "mem-001",
  email: "user@example.com",
  name: "Test User",
  avatar_url: null,
  role: "member" as const,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const BASE_PARAMS = {
  email: "user@example.com",
  name: "Test User",
  avatar_url: null,
  provider: "google" as const,
  provider_account_id: "g-uid-123",
  access_token: "at",
  refresh_token: "rt",
  expires_at: 9999999,
};

// ── findOrCreateMember ────────────────────────────────────────────────────

describe("findOrCreateMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MEM-001: provider + account_id 已存在 → 更新 token 並返回 member", async () => {
    const updateBuilder = makeQueryBuilder(null, null);
    const memberBuilder = makeQueryBuilder(MEMBER, null);
    const accountBuilder = makeQueryBuilder({ member_id: MEMBER.id }, null);
    const profileUpdateBuilder = makeQueryBuilder(null, null);

    let callCount = 0;
    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "member_accounts" && callCount === 0) {
        callCount++;
        return accountBuilder;
      }
      if (table === "member_accounts" && callCount === 1) {
        callCount++;
        return updateBuilder;
      }
      if (table === "members" && callCount === 2) {
        callCount++;
        return memberBuilder;
      }
      if (table === "members" && callCount === 3) {
        callCount++;
        return profileUpdateBuilder;
      }
      return makeQueryBuilder(null, null);
    });

    const result = await findOrCreateMember(BASE_PARAMS);
    expect(result.id).toBe(MEMBER.id);
    expect(mockFrom).toHaveBeenCalledWith("member_accounts");
    expect(mockFrom).toHaveBeenCalledWith("members");
  });

  it("MEM-002: account_id 不存在 + email 存在 → 帳號合併（linkAccount）", async () => {
    const noAccountBuilder = makeQueryBuilder(null, null);
    const existingMemberBuilder = makeQueryBuilder(MEMBER, null);
    const upsertAccountBuilder = makeQueryBuilder(null, null);
    const profileUpdateBuilder = makeQueryBuilder(null, null);

    let callCount = 0;
    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "member_accounts" && callCount === 0) {
        callCount++;
        return noAccountBuilder; // no existing account
      }
      if (table === "members" && callCount === 1) {
        callCount++;
        return existingMemberBuilder; // email match
      }
      if (table === "member_accounts" && callCount === 2) {
        callCount++;
        return upsertAccountBuilder; // linkAccount upsert
      }
      if (table === "members" && callCount === 3) {
        callCount++;
        return profileUpdateBuilder; // update name/avatar
      }
      return makeQueryBuilder(null, null);
    });

    const result = await findOrCreateMember(BASE_PARAMS);
    expect(result.id).toBe(MEMBER.id);
    // linkAccount should have been called (member_accounts upsert)
    expect(mockFrom).toHaveBeenCalledWith("member_accounts");
  });

  it("MEM-003: 全新會員 → 建立 member + account + preferences", async () => {
    const noAccountBuilder = makeQueryBuilder(null, null);
    const noMemberBuilder = makeQueryBuilder(null, null);
    const insertMemberBuilder = makeQueryBuilder(MEMBER, null);
    const upsertAccountBuilder = makeQueryBuilder(null, null);
    const insertPrefBuilder = makeQueryBuilder(null, null);

    let callCount = 0;
    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "member_accounts" && callCount === 0) {
        callCount++;
        return noAccountBuilder;
      }
      if (table === "members" && callCount === 1) {
        callCount++;
        return noMemberBuilder; // no email match
      }
      if (table === "members" && callCount === 2) {
        callCount++;
        return insertMemberBuilder; // insert new member
      }
      if (table === "member_accounts" && callCount === 3) {
        callCount++;
        return upsertAccountBuilder;
      }
      if (table === "member_preferences") {
        callCount++;
        return insertPrefBuilder;
      }
      return makeQueryBuilder(null, null);
    });

    const result = await findOrCreateMember(BASE_PARAMS);
    expect(result.id).toBe(MEMBER.id);
    expect(mockFrom).toHaveBeenCalledWith("member_preferences");
  });

  it("MEM-004: 建立 member DB 失敗 → 拋出 Error", async () => {
    const noAccountBuilder = makeQueryBuilder(null, null);
    const noMemberBuilder = makeQueryBuilder(null, null);
    const failInsertBuilder = makeQueryBuilder(null, { message: "DB constraint" });

    let callCount = 0;
    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "member_accounts" && callCount === 0) {
        callCount++;
        return noAccountBuilder;
      }
      if (table === "members" && callCount === 1) {
        callCount++;
        return noMemberBuilder;
      }
      if (table === "members" && callCount === 2) {
        callCount++;
        return failInsertBuilder;
      }
      return makeQueryBuilder(null, null);
    });

    await expect(findOrCreateMember(BASE_PARAMS)).rejects.toThrow("Failed to create member");
  });
});

// ── getMemberPreferences ──────────────────────────────────────────────────

describe("getMemberPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MEM-005: 返回指定 member 的偏好", async () => {
    const prefs = {
      member_id: "mem-001",
      favorite_teams: [],
      favorite_leagues: [],
      notification_line: false,
      notification_telegram: false,
    };
    mockFrom = vi.fn().mockReturnValue(makeQueryBuilder(prefs, null));

    const result = await getMemberPreferences("mem-001");
    expect(result).toEqual(prefs);
    expect(mockFrom).toHaveBeenCalledWith("member_preferences");
  });
});

// ── updateMemberPreferences ───────────────────────────────────────────────

describe("updateMemberPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MEM-006: upsert 偏好並返回更新結果", async () => {
    const updated = {
      member_id: "mem-001",
      favorite_teams: [{ sport: "nba", teamId: "LAL", name: "Lakers" }],
      favorite_leagues: [],
      notification_line: false,
      notification_telegram: false,
    };
    mockFrom = vi.fn().mockReturnValue(makeQueryBuilder(updated, null));

    const result = await updateMemberPreferences("mem-001", {
      favorite_teams: [{ sport: "nba", teamId: "LAL", name: "Lakers" }],
    });
    expect(result).toEqual(updated);
    expect(mockFrom).toHaveBeenCalledWith("member_preferences");
  });
});

// ── getMemberById ─────────────────────────────────────────────────────────

describe("getMemberById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MEM-007: 返回 member + accounts 陣列", async () => {
    const accounts = [{ id: "acc-1", member_id: "mem-001", provider: "google" }];
    let callCount = 0;
    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "members") {
        callCount++;
        return makeQueryBuilder(MEMBER, null);
      }
      if (table === "member_accounts") {
        callCount++;
        return makeQueryBuilder(accounts, null);
      }
      return makeQueryBuilder(null, null);
    });

    const result = await getMemberById("mem-001");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("mem-001");
    expect(result!.accounts).toEqual(accounts);
  });

  it("member 不存在時返回 null", async () => {
    mockFrom = vi.fn().mockReturnValue(makeQueryBuilder(null, null));
    const result = await getMemberById("nonexistent");
    expect(result).toBeNull();
  });
});
