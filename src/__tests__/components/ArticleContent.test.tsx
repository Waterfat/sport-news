import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArticleContent } from "@/components/public/ArticleContent";

// Mock auto-link to keep tests predictable
vi.mock("@/lib/auto-link", () => ({
  autoLinkChildren: (children: unknown) => children,
}));

describe("ArticleContent", () => {
  describe("基本 Markdown 渲染", () => {
    it("渲染 h1 標題", () => {
      render(<ArticleContent content="# Big Title" />);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    });

    it("渲染 h2 標題", () => {
      render(<ArticleContent content="## Second Title" />);
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    it("渲染 h3 標題", () => {
      render(<ArticleContent content="### Third Title" />);
      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    });

    it("渲染段落文字", () => {
      render(<ArticleContent content="這是一段文章內容。" />);
      expect(screen.getByText("這是一段文章內容。")).toBeInTheDocument();
    });

    it("渲染 bold 文字", () => {
      render(<ArticleContent content="**粗體文字**" />);
      const strong = screen.getByText("粗體文字").closest("strong");
      expect(strong).not.toBeNull();
    });

    it("渲染有序清單（ol）", () => {
      const { container } = render(<ArticleContent content={"1. ItemOne\n2. ItemTwo"} />);
      const ol = container.querySelector("ol");
      expect(ol).not.toBeNull();
      expect(container.textContent).toContain("ItemOne");
      expect(container.textContent).toContain("ItemTwo");
    });

    it("渲染無序清單（ul）", () => {
      const { container } = render(<ArticleContent content={"- BulletOne\n- BulletTwo"} />);
      const ul = container.querySelector("ul");
      expect(ul).not.toBeNull();
      expect(container.textContent).toContain("BulletOne");
    });

    it("渲染引用區塊（blockquote）", () => {
      render(<ArticleContent content="> 這是引用的文字" />);
      const blockquote = screen.getByText("這是引用的文字").closest("blockquote");
      expect(blockquote).not.toBeNull();
    });

    it("渲染行內 code", () => {
      render(<ArticleContent content="使用 `npm install` 安裝" />);
      const code = screen.getByText("npm install").closest("code");
      expect(code).not.toBeNull();
    });

    it("渲染水平分隔線（hr）", () => {
      const { container } = render(<ArticleContent content={"段落一\n\n---\n\n段落二"} />);
      const hr = container.querySelector("hr");
      expect(hr).not.toBeNull();
    });
  });

  describe("連結特殊處理", () => {
    it("YouTube URL 渲染為 iframe 嵌入", () => {
      const { container } = render(
        <ArticleContent content="[影片](https://www.youtube.com/watch?v=dQw4w9WgXcQ)" />
      );
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute("src")).toContain("youtube.com/embed/dQw4w9WgXcQ");
    });

    it("youtu.be 短網址也渲染為 iframe", () => {
      const { container } = render(
        <ArticleContent content="[短連結](https://youtu.be/dQw4w9WgXcQ)" />
      );
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe?.getAttribute("src")).toContain("youtube.com/embed/dQw4w9WgXcQ");
    });

    it("Twitter/X URL 渲染為特殊樣式連結", () => {
      render(
        <ArticleContent content="[推文](https://twitter.com/user/status/123456)" />
      );
      const link = screen.getByText("推文").closest("a");
      expect(link).not.toBeNull();
      expect(link?.getAttribute("href")).toContain("twitter.com");
      expect(link?.className).toContain("bg-muted");
    });

    it("x.com URL 也以 Twitter 樣式渲染", () => {
      render(
        <ArticleContent content="[X 推文](https://x.com/user/status/123)" />
      );
      const link = screen.getByText("X 推文").closest("a");
      expect(link?.className).toContain("bg-muted");
    });

    it("一般外部連結開啟新視窗（target=_blank）", () => {
      render(
        <ArticleContent content="[外部連結](https://example.com/page)" />
      );
      const link = screen.getByText("外部連結").closest("a");
      expect(link?.getAttribute("target")).toBe("_blank");
      expect(link?.getAttribute("rel")).toContain("noopener");
    });

    it("一般外部連結有藍色底線樣式（text-blue-600）", () => {
      render(
        <ArticleContent content="[一般連結](https://example.com/page)" />
      );
      const link = screen.getByText("一般連結").closest("a");
      expect(link?.className).toContain("text-blue-600");
    });
  });

  describe("圖片渲染", () => {
    it("渲染圖片並套用 lazy loading", () => {
      const { container } = render(
        <ArticleContent content="![圖片說明](https://cdn.example.com/photo.jpg)" />
      );
      const img = container.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("loading")).toBe("lazy");
    });

    it("圖片有 alt 時顯示 caption", () => {
      render(
        <ArticleContent content="![這是圖片說明](https://cdn.example.com/photo.jpg)" />
      );
      expect(screen.getByText("這是圖片說明")).toBeInTheDocument();
    });

    it("圖片無 alt 時不顯示 caption span", () => {
      const { container } = render(
        <ArticleContent content="![](https://cdn.example.com/photo.jpg)" />
      );
      // No text caption for empty alt
      const captionSpans = container.querySelectorAll("span.text-xs");
      expect(captionSpans).toHaveLength(0);
    });
  });

  describe("表格渲染", () => {
    it("渲染 GFM 表格", () => {
      const tableContent = `| 球隊 | 勝 | 負 |\n|------|---|---|\n| 湖人 | 30 | 20 |`;
      render(<ArticleContent content={tableContent} />);
      expect(screen.getByText("球隊")).toBeInTheDocument();
      expect(screen.getByText("湖人")).toBeInTheDocument();
    });
  });

  describe("標題錨點", () => {
    it("英文 h1 標題有 id 屬性（用於目錄錨點）", () => {
      const { container } = render(
        <ArticleContent content="# Analysis Point" />
      );
      const h1 = container.querySelector("h1");
      expect(h1?.getAttribute("id")).toBeTruthy();
      expect(h1?.getAttribute("id")).toBe("analysis-point");
    });

    it("h1 標題有 scroll-mt-20 class（用於錨點捲動）", () => {
      const { container } = render(
        <ArticleContent content="# Main Title" />
      );
      const h1 = container.querySelector("h1");
      expect(h1?.className).toContain("scroll-mt-20");
    });

    it("h2 標題有 scroll-mt-20 class", () => {
      const { container } = render(
        <ArticleContent content="## Section Title" />
      );
      const h2 = container.querySelector("h2");
      expect(h2?.className).toContain("scroll-mt-20");
    });
  });

  describe("category prop", () => {
    it("不傳 category 也能正常渲染", () => {
      render(<ArticleContent content="測試文章內容" />);
      expect(screen.getByText("測試文章內容")).toBeInTheDocument();
    });

    it("傳入 null category 也能正常渲染", () => {
      render(<ArticleContent content="測試文章" category={null} />);
      expect(screen.getByText("測試文章")).toBeInTheDocument();
    });
  });
});
