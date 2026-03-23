/**
 * local-rewriter.logic 業務邏輯測試
 *
 * 測試 collectImages 的跨文章去重和 addToUsedImages 的追蹤邏輯
 */
import { describe, it, expect } from "vitest";
import { collectImages, addToUsedImages } from "../../../scripts/local-rewriter.logic";

describe("collectImages — 圖片收集與去重", () => {
  it("從單篇文章收集圖片", () => {
    const articles = [
      { images: ["https://example.com/a.jpg", "https://example.com/b.jpg"] },
    ];
    const result = collectImages(articles);
    expect(result).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
  });

  it("單篇文章內去重", () => {
    const articles = [
      { images: ["https://example.com/a.jpg", "https://example.com/a.jpg", "https://example.com/b.jpg"] },
    ];
    const result = collectImages(articles);
    expect(result).toEqual(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
  });

  it("跨文章去重（同批次不同文章引用重疊素材）", () => {
    const articles = [
      { images: ["https://example.com/shared.jpg", "https://example.com/a.jpg"] },
      { images: ["https://example.com/shared.jpg", "https://example.com/b.jpg"] },
    ];
    const result = collectImages(articles);
    expect(result).toEqual([
      "https://example.com/shared.jpg",
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });

  it("使用 usedImages 參數排除前面文章已用的圖片", () => {
    const usedImages = new Set(["https://example.com/already-used.jpg"]);
    const articles = [
      { images: ["https://example.com/already-used.jpg", "https://example.com/new.jpg"] },
    ];
    const result = collectImages(articles, usedImages);
    expect(result).toEqual(["https://example.com/new.jpg"]);
  });

  it("同批次多篇文章模擬 — 第二篇不會拿到第一篇已用的圖片", () => {
    const batchUsed = new Set<string>();

    // 第一篇文章
    const articles1 = [
      { images: ["https://example.com/shared.jpg", "https://example.com/a.jpg"] },
    ];
    const images1 = collectImages(articles1, batchUsed);
    addToUsedImages(batchUsed, images1);

    expect(images1).toEqual(["https://example.com/shared.jpg", "https://example.com/a.jpg"]);

    // 第二篇文章（引用重疊素材）
    const articles2 = [
      { images: ["https://example.com/shared.jpg", "https://example.com/b.jpg"] },
    ];
    const images2 = collectImages(articles2, batchUsed);
    addToUsedImages(batchUsed, images2);

    // shared.jpg 被第一篇用過，不應再出現
    expect(images2).toEqual(["https://example.com/b.jpg"]);
  });

  it("最多收集 maxImages 張", () => {
    const articles = [
      { images: Array.from({ length: 10 }, (_, i) => `https://example.com/${i}.jpg`) },
    ];
    const result = collectImages(articles, new Set(), 3);
    expect(result).toHaveLength(3);
  });

  it("過濾無效圖片 URL（非 http 開頭、含 logo/svg 等排除 pattern）", () => {
    const articles = [
      {
        images: [
          "https://example.com/valid.jpg",
          "data:image/png;base64,xxx", // 非 http
          "https://example.com/logo-icon.svg", // 含 logo 排除 pattern
          "", // 空字串
        ],
      },
    ];
    const result = collectImages(articles);
    expect(result).toContain("https://example.com/valid.jpg");
    expect(result).not.toContain("data:image/png;base64,xxx");
    expect(result).not.toContain("");
  });

  it("文章沒有 images 欄位時安全跳過", () => {
    const articles = [
      { images: undefined },
      {},
      { images: [] },
    ] as Array<{ images?: string[] }>;
    const result = collectImages(articles);
    expect(result).toEqual([]);
  });

  it("所有圖片都被 usedImages 占用時回傳空陣列", () => {
    const usedImages = new Set(["https://example.com/a.jpg", "https://example.com/b.jpg"]);
    const articles = [
      { images: ["https://example.com/a.jpg", "https://example.com/b.jpg"] },
    ];
    const result = collectImages(articles, usedImages);
    expect(result).toEqual([]);
  });
});

describe("addToUsedImages — 追蹤已使用圖片", () => {
  it("將新圖片加入 Set", () => {
    const used = new Set<string>();
    addToUsedImages(used, ["https://example.com/a.jpg", "https://example.com/b.jpg"]);
    expect(used.size).toBe(2);
    expect(used.has("https://example.com/a.jpg")).toBe(true);
  });

  it("不會重複加入", () => {
    const used = new Set(["https://example.com/a.jpg"]);
    addToUsedImages(used, ["https://example.com/a.jpg", "https://example.com/b.jpg"]);
    expect(used.size).toBe(2);
  });

  it("空陣列不影響 Set", () => {
    const used = new Set(["https://example.com/a.jpg"]);
    addToUsedImages(used, []);
    expect(used.size).toBe(1);
  });
});
