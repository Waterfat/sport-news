/**
 * 整合測試：UserMenu 元件
 * 覆蓋 loading 骨架、未登入、Admin、會員、登出
 *
 * 注意：Radix UI DropdownMenu 在 jsdom 環境 portal 不渲染到 document.body，
 * UM-006/UM-007 改為驗證 DOM 狀態與 click handler 觸發。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mock next-auth/react ──────────────────────────────────────────────────

const mockUseSession = vi.fn();
const mockSignOut = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  signIn: vi.fn(),
}));

// ── Mock next/link ────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Mock Radix UI DropdownMenuContent（讓 portal 內容在 jsdom 直接渲染）────

vi.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react");

  const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = React.useState(false);
    return React.createElement("div", {
      "data-testid": "dropdown-root",
      children: React.Children.map(children, (child: React.ReactElement) => {
        if (!child) return null;
        return React.cloneElement(child, { open, setOpen });
      }),
    });
  };

  const DropdownMenuTrigger = ({
    children,
    open,
    setOpen,
    asChild,
  }: {
    children: React.ReactNode;
    open?: boolean;
    setOpen?: (v: boolean) => void;
    asChild?: boolean;
  }) => {
    return React.createElement("div", {
      onClick: () => setOpen?.(!open),
      children,
    });
  };

  const DropdownMenuContent = ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
  }) => {
    if (!open) return null;
    return React.createElement("div", { "data-testid": "dropdown-content", children });
  };

  const DropdownMenuItem = ({
    children,
    onClick,
    asChild,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    className?: string;
  }) => {
    if (asChild) {
      return React.createElement("div", { children });
    }
    return React.createElement("button", { onClick, className, children });
  };

  const DropdownMenuSeparator = () => React.createElement("hr");

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
  };
});

import { UserMenu } from "@/components/auth/UserMenu";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("UserMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("UM-001: loading → 顯示 animate-pulse 骨架，無登入按鈕", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });
    const { container } = render(<UserMenu />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "登入" })).toBeNull();
  });

  it("UM-002: 未登入 → 顯示「登入」按鈕", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<UserMenu />);
    expect(screen.getByRole("button", { name: "登入" })).toBeDefined();
  });

  it("UM-003: 未登入點「登入」→ LoginModal 開啟（顯示 Google 按鈕）", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<UserMenu />);
    fireEvent.click(screen.getByRole("button", { name: "登入" }));
    expect(screen.getByText("使用 Google 帳號登入")).toBeDefined();
  });

  it("UM-004: Admin 登入 → 前台顯示「登入」按鈕（不是頭像）", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Admin", email: "admin@test.com", role: "admin" } },
      status: "authenticated",
    });
    render(<UserMenu />);
    expect(screen.getByRole("button", { name: "登入" })).toBeDefined();
    // Admin 不渲染頭像下拉
    expect(screen.queryByText("J")).toBeNull();
  });

  it("UM-005: 會員登入 → 顯示頭像（initials fallback 為姓名首字母）", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "John Doe", email: "john@test.com", role: "member", memberId: "m1" } },
      status: "authenticated",
    });
    render(<UserMenu />);
    expect(screen.getByText("J")).toBeDefined();
  });

  it("UM-006: 會員登入，展開選單 → 包含「我的關注」和「設定」連結（/settings）", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Jane", email: "jane@test.com", role: "member", memberId: "m2" } },
      status: "authenticated",
    });
    render(<UserMenu />);
    // 點擊觸發器展開 dropdown
    fireEvent.click(screen.getByText("J").closest("div")!);
    expect(screen.getByRole("link", { name: /我的關注/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /設定/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /我的關注/ }).getAttribute("href")).toBe("/settings");
  });

  it("UM-007: 點擊「登出」→ signOut({ callbackUrl: '/' }) 被呼叫", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Jane", email: "jane@test.com", role: "member", memberId: "m2" } },
      status: "authenticated",
    });
    render(<UserMenu />);
    fireEvent.click(screen.getByText("J").closest("div")!);
    fireEvent.click(screen.getByText("登出"));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
