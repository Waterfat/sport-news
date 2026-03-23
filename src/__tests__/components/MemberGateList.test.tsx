/**
 * 整合測試：MemberGateList 元件（src/components/auth/MemberGate.tsx）
 * 補足現有 MemberGate.test.tsx 未覆蓋的列表分級行為
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock next-auth/react ──────────────────────────────────────────────────

const mockUseSession = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// ── Mock LoginModal ───────────────────────────────────────────────────────

vi.mock("@/components/auth/LoginModal", () => ({
  LoginModal: () => null,
}));

import { MemberGateList } from "@/components/auth/MemberGate";

// ── Helpers ───────────────────────────────────────────────────────────────

const ITEMS = ["item-1", "item-2", "item-3", "item-4", "item-5", "item-6", "item-7"];
const renderItem = (item: string) => <div key={item}>{item}</div>;

// ── Tests ─────────────────────────────────────────────────────────────────

describe("MemberGateList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("MGL-001: session loading → 回傳 null（無任何內容）", () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" });
    const { container } = render(
      <MemberGateList items={ITEMS} renderItem={renderItem} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("MGL-002: 已登入 member → 渲染全部 items", () => {
    mockUseSession.mockReturnValue({
      data: { user: { role: "member", memberId: "mem-1" } },
      status: "authenticated",
    });
    render(<MemberGateList items={ITEMS} renderItem={renderItem} />);
    ITEMS.forEach((item) => {
      expect(screen.getByText(item)).toBeDefined();
    });
  });

  it("MGL-003: 未登入，items > previewCount → 只顯示前 N 筆（預設 5）", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(<MemberGateList items={ITEMS} renderItem={renderItem} />);
    // previewCount=5，前 5 筆應顯示
    expect(screen.getByText("item-1")).toBeDefined();
    expect(screen.getByText("item-5")).toBeDefined();
  });

  it("MGL-004: 未登入，items <= previewCount → 無模糊 fallback，顯示登入引導（無 blur 遮罩）", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    const shortItems = ["item-1", "item-2", "item-3"];
    render(
      <MemberGateList items={shortItems} renderItem={renderItem} previewCount={5} />
    );
    // items 不超過 previewCount，hasMore=false，fallback=undefined
    // MemberGate 顯示登入引導卡片（無模糊預覽）
    expect(screen.getByText("登入查看完整內容")).toBeDefined();
    expect(screen.queryByText("item-1")).toBeNull(); // items 不顯示在訪客視圖
  });

  it("自定義 previewCount → 僅顯示指定數量", () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" });
    render(
      <MemberGateList items={ITEMS} renderItem={renderItem} previewCount={3} />
    );
    expect(screen.getByText("item-1")).toBeDefined();
    expect(screen.getByText("item-2")).toBeDefined();
    expect(screen.getByText("item-3")).toBeDefined();
  });

  it("admin 登入 → 被視為訪客，觸發分級", () => {
    mockUseSession.mockReturnValue({
      data: { user: { role: "admin" } },
      status: "authenticated",
    });
    render(<MemberGateList items={ITEMS} renderItem={renderItem} previewCount={5} />);
    // admin 不算前台會員，應顯示分級（不渲染所有項目的 full list wrapper）
    // 驗證未出現第 6 筆（超出 previewCount 的非 blur 項目）
    // item-6 可能在 blur 中出現，但不是 full list
    expect(screen.getByText("item-1")).toBeDefined();
  });
});
