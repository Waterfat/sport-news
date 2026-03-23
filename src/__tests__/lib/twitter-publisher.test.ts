import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishToTwitter } from "@/lib/publishers/twitter";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/routes", () => ({
  absoluteNewsUrl: (siteUrl: string, slug: string) => `${siteUrl}/news/${slug}`,
}));

const defaultConfig = {
  api_key: "key",
  api_secret: "secret",
  access_token: "token",
  access_token_secret: "token-secret",
  bearer_token: "bearer-token",
  site_url: "https://howger-sport.com",
};

const defaultArticle = {
  title: "NBA 季後賽：Lakers 大勝 Celtics",
  content: "精彩對決內容",
  slug: "nba-playoffs",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishToTwitter", () => {
  it("成功發布推文", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "tweet-123" } }),
    });

    const result = await publishToTwitter(defaultArticle, defaultConfig);

    expect(result.success).toBe(true);
    expect(result.tweet_id).toBe("tweet-123");
  });

  it("使用 bearer_token 認證", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "tweet-456" } }),
    });

    await publishToTwitter(defaultArticle, defaultConfig);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer bearer-token");
  });

  it("缺少 token 回傳錯誤", async () => {
    const result = await publishToTwitter(defaultArticle, {
      ...defaultConfig,
      bearer_token: undefined,
      access_token: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("Twitter API 錯誤回傳 error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ detail: "Rate limit exceeded" }),
    });

    const result = await publishToTwitter(defaultArticle, defaultConfig);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Rate limit exceeded");
  });

  it("網路錯誤回傳 error", async () => {
    mockFetch.mockRejectedValue(new Error("Connection refused"));

    const result = await publishToTwitter(defaultArticle, defaultConfig);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Twitter publish failed");
  });

  it("推文包含文章連結", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "tweet-789" } }),
    });

    await publishToTwitter(defaultArticle, defaultConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("howger-sport.com/news/nba-playoffs");
  });

  it("超長標題截斷", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "tweet-000" } }),
    });

    const longArticle = {
      ...defaultArticle,
      title: "A".repeat(300),
    };

    await publishToTwitter(longArticle, defaultConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    // 有連結時 maxTitleLen = 250，標題截斷為 250 字 + "..." 後加連結
    expect(body.text).toContain("...");
    // 確認標題部分被截斷（不是完整 300 字）
    const titlePart = body.text.split("\n")[0];
    expect(titlePart.length).toBeLessThanOrEqual(250);
  });
});
