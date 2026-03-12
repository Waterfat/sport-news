import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishToTelegram } from "@/lib/publishers/telegram";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

const config = {
  bot_token: "test-token",
  chat_id: "@test_channel",
  site_url: "https://sportnews.example.com",
};

describe("publishToTelegram - text only", () => {
  it("sends full content without truncation", async () => {
    const longContent = "A".repeat(1000);
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    });

    await publishToTelegram(
      { title: "Test", content: longContent, slug: "test-slug" },
      config
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("A".repeat(1000));
    expect(body.text).not.toContain("...");
  });

  it("uses /news/ path for article links", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    });

    await publishToTelegram(
      { title: "Test", content: "Content", slug: "my-article" },
      config
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("https://sportnews.example.com/news/my-article");
  });

  it("includes 在網站上閱讀 link text", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    });

    await publishToTelegram(
      { title: "Test", content: "Content", slug: "slug" },
      config
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("在網站上閱讀");
  });

  it("sends HTML format with bold title", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 123 } }),
    });

    await publishToTelegram(
      { title: "NBA 新聞", content: "內容", slug: "nba-news" },
      config
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("<b>NBA 新聞</b>");
  });

  it("returns error when bot_token is missing", async () => {
    const result = await publishToTelegram(
      { title: "Test", content: "Content" },
      { bot_token: "", chat_id: "@ch" }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Missing bot_token or chat_id");
  });

  it("returns error when chat_id is missing", async () => {
    const result = await publishToTelegram(
      { title: "Test", content: "Content" },
      { bot_token: "token", chat_id: "" }
    );

    expect(result.success).toBe(false);
  });

  it("handles Telegram API error response", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, description: "Bad Request" }),
      status: 400,
    });

    const result = await publishToTelegram(
      { title: "Test", content: "Content" },
      config
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Bad Request");
  });

  it("handles fetch network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await publishToTelegram(
      { title: "Test", content: "Content" },
      config
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Telegram publish failed");
  });

  it("returns message_id on success", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 456 } }),
    });

    const result = await publishToTelegram(
      { title: "Test", content: "Content" },
      config
    );

    expect(result.success).toBe(true);
    expect(result.message_id).toBe(456);
  });

  it("omits link when no slug provided", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 789 } }),
    });

    await publishToTelegram(
      { title: "Test", content: "Content" },
      config
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).not.toContain("在網站上閱讀");
  });

  it("omits link when no site_url configured", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 789 } }),
    });

    await publishToTelegram(
      { title: "Test", content: "Content", slug: "slug" },
      { bot_token: "token", chat_id: "@ch" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).not.toContain("在網站上閱讀");
  });

  it("escapes HTML characters in title and content", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    });

    await publishToTelegram(
      { title: "A < B & C > D", content: "x < y" },
      config
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain("A &lt; B &amp; C &gt; D");
    expect(body.text).toContain("x &lt; y");
  });
});

describe("publishToTelegram - with images", () => {
  it("uses sendPhoto when article has images", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 100 } }),
    });

    await publishToTelegram(
      { title: "Test", content: "Short", images: ["https://storage.com/img.jpg"] },
      config
    );

    // Should call sendPhoto endpoint
    expect(mockFetch.mock.calls[0][0]).toContain("/sendPhoto");
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.photo).toBe("https://storage.com/img.jpg");
    expect(body.caption).toContain("<b>Test</b>");
  });

  it("uses sendMessage when no images", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 101 } }),
    });

    await publishToTelegram(
      { title: "Test", content: "Content", images: [] },
      config
    );

    expect(mockFetch.mock.calls[0][0]).toContain("/sendMessage");
  });

  it("uses sendMessage when images is undefined", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 102 } }),
    });

    await publishToTelegram(
      { title: "Test", content: "Content" },
      config
    );

    expect(mockFetch.mock.calls[0][0]).toContain("/sendMessage");
  });

  it("sends photo without caption then text separately when caption > 1024 chars", async () => {
    const longContent = "B".repeat(1100);

    // First call: sendPhoto (no caption)
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 200 } }),
    });
    // Second call: sendMessage (text)
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 201 } }),
    });

    const result = await publishToTelegram(
      { title: "Test", content: longContent, images: ["https://storage.com/big.jpg"] },
      config
    );

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // First call: sendPhoto without caption
    expect(mockFetch.mock.calls[0][0]).toContain("/sendPhoto");
    const photoBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(photoBody.photo).toBe("https://storage.com/big.jpg");
    expect(photoBody.caption).toBeUndefined();

    // Second call: sendMessage with full text
    expect(mockFetch.mock.calls[1][0]).toContain("/sendMessage");
    const textBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(textBody.text).toContain("B".repeat(1100));
  });

  it("falls back to sendMessage when sendPhoto fails", async () => {
    // sendPhoto fails
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, description: "Photo not found" }),
    });
    // fallback sendMessage succeeds
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 300 } }),
    });

    const result = await publishToTelegram(
      { title: "Test", content: "Short", images: ["https://invalid.com/nope.jpg"] },
      config
    );

    expect(result.success).toBe(true);
    expect(result.message_id).toBe(300);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toContain("/sendMessage");
  });

  it("uses only the first image", async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, result: { message_id: 400 } }),
    });

    await publishToTelegram(
      {
        title: "Test",
        content: "Short",
        images: ["https://storage.com/first.jpg", "https://storage.com/second.jpg"],
      },
      config
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.photo).toBe("https://storage.com/first.jpg");
  });
});
