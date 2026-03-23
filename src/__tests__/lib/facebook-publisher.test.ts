import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishToFacebook } from "@/lib/publishers/facebook";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock routes
vi.mock("@/lib/routes", () => ({
  absoluteNewsUrl: (siteUrl: string, slug: string) => `${siteUrl}/news/${slug}`,
}));

const defaultConfig = {
  page_id: "test-page-id",
  access_token: "test-access-token",
  site_url: "https://howger-sport.com",
};

const defaultArticle = {
  title: "NBA 季後賽精彩對決",
  content: "Lakers 擊敗 Celtics 取得系列賽領先",
  slug: "nba-playoffs-2024",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishToFacebook", () => {
  it("成功發布文章", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "post-123" }),
    });

    const result = await publishToFacebook(defaultArticle, defaultConfig);

    expect(result.success).toBe(true);
    expect(result.post_id).toBe("post-123");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("graph.facebook.com"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("缺少 page_id 回傳錯誤", async () => {
    const result = await publishToFacebook(defaultArticle, {
      ...defaultConfig,
      page_id: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing page_id");
  });

  it("缺少 access_token 回傳錯誤", async () => {
    const result = await publishToFacebook(defaultArticle, {
      ...defaultConfig,
      access_token: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("Facebook API 錯誤回傳 error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: { message: "Invalid access token" },
      }),
    });

    const result = await publishToFacebook(defaultArticle, defaultConfig);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid access token");
  });

  it("網路錯誤回傳 error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await publishToFacebook(defaultArticle, defaultConfig);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Facebook publish failed");
  });

  it("長內容截斷為 500 字元", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "post-456" }),
    });

    const longArticle = {
      ...defaultArticle,
      content: "A".repeat(600),
    };

    await publishToFacebook(longArticle, defaultConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message.length).toBeLessThan(600 + 100); // title + truncated content + link
    expect(body.message).toContain("...");
  });

  it("包含文章連結", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "post-789" }),
    });

    await publishToFacebook(defaultArticle, defaultConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.link).toContain("howger-sport.com/news/nba-playoffs-2024");
  });

  it("無 site_url 時不含連結", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "post-000" }),
    });

    await publishToFacebook(defaultArticle, {
      page_id: "test",
      access_token: "test",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.link).toBeUndefined();
  });
});
