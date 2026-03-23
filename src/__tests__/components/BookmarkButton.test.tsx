/**
 * 整合測試：BookmarkButton 元件
 * 覆蓋未登入引導、收藏狀態渲染、toggle 呼叫正確 HTTP method
 *
 * 按鈕的 accessible name 來自 title 屬性，但 JSDOM 預設不以 title 作為 name。
 * 改用 button 的 title 屬性查詢，或直接用文字內容查詢。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../test-utils";

// ── Mock next-auth/react ──────────────────────────────────────────────────

const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signIn: vi.fn(),
}));

// ── Mock fetch ────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { BookmarkButton } from "@/components/public/BookmarkButton";

// ── Helpers ───────────────────────────────────────────────────────────────

const ARTICLE_ID = "art-uuid-123";
const GUEST_SESSION = { data: null, status: "unauthenticated" } as const;
const MEMBER_SESSION = {
  data: { user: { name: "Test", role: "member", memberId: "mem-1" } },
  status: "authenticated",
} as const;

function setup(session = GUEST_SESSION as typeof GUEST_SESSION | typeof MEMBER_SESSION) {
  mockUseSession.mockReturnValue(session);
  return render(<BookmarkButton articleId={ARTICLE_ID} />, {
    wrapper: createQueryWrapper(),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("BookmarkButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bookmarked: false }),
    });
  });

  it("BKB-001: 未登入 → query 不執行（fetch 未呼叫）", async () => {
    setup(GUEST_SESSION);
    await waitFor(() => {
      // 等一個 tick 確認 query 沒有觸發
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("BKB-002: 未登入點收藏 → LoginModal 開啟（顯示 Google 按鈕）", async () => {
    setup(GUEST_SESSION);
    // 按鈕文字是「收藏」
    const btn = screen.getByTitle("收藏文章");
    fireEvent.click(btn);
    expect(screen.getByText("使用 Google 帳號登入")).toBeDefined();
  });

  it("BKB-003: 已登入，未收藏 → 顯示「收藏」文字 + title='收藏文章'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bookmarked: false }),
    });
    setup(MEMBER_SESSION);
    await waitFor(() => {
      expect(screen.getByTitle("收藏文章")).toBeDefined();
    });
    expect(screen.getByText("收藏")).toBeDefined();
  });

  it("BKB-004: 已登入，已收藏 → 顯示「已收藏」文字 + title='取消收藏'", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bookmarked: true }),
    });
    setup(MEMBER_SESSION);
    await waitFor(() => {
      expect(screen.getByTitle("取消收藏")).toBeDefined();
    });
    expect(screen.getByText("已收藏")).toBeDefined();
  });

  it("BKB-005: 未收藏時點擊 → 發送 POST 請求", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bookmarked: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bookmarked: true }),
      });

    setup(MEMBER_SESSION);

    await waitFor(() => {
      expect(screen.getByTitle("收藏文章")).toBeDefined();
    });

    fireEvent.click(screen.getByTitle("收藏文章"));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const postCall = calls.find((c) => c[1]?.method === "POST");
      expect(postCall).toBeDefined();
      expect(postCall![0]).toBe("/api/member/bookmarks");
    });
  });

  it("BKB-006: 已收藏時點擊 → 發送 DELETE 請求", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bookmarked: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bookmarked: false }),
      });

    setup(MEMBER_SESSION);

    await waitFor(() => {
      expect(screen.getByTitle("取消收藏")).toBeDefined();
    });

    fireEvent.click(screen.getByTitle("取消收藏"));

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const deleteCall = calls.find((c) => c[1]?.method === "DELETE");
      expect(deleteCall).toBeDefined();
    });
  });
});
