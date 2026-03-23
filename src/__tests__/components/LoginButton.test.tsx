/**
 * 整合測試：LoginButton 元件
 * 覆蓋點擊開啟 Modal、自定義 children
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mock next-auth/react（LoginModal 內部使用）────────────────────────────

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

import { LoginButton } from "@/components/auth/LoginButton";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("LoginButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("LB-001: 點擊按鈕 → LoginModal 開啟（顯示 Google 按鈕）", () => {
    render(<LoginButton />);
    const btn = screen.getByRole("button", { name: "登入" });
    fireEvent.click(btn);
    // LoginModal 開啟後應渲染 Google 登入按鈕
    expect(screen.getByText("使用 Google 帳號登入")).toBeDefined();
  });

  it("LB-002: 自定義 children → 按鈕顯示自定義文字", () => {
    render(<LoginButton>立即加入</LoginButton>);
    expect(screen.getByRole("button", { name: "立即加入" })).toBeDefined();
  });

  it("預設文字為「登入」", () => {
    render(<LoginButton />);
    expect(screen.getByRole("button", { name: "登入" })).toBeDefined();
  });

  it("Modal 初始為關閉狀態（不顯示 Google 按鈕）", () => {
    render(<LoginButton />);
    expect(screen.queryByText("使用 Google 帳號登入")).toBeNull();
  });
});
