/**
 * 整合測試：LoginModal 元件
 * 覆蓋渲染 providers、Google/LINE 按鈕觸發 signIn、隱私權政策連結
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mock next-auth/react ──────────────────────────────────────────────────

const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

import { LoginModal } from "@/components/auth/LoginModal";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("LoginModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("LM-001: open=true → 渲染 Google 和 LINE 登入按鈕", () => {
    render(<LoginModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("使用 Google 帳號登入")).toBeDefined();
    expect(screen.getByText("使用 LINE 帳號登入")).toBeDefined();
  });

  it("LM-002: 點擊 Google 按鈕 → signIn('google') 被呼叫", () => {
    render(<LoginModal open={true} onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByText("使用 Google 帳號登入"));
    expect(mockSignIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
  });

  it("LM-003: 點擊 LINE 按鈕 → signIn('line') 被呼叫", () => {
    render(<LoginModal open={true} onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByText("使用 LINE 帳號登入"));
    expect(mockSignIn).toHaveBeenCalledWith("line", { callbackUrl: "/" });
  });

  it("LM-004: 顯示隱私權政策連結（href=/privacy）", () => {
    render(<LoginModal open={true} onOpenChange={vi.fn()} />);
    const link = screen.getByRole("link", { name: "隱私權政策" });
    expect(link.getAttribute("href")).toBe("/privacy");
  });

  it("顯示「登入 / 註冊」標題", () => {
    render(<LoginModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("登入 / 註冊")).toBeDefined();
  });

  it("open=false → 不渲染 Google 按鈕", () => {
    render(<LoginModal open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText("使用 Google 帳號登入")).toBeNull();
  });

  it("顯示會員功能列表", () => {
    render(<LoginModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("完整賠率分析")).toBeDefined();
    expect(screen.getByText(/Play-by-Play/)).toBeDefined();
  });
});
