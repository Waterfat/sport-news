import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeArticleSection } from "@/components/public/HomeArticleSection";

// Mock nuqs so URL state doesn't require a real URL context
vi.mock("nuqs", () => ({
  useQueryState: vi.fn().mockImplementation((_key: string, _parser: unknown) => {
    const { useState } = require("react");
    return useState("all");
  }),
  parseAsString: {
    withDefault: (_default: string) => ({ withDefault: _default }),
  },
}));

// Mock PersonalizedArticleGrid to simplify testing
vi.mock("@/components/public/PersonalizedArticleGrid", () => ({
  PersonalizedArticleGrid: ({ articles }: { articles: { title: string }[] }) => (
    <div data-testid="article-grid">
      {articles.map((a) => (
        <div key={a.title}>{a.title}</div>
      ))}
    </div>
  ),
}));

const articles = [
  { id: "1", title: "NBA 最新戰報", content: null, category: "NBA", published_at: "2026-03-21T10:00:00Z", view_count: 100, slug: "nba-1", images: null, writerName: "王大明" },
  { id: "2", title: "NBA 球員動態", content: null, category: "NBA", published_at: "2026-03-21T09:00:00Z", view_count: 80, slug: "nba-2", images: null, writerName: null },
  { id: "3", title: "MLB 開幕戰", content: null, category: "棒球", published_at: "2026-03-20T10:00:00Z", view_count: 60, slug: "mlb-1", images: null, writerName: "李小花" },
  { id: "4", title: "MLB 投手分析", content: null, category: "棒球", published_at: "2026-03-20T09:00:00Z", view_count: 50, slug: "mlb-2", images: null, writerName: null },
  { id: "5", title: "足球週報", content: null, category: "足球", published_at: "2026-03-19T10:00:00Z", view_count: 40, slug: "soccer-1", images: null, writerName: null },
];

describe("HomeArticleSection", () => {
  it("顯示「最新報導」標題", () => {
    render(<HomeArticleSection articles={articles} />);
    expect(screen.getByText("最新報導")).toBeInTheDocument();
  });

  it("預設顯示所有文章（activeCategory=all）", () => {
    render(<HomeArticleSection articles={articles} />);
    // All 5 articles should be passed to grid
    expect(screen.getByText("NBA 最新戰報")).toBeInTheDocument();
    expect(screen.getByText("MLB 開幕戰")).toBeInTheDocument();
    expect(screen.getByText("足球週報")).toBeInTheDocument();
  });

  it("顯示分類篩選 Tab（全部/NBA/MLB/足球/綜合）", () => {
    render(<HomeArticleSection articles={articles} />);
    expect(screen.getByText("全部")).toBeInTheDocument();
    expect(screen.getByText("NBA")).toBeInTheDocument();
    expect(screen.getByText("MLB")).toBeInTheDocument();
    expect(screen.getByText("足球")).toBeInTheDocument();
    expect(screen.getByText("綜合")).toBeInTheDocument();
  });

  it("無文章時顯示「此分類目前沒有文章」", () => {
    render(<HomeArticleSection articles={[]} />);
    expect(screen.getByText("此分類目前沒有文章")).toBeInTheDocument();
  });

  it("article grid 渲染文章標題", () => {
    render(<HomeArticleSection articles={articles} />);
    const grid = screen.getByTestId("article-grid");
    expect(grid).toBeInTheDocument();
  });
});
