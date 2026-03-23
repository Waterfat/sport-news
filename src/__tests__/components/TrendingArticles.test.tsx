import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TrendingArticles } from "@/components/public/TrendingArticles";
import React from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("TrendingArticles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("顯示 loading 骨架（fetch 進行中）", () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { container } = render(<TrendingArticles />, { wrapper });

    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("fetch 完成後顯示文章列表", async () => {
    const articles = [
      { id: "1", title: "熱門文章第一名", slug: "top-1", category: "NBA", view_count: 1000, published_at: "2026-03-21T00:00:00Z" },
      { id: "2", title: "熱門文章第二名", slug: "top-2", category: "NBA", view_count: 800, published_at: "2026-03-20T00:00:00Z" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles }),
    });

    render(<TrendingArticles />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("熱門文章第一名")).toBeInTheDocument();
      expect(screen.getByText("熱門文章第二名")).toBeInTheDocument();
    });
  });

  it("顯示排名序號", async () => {
    const articles = [
      { id: "1", title: "第一名", slug: "top-1", category: "NBA", view_count: 1000, published_at: "2026-03-21T00:00:00Z" },
      { id: "2", title: "第二名", slug: "top-2", category: "NBA", view_count: 800, published_at: "2026-03-20T00:00:00Z" },
      { id: "3", title: "第三名", slug: "top-3", category: "NBA", view_count: 600, published_at: "2026-03-19T00:00:00Z" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles }),
    });

    render(<TrendingArticles />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("前三名使用金銀銅顏色（amber-500、slate-400、amber-700）", async () => {
    const articles = [
      { id: "1", title: "金牌", slug: "gold", category: "NBA", view_count: 1000, published_at: "2026-03-21T00:00:00Z" },
      { id: "2", title: "銀牌", slug: "silver", category: "NBA", view_count: 800, published_at: "2026-03-20T00:00:00Z" },
      { id: "3", title: "銅牌", slug: "bronze", category: "NBA", view_count: 600, published_at: "2026-03-19T00:00:00Z" },
      { id: "4", title: "第四名", slug: "fourth", category: "NBA", view_count: 400, published_at: "2026-03-18T00:00:00Z" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles }),
    });

    const { container } = render(<TrendingArticles />, { wrapper });

    await waitFor(() => screen.getByText("金牌"));

    const rankEls = container.querySelectorAll("[class*='font-black']");
    expect(rankEls[0].className).toContain("text-amber-500");  // 1st: gold
    expect(rankEls[1].className).toContain("text-slate-400");  // 2nd: silver
    expect(rankEls[2].className).toContain("text-amber-700");  // 3rd: bronze
  });

  it("無資料時顯示「暫無資料」", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [] }),
    });

    render(<TrendingArticles />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("暫無資料")).toBeInTheDocument();
    });
  });

  it("文章連結使用 slug", async () => {
    const articles = [
      { id: "1", title: "有 slug 的文章", slug: "nba-slug", category: "NBA", view_count: 100, published_at: "2026-03-21T00:00:00Z" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles }),
    });

    render(<TrendingArticles />, { wrapper });

    await waitFor(() => screen.getByText("有 slug 的文章"));
    const link = screen.getByText("有 slug 的文章").closest("a");
    expect(link?.getAttribute("href")).toBe("/news/nba-slug");
  });

  it("文章無 slug 時連結 fallback 使用 id", async () => {
    const articles = [
      { id: "art-999", title: "無 slug 文章", slug: null, category: "NBA", view_count: 50, published_at: "2026-03-21T00:00:00Z" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles }),
    });

    render(<TrendingArticles />, { wrapper });

    await waitFor(() => screen.getByText("無 slug 文章"));
    const link = screen.getByText("無 slug 文章").closest("a");
    expect(link?.getAttribute("href")).toBe("/news/art-999");
  });

  it("顯示「熱門文章」標題", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ articles: [] }),
    });

    render(<TrendingArticles />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("熱門文章")).toBeInTheDocument();
    });
  });
});
