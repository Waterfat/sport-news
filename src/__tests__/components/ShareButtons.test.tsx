import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ShareButtons } from "@/components/public/ShareButtons";

const mockUrl = "https://howger-sport.com/news/nba-report";
const mockTitle = "NBA 季後賽最新戰報";

describe("ShareButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("渲染四個分享按鈕（複製連結、LINE、Telegram、X）", () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    expect(screen.getByText("複製連結")).toBeInTheDocument();
    expect(screen.getByText("LINE")).toBeInTheDocument();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("X")).toBeInTheDocument();
  });

  it("LINE 連結包含 encoded URL", () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    const lineLink = screen.getByText("LINE").closest("a");
    expect(lineLink?.getAttribute("href")).toContain("social-plugins.line.me");
    expect(lineLink?.getAttribute("href")).toContain(encodeURIComponent(mockUrl));
  });

  it("Telegram 連結包含 encoded URL 與 title", () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    const tgLink = screen.getByText("Telegram").closest("a");
    expect(tgLink?.getAttribute("href")).toContain("t.me/share/url");
    expect(tgLink?.getAttribute("href")).toContain(encodeURIComponent(mockUrl));
    expect(tgLink?.getAttribute("href")).toContain(encodeURIComponent(mockTitle));
  });

  it("X 連結包含 encoded URL 與 title", () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    const xLink = screen.getByText("X").closest("a");
    expect(xLink?.getAttribute("href")).toContain("twitter.com/intent/tweet");
    expect(xLink?.getAttribute("href")).toContain(encodeURIComponent(mockUrl));
    expect(xLink?.getAttribute("href")).toContain(encodeURIComponent(mockTitle));
  });

  it("LINE/Telegram/X 連結在新視窗開啟（target=_blank）", () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    const externalLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("target") === "_blank");
    expect(externalLinks).toHaveLength(3);
  });

  it("複製連結按鈕點擊後顯示「已複製」", async () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    const copyBtn = screen.getByText("複製連結");

    await act(async () => {
      fireEvent.click(copyBtn);
      // Let clipboard promise resolve
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText("已複製")).toBeInTheDocument();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockUrl);
  });

  it("複製後 2 秒恢復「複製連結」文字", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    const copyBtn = screen.getByText("複製連結");

    await act(async () => {
      fireEvent.click(copyBtn);
      await Promise.resolve();
    });

    await waitFor(() => screen.getByText("已複製"));

    act(() => vi.advanceTimersByTime(2001));

    await waitFor(() => {
      expect(screen.getByText("複製連結")).toBeInTheDocument();
    });
  });

  it("複製按鈕為 button 元素（非 a 連結）", () => {
    render(<ShareButtons url={mockUrl} title={mockTitle} />);
    const copyBtn = screen.getByText("複製連結").closest("button");
    expect(copyBtn).not.toBeNull();
  });
});
