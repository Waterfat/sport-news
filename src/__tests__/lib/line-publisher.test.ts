import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishToLine } from "@/lib/publishers/line";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const defaultConfig = {
  channel_access_token: "test-channel-token",
  site_url: "https://howger-sport.com",
};

const defaultArticle = {
  title: "NBA 季後賽報導",
  content: "Lakers 今日精彩表現",
  slug: "nba-report",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishToLine", () => {
  it("成功發布訊息", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await publishToLine(defaultArticle, defaultConfig);

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/message/broadcast",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("缺少 channel_access_token 回傳錯誤", async () => {
    const result = await publishToLine(defaultArticle, {
      channel_access_token: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing channel_access_token");
  });

  it("LINE API 錯誤回傳 error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Invalid token" }),
    });

    const result = await publishToLine(defaultArticle, defaultConfig);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid token");
  });

  it("網路錯誤回傳 error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await publishToLine(defaultArticle, defaultConfig);

    expect(result.success).toBe(false);
    expect(result.error).toContain("LINE publish failed");
  });

  it("長內容截斷為 500 字元", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const longArticle = {
      ...defaultArticle,
      content: "B".repeat(600),
    };

    await publishToLine(longArticle, defaultConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const text = body.messages[0].text;
    expect(text).toContain("...");
  });

  it("包含文章連結", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await publishToLine(defaultArticle, defaultConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const text = body.messages[0].text;
    expect(text).toContain("howger-sport.com/articles/nba-report");
  });

  it("發送格式為 broadcast text message", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await publishToLine(defaultArticle, defaultConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].type).toBe("text");
  });

  it("使用正確的 Authorization header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await publishToLine(defaultArticle, defaultConfig);

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer test-channel-token");
  });
});
