import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExtendedReading } from "@/components/public/ExtendedReading";

const mockArticles = {
  sameCategory: [
    {
      id: "1",
      title: "NBA 季後賽分析",
      slug: "nba-playoff",
      category: "NBA",
      published_at: "2026-03-20",
    },
    {
      id: "2",
      title: "湖人交易消息",
      slug: "lakers-trade",
      category: "NBA",
      published_at: "2026-03-19",
    },
  ],
  crossCategory: [
    {
      id: "3",
      title: "MLB 開幕戰預測",
      slug: "mlb-opening",
      category: "棒球",
      published_at: "2026-03-18",
    },
    {
      id: "4",
      title: "英超本週焦點",
      slug: "epl-focus",
      category: "足球",
      published_at: "2026-03-17",
    },
  ],
};

describe("ExtendedReading", () => {
  it("renders both same-category and cross-category articles", () => {
    render(
      <ExtendedReading
        sameCategory={mockArticles.sameCategory}
        crossCategory={mockArticles.crossCategory}
      />
    );
    expect(screen.getByText("延伸閱讀")).toBeInTheDocument();
    expect(screen.getByText("NBA 季後賽分析")).toBeInTheDocument();
    expect(screen.getByText("MLB 開幕戰預測")).toBeInTheDocument();
  });

  it("renders nothing when both arrays are empty", () => {
    const { container } = render(
      <ExtendedReading sameCategory={[]} crossCategory={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses newsUrl route helper for links", () => {
    render(
      <ExtendedReading
        sameCategory={mockArticles.sameCategory}
        crossCategory={[]}
      />
    );
    const link = screen.getByText("NBA 季後賽分析").closest("a");
    expect(link).toHaveAttribute("href", "/news/nba-playoff");
  });

  it("falls back to id when slug is null", () => {
    render(
      <ExtendedReading
        sameCategory={[
          {
            id: "99",
            title: "No Slug",
            slug: null,
            category: "NBA",
            published_at: null,
          },
        ]}
        crossCategory={[]}
      />
    );
    const link = screen.getByText("No Slug").closest("a");
    expect(link).toHaveAttribute("href", "/news/99");
  });

  it("displays category badges", () => {
    render(
      <ExtendedReading
        sameCategory={mockArticles.sameCategory}
        crossCategory={mockArticles.crossCategory}
      />
    );
    expect(screen.getAllByText("NBA")).toHaveLength(2);
    expect(screen.getByText("棒球")).toBeInTheDocument();
    expect(screen.getByText("足球")).toBeInTheDocument();
  });

  it("renders only same-category when cross-category is empty", () => {
    render(
      <ExtendedReading
        sameCategory={mockArticles.sameCategory}
        crossCategory={[]}
      />
    );
    expect(screen.getByText("延伸閱讀")).toBeInTheDocument();
    expect(screen.getByText("NBA 季後賽分析")).toBeInTheDocument();
    expect(screen.getByText("湖人交易消息")).toBeInTheDocument();
  });

  it("renders only cross-category when same-category is empty", () => {
    render(
      <ExtendedReading
        sameCategory={[]}
        crossCategory={mockArticles.crossCategory}
      />
    );
    expect(screen.getByText("延伸閱讀")).toBeInTheDocument();
    expect(screen.getByText("MLB 開幕戰預測")).toBeInTheDocument();
  });
});
