import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next-auth/react
const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// Mock LoginModal to avoid rendering complexity
vi.mock("@/components/auth/LoginModal", () => ({
  LoginModal: () => null,
}));

import { MemberGate } from "@/components/auth/MemberGate";

describe("MemberGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("session loading 時不渲染任何內容", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });

    const { container } = render(
      <MemberGate fallback={<div>預覽</div>}>
        <div>完整內容</div>
      </MemberGate>
    );

    expect(container.innerHTML).toBe("");
  });

  it("未登入時顯示登入引導，不顯示完整內容", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });

    render(
      <MemberGate message="請登入" fallback={<div>預覽</div>}>
        <div>完整內容</div>
      </MemberGate>
    );

    expect(screen.getByText("請登入")).toBeDefined();
    expect(screen.getByText("預覽")).toBeDefined();
    expect(screen.queryByText("完整內容")).toBeNull();
  });

  it("已登入 member 顯示完整內容", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Test", role: "member", memberId: "123" } },
      status: "authenticated",
    });

    render(
      <MemberGate fallback={<div>預覽</div>}>
        <div>完整內容</div>
      </MemberGate>
    );

    expect(screen.getByText("完整內容")).toBeDefined();
    expect(screen.queryByText("預覽")).toBeNull();
  });

  it("已登入 admin 也顯示完整內容", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Admin", role: "admin" } },
      status: "authenticated",
    });

    render(
      <MemberGate fallback={<div>預覽</div>}>
        <div>完整內容</div>
      </MemberGate>
    );

    expect(screen.getByText("完整內容")).toBeDefined();
    expect(screen.queryByText("預覽")).toBeNull();
  });
});
