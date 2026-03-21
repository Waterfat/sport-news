import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickNews } from "@/components/public/QuickNews";

const mockArticles = [
  {
    id: "1",
    title: "NBA 季後賽最新戰況更新",
    slug: "nba-playoff-update",
    published_at: "2026-03-21T10:00:00Z",
  },
  {
    id: "2",
    title: "湖人隊今日交易消息",
    slug: "lakers-trade-news",
    published_at: "2026-03-21T09:30:00Z",
  },
  {
    id: "3",
    title: "MLB 春訓最新動態報導",
    slug: null,
    published_at: "2026-03-21T09:00:00Z",
  },
];

describe("QuickNews", () => {
  it("renders section title with Zap icon", () => {
    render(<QuickNews articles={mockArticles} />);
    expect(screen.getByText("快訊")).toBeInTheDocument();
  });

  it("renders all article titles", () => {
    render(<QuickNews articles={mockArticles} />);
    expect(screen.getByText("NBA 季後賽最新戰況更新")).toBeInTheDocument();
    expect(screen.getByText("湖人隊今日交易消息")).toBeInTheDocument();
    expect(screen.getByText("MLB 春訓最新動態報導")).toBeInTheDocument();
  });

  it("renders nothing when articles array is empty", () => {
    const { container } = render(<QuickNews articles={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses newsUrl route helper with slug for links", () => {
    render(<QuickNews articles={mockArticles} />);
    const link = screen.getByText("NBA 季後賽最新戰況更新").closest("a");
    expect(link).toHaveAttribute("href", "/news/nba-playoff-update");
  });

  it("falls back to id when slug is null", () => {
    render(<QuickNews articles={mockArticles} />);
    const link = screen.getByText("MLB 春訓最新動態報導").closest("a");
    expect(link).toHaveAttribute("href", "/news/3");
  });

  it("renders correct number of article cards", () => {
    render(<QuickNews articles={mockArticles} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
  });

  it("displays relative time for each article", () => {
    // Use a very recent date to test "剛剛"
    const recentArticles = [
      {
        id: "10",
        title: "剛發布的新聞",
        slug: "just-now",
        published_at: new Date().toISOString(),
      },
    ];
    render(<QuickNews articles={recentArticles} />);
    expect(screen.getByText("剛剛")).toBeInTheDocument();
  });

  it("renders as a card grid with article elements", () => {
    render(<QuickNews articles={mockArticles} />);
    const articles = document.querySelectorAll("article");
    expect(articles).toHaveLength(3);
  });
});
