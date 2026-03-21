import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  ArticleCardSkeleton,
  ArticleCardSkeletonGrid,
  QuickNewsSkeleton,
} from "@/components/public/ArticleCardSkeleton";

describe("ArticleCardSkeleton", () => {
  it("renders skeleton structure with card container", () => {
    const { container } = render(<ArticleCardSkeleton />);
    expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
  });

  it("renders image skeleton placeholder", () => {
    const { container } = render(<ArticleCardSkeleton />);
    // Image skeleton: full width, fixed height
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders multiple skeleton lines for title and meta", () => {
    const { container } = render(<ArticleCardSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // At least: image + category + title + title-line2 + 2 meta = 6
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});

describe("ArticleCardSkeletonGrid", () => {
  it("renders specified number of skeletons", () => {
    const { container } = render(<ArticleCardSkeletonGrid count={3} />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards.length).toBe(3);
  });

  it("defaults to 6 skeletons", () => {
    const { container } = render(<ArticleCardSkeletonGrid />);
    const cards = container.querySelectorAll(".rounded-lg.border");
    expect(cards.length).toBe(6);
  });

  it("renders grid layout with responsive columns", () => {
    const { container } = render(<ArticleCardSkeletonGrid />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
  });
});

describe("QuickNewsSkeleton", () => {
  it("renders specified number of rows", () => {
    const { container } = render(<QuickNewsSkeleton count={3} />);
    const rows = container.querySelectorAll(".flex.items-center");
    expect(rows.length).toBe(3);
  });

  it("defaults to 5 rows", () => {
    const { container } = render(<QuickNewsSkeleton />);
    const rows = container.querySelectorAll(".flex.items-center");
    expect(rows.length).toBe(5);
  });

  it("renders container with card styling", () => {
    const { container } = render(<QuickNewsSkeleton />);
    expect(container.querySelector(".rounded-lg.border")).toBeInTheDocument();
  });
});
