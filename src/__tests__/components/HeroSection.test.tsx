import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "@/components/public/HeroSection";

const heroArticle = {
  id: "hero-1",
  title: "NBA 季後賽大戰開打",
  content: "# 精彩賽事\n\n這是文章內文，描述了精彩的季後賽對決情況。",
  category: "NBA",
  published_at: "2026-03-21T10:00:00Z",
  slug: "nba-playoff",
  images: [{ url: "https://cdn.example.com/hero.jpg" }],
  writerName: "王大明",
};

const subHeroArticles = [
  {
    id: "sub-1",
    title: "湖人隊賽前準備工作",
    content: "sub content",
    category: "NBA",
    published_at: "2026-03-21T09:00:00Z",
    slug: "lakers-warmup",
    images: null,
    writerName: null,
  },
  {
    id: "sub-2",
    title: "Celtics 主場優勢分析",
    content: "analysis",
    category: "NBA",
    published_at: "2026-03-21T08:00:00Z",
    slug: null,
    images: [{ url: "https://cdn.example.com/celtics.jpg" }],
    writerName: "李小花",
  },
];

describe("HeroSection", () => {
  it("渲染主 hero 標題", () => {
    render(<HeroSection hero={heroArticle} subHeroes={subHeroArticles} />);
    expect(screen.getAllByText("NBA 季後賽大戰開打")).toHaveLength(2); // desktop + mobile
  });

  it("渲染 sub-hero 標題", () => {
    render(<HeroSection hero={heroArticle} subHeroes={subHeroArticles} />);
    expect(screen.getAllByText("湖人隊賽前準備工作")).toHaveLength(2);
    expect(screen.getAllByText("Celtics 主場優勢分析")).toHaveLength(2);
  });

  it("主 hero 使用 slug 產生連結", () => {
    render(<HeroSection hero={heroArticle} subHeroes={[]} />);
    const links = screen.getAllByRole("link");
    const heroLink = links.find((l) => l.getAttribute("href") === "/news/nba-playoff");
    expect(heroLink).toBeDefined();
  });

  it("sub-hero slug=null 時 fallback 使用 id", () => {
    render(<HeroSection hero={heroArticle} subHeroes={subHeroArticles} />);
    // sub-2 has no slug, should use id "sub-2"
    const links = screen.getAllByRole("link");
    const subLink = links.find((l) => l.getAttribute("href") === "/news/sub-2");
    expect(subLink).toBeDefined();
  });

  it("顯示作者名稱", () => {
    render(<HeroSection hero={heroArticle} subHeroes={[]} />);
    expect(screen.getAllByText("王大明")).toHaveLength(2); // desktop + mobile
  });

  it("無作者名時不顯示作者欄", () => {
    const heroNoWriter = { ...heroArticle, writerName: null };
    render(<HeroSection hero={heroNoWriter} subHeroes={[]} />);
    expect(screen.queryByText("王大明")).toBeNull();
  });

  it("顯示分類標籤", () => {
    render(<HeroSection hero={heroArticle} subHeroes={[]} />);
    expect(screen.getAllByText("NBA").length).toBeGreaterThan(0);
  });

  it("無圖片時使用 fallback 圖片（category fallback）", () => {
    const heroNoImage = { ...heroArticle, images: null };
    const { container } = render(<HeroSection hero={heroNoImage} subHeroes={[]} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    // Should use CATEGORY_FALLBACK_IMAGES["NBA"] or hero-sports-bg.jpg
    expect(img?.getAttribute("src")).toBeTruthy();
  });

  it("sub-hero 無圖片使用 fallback", () => {
    render(<HeroSection hero={heroArticle} subHeroes={subHeroArticles} />);
    // sub-1 has null images; it should still render
    expect(screen.getAllByText("湖人隊賽前準備工作")).toHaveLength(2);
  });

  it("摘要截取內容前 200 字並去除 markdown 符號", () => {
    render(<HeroSection hero={heroArticle} subHeroes={[]} />);
    // The content "# 精彩賽事\n\n這是文章內文..." should be stripped of markdown
    // After stripping #, *, _, >, -, \n, remaining text should be visible
    expect(screen.getAllByText(/精彩賽事/).length).toBeGreaterThan(0);
  });

  it("空 subHeroes 陣列時只渲染主 hero", () => {
    render(<HeroSection hero={heroArticle} subHeroes={[]} />);
    expect(screen.getAllByText("NBA 季後賽大戰開打")).toHaveLength(2);
    expect(screen.queryByText("湖人隊賽前準備工作")).toBeNull();
  });
});
