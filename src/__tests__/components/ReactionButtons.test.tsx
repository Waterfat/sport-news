import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReactionButtons } from "@/components/public/ReactionButtons";

// Mock localStorage since jsdom may not provide full Storage API
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe("ReactionButtons", () => {
  it("渲染四個反應按鈕", () => {
    render(<ReactionButtons articleId="article-1" />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
  });

  it("每個按鈕有對應的 title 屬性（愛心、精彩、驚訝、傷心）", () => {
    render(<ReactionButtons articleId="article-1" />);
    expect(screen.getByTitle("愛心")).toBeInTheDocument();
    expect(screen.getByTitle("精彩")).toBeInTheDocument();
    expect(screen.getByTitle("驚訝")).toBeInTheDocument();
    expect(screen.getByTitle("傷心")).toBeInTheDocument();
  });

  it("初始狀態無已選中的反應（無 blue border）", () => {
    render(<ReactionButtons articleId="article-fresh" />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn.className).not.toContain("border-blue-300");
    });
  });

  it("點擊反應後按鈕變為選中狀態", () => {
    render(<ReactionButtons articleId="article-2" />);
    const loveBtn = screen.getByTitle("愛心");

    fireEvent.click(loveBtn);

    expect(loveBtn.className).toContain("border-blue-300");
  });

  it("再次點擊已選中的反應取消選中", () => {
    render(<ReactionButtons articleId="article-3" />);
    const loveBtn = screen.getByTitle("愛心");

    fireEvent.click(loveBtn);
    expect(loveBtn.className).toContain("border-blue-300");

    fireEvent.click(loveBtn);
    expect(loveBtn.className).not.toContain("border-blue-300");
  });

  it("點擊後計數增加顯示", () => {
    render(<ReactionButtons articleId="article-4" />);
    const loveBtn = screen.getByTitle("愛心");

    fireEvent.click(loveBtn);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("取消反應後計數減少回 0（數字消失）", () => {
    render(<ReactionButtons articleId="article-5" />);
    const loveBtn = screen.getByTitle("愛心");

    fireEvent.click(loveBtn);
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(loveBtn);
    expect(screen.queryByText("1")).toBeNull();
  });

  it("多個反應可同時選中", () => {
    render(<ReactionButtons articleId="article-6" />);
    const loveBtn = screen.getByTitle("愛心");
    const fireBtn = screen.getByTitle("精彩");

    fireEvent.click(loveBtn);
    fireEvent.click(fireBtn);

    expect(loveBtn.className).toContain("border-blue-300");
    expect(fireBtn.className).toContain("border-blue-300");
  });

  it("選中狀態儲存到 localStorage", () => {
    render(<ReactionButtons articleId="article-7" />);
    const loveBtn = screen.getByTitle("愛心");

    fireEvent.click(loveBtn);

    const stored = localStorageMock.getItem("reactions_article-7");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toContain("love");
  });

  it("從 localStorage 恢復之前的選中狀態", async () => {
    localStorageMock.setItem("reactions_article-8", JSON.stringify(["love", "fire"]));

    render(<ReactionButtons articleId="article-8" />);

    // useEffect reads localStorage after mount
    await act(async () => {});

    const loveBtn = screen.getByTitle("愛心");
    const fireBtn = screen.getByTitle("精彩");

    expect(loveBtn.className).toContain("border-blue-300");
    expect(fireBtn.className).toContain("border-blue-300");
  });

  it("計數為 0 時不顯示數字", () => {
    render(<ReactionButtons articleId="article-9" />);
    const countEls = screen.queryAllByText(/^[1-9]/);
    expect(countEls).toHaveLength(0);
  });

  it("不同 articleId 使用不同的 localStorage 鍵", () => {
    const { unmount } = render(<ReactionButtons articleId="art-A" />);
    fireEvent.click(screen.getByTitle("愛心"));
    unmount();

    render(<ReactionButtons articleId="art-B" />);
    const stored = localStorageMock.getItem("reactions_art-B");
    expect(stored).toBeNull();
  });
});
