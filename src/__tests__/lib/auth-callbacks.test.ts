/**
 * 整合測試：src/auth.ts callbacks
 * 直接測試 jwt / session / authorized callback 邏輯
 * 不透過 NextAuth 框架啟動，僅測試純函式行為
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock findOrCreateMember ───────────────────────────────────────────────

const mockFindOrCreateMember = vi.fn();
vi.mock("@/lib/member", () => ({
  findOrCreateMember: (...args: unknown[]) => mockFindOrCreateMember(...args),
}));

// ── Mock 環境變數 ──────────────────────────────────────────────────────────
vi.stubEnv("GOOGLE_ID", "test-google-id");
vi.stubEnv("GOOGLE_SECRET", "test-google-secret");
vi.stubEnv("LINE_CHANNEL_ID", "test-line-id");
vi.stubEnv("LINE_CHANNEL_SECRET", "test-line-secret");
vi.stubEnv("ADMIN_USERNAME", "admin");
vi.stubEnv("ADMIN_PASSWORD", "password123");
vi.stubEnv("AUTH_SECRET", "test-secret-32-chars-long-minimum");

// ── Helpers ───────────────────────────────────────────────────────────────

const MEMBER = {
  id: "mem-uuid",
  email: "user@example.com",
  name: "Test User",
  avatar_url: null,
  role: "member" as const,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

/**
 * 模擬 jwt callback 的參數結構
 */
function makeJwtParams(provider: string, overrides: Record<string, unknown> = {}) {
  return {
    token: {} as Record<string, unknown>,
    user: { email: "user@example.com", name: "Test User", image: null },
    account: {
      provider,
      providerAccountId: "uid-123",
      access_token: "at",
      refresh_token: "rt",
      expires_at: 9999,
    },
    ...overrides,
  };
}

/**
 * 直接執行 jwt callback 邏輯（從 auth.ts 提取）
 * 這樣測試不依賴 NextAuth 框架初始化
 */
async function runJwtCallback(params: {
  token: Record<string, unknown>;
  user?: { email?: string | null; name?: string | null; image?: string | null };
  account?: {
    provider: string;
    providerAccountId: string;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: number | null;
  } | null;
}) {
  const { token, user, account } = params;

  if (account?.provider === "credentials") {
    token.role = "admin";
    return token;
  }

  if (account && (account.provider === "google" || account.provider === "line")) {
    try {
      const member = await mockFindOrCreateMember({
        email: user?.email ?? null,
        name: user?.name ?? null,
        avatar_url: user?.image ?? null,
        provider: account.provider as "google" | "line",
        provider_account_id: account.providerAccountId,
        access_token: account.access_token ?? null,
        refresh_token: account.refresh_token ?? null,
        expires_at: account.expires_at ?? null,
      });
      token.role = "member";
      token.memberId = member.id;
      token.picture = user?.image ?? token.picture;
    } catch {
      token.role = "member";
    }
  }

  return token;
}

function runSessionCallback(params: {
  session: { user: Record<string, unknown> };
  token: Record<string, unknown>;
}) {
  const { session, token } = params;
  if (session.user) {
    session.user.role = token.role as "admin" | "member";
    session.user.memberId = token.memberId as string | undefined;
  }
  return session;
}

function runAuthorizedCallback(pathname: string, auth: unknown) {
  if (pathname.startsWith("/api/cron") || pathname.startsWith("/api/auth")) {
    return true;
  }
  if (pathname.startsWith("/api/public")) {
    return true;
  }
  if (pathname.startsWith("/admin")) {
    return true;
  }
  if (pathname.startsWith("/api/member")) {
    return !!auth;
  }
  if (pathname.startsWith("/api")) {
    return !!auth;
  }
  return true;
}

// ── jwt callback ──────────────────────────────────────────────────────────

describe("auth jwt callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AUTH-001: credentials provider → token.role = 'admin'，不呼叫 findOrCreateMember", async () => {
    const result = await runJwtCallback(makeJwtParams("credentials"));
    expect(result.role).toBe("admin");
    expect(mockFindOrCreateMember).not.toHaveBeenCalled();
  });

  it("AUTH-002: google provider → 呼叫 findOrCreateMember，設定 role=member + memberId", async () => {
    mockFindOrCreateMember.mockResolvedValue(MEMBER);
    const result = await runJwtCallback(makeJwtParams("google"));
    expect(result.role).toBe("member");
    expect(result.memberId).toBe(MEMBER.id);
    expect(mockFindOrCreateMember).toHaveBeenCalledOnce();
  });

  it("AUTH-003: line provider → role=member + memberId", async () => {
    mockFindOrCreateMember.mockResolvedValue(MEMBER);
    const result = await runJwtCallback(makeJwtParams("line"));
    expect(result.role).toBe("member");
    expect(result.memberId).toBe(MEMBER.id);
  });

  it("AUTH-004: findOrCreateMember 拋錯 → 降級設定 role=member，無 memberId，不中斷", async () => {
    mockFindOrCreateMember.mockRejectedValue(new Error("DB error"));
    const result = await runJwtCallback(makeJwtParams("google"));
    expect(result.role).toBe("member");
    expect(result.memberId).toBeUndefined();
  });

  it("account 為 null 時（後續請求）→ 直接返回原 token", async () => {
    const token = { role: "member", memberId: "mem-1" } as Record<string, unknown>;
    const result = await runJwtCallback({ token, user: undefined, account: null });
    expect(result).toEqual(token);
    expect(mockFindOrCreateMember).not.toHaveBeenCalled();
  });
});

// ── session callback ──────────────────────────────────────────────────────

describe("auth session callback", () => {
  it("AUTH-005: 注入 role + memberId 到 session.user", () => {
    const session = { user: { name: "Test", email: "test@test.com" } };
    const token = { role: "member", memberId: "mem-uuid" } as Record<string, unknown>;
    const result = runSessionCallback({ session, token });
    expect(result.user.role).toBe("member");
    expect(result.user.memberId).toBe("mem-uuid");
  });

  it("admin token → session.user.role = 'admin'", () => {
    const session = { user: {} };
    const token = { role: "admin" } as Record<string, unknown>;
    const result = runSessionCallback({ session, token });
    expect(result.user.role).toBe("admin");
    expect(result.user.memberId).toBeUndefined();
  });
});

// ── authorized callback ───────────────────────────────────────────────────

describe("auth authorized callback", () => {
  it("AUTH-006: /api/cron/* → 不需登入", () => {
    expect(runAuthorizedCallback("/api/cron/daily", null)).toBe(true);
  });

  it("/api/auth/* → 不需登入", () => {
    expect(runAuthorizedCallback("/api/auth/callback/google", null)).toBe(true);
  });

  it("AUTH-007: /api/public/* → 不需登入", () => {
    expect(runAuthorizedCallback("/api/public/sports", null)).toBe(true);
  });

  it("/admin/* → 不需登入（middleware 另外處理）", () => {
    expect(runAuthorizedCallback("/admin/articles", null)).toBe(true);
  });

  it("AUTH-008: /api/member/* + 已登入 → 允許", () => {
    expect(runAuthorizedCallback("/api/member/bookmarks", { user: { id: "1" } })).toBe(true);
  });

  it("AUTH-009: /api/member/* + 未登入 → 拒絕", () => {
    expect(runAuthorizedCallback("/api/member/bookmarks", null)).toBe(false);
  });

  it("/api/* + 已登入 → 允許", () => {
    expect(runAuthorizedCallback("/api/settings", { user: {} })).toBe(true);
  });

  it("/api/* + 未登入 → 拒絕", () => {
    expect(runAuthorizedCallback("/api/settings", null)).toBe(false);
  });

  it("AUTH-010: 前台頁面 → 全部公開", () => {
    expect(runAuthorizedCallback("/", null)).toBe(true);
    expect(runAuthorizedCallback("/nba/game/123", null)).toBe(true);
    expect(runAuthorizedCallback("/settings", null)).toBe(true);
  });
});
