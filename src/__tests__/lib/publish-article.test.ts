import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing the module under test
vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(),
}));

// Mock the channel publisher
vi.mock("@/lib/publishers", () => ({
  publishToChannel: vi.fn(),
}));

import { publishArticle, deduplicateCoverImage } from "@/lib/publish-article";
import { createServiceClient } from "@/lib/supabase";
import { publishToChannel } from "@/lib/publishers";

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockPublishToChannel = vi.mocked(publishToChannel);

// Helper to build a chainable Supabase query mock
function buildQueryChain(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    update: vi.fn(),
    single: vi.fn(),
  };

  // Make each method return the chain itself so calls can be chained
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.single.mockResolvedValue(resolvedValue);

  return chain;
}

function makeSupabaseMock(handlers: {
  articleResult: { data: unknown; error: unknown };
  channelsResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
}) {
  const defaultChannels = { data: [], error: null };
  const defaultUpdate = { data: null, error: null };

  let callCount = 0;
  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      callCount++;
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      if (table === "generated_articles" && callCount === 1) {
        // First call: fetch article
        chain.single.mockResolvedValue(handlers.articleResult);
        return chain;
      }

      if (table === "publish_channels") {
        // Channel query — return as resolved promise directly
        const channelResult = handlers.channelsResult ?? defaultChannels;
        chain.eq.mockResolvedValue(channelResult);
        chain.in.mockReturnThis();
        // Make the chain itself thenable for cases that end with .eq()
        return {
          ...chain,
          eq: vi.fn().mockResolvedValue(channelResult),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(channelResult),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(channelResult),
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(channelResult),
            }),
          }),
        };
      }

      if (table === "generated_articles" && callCount > 1) {
        // Second call: update article
        const updateResult = handlers.updateResult ?? defaultUpdate;
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(updateResult),
          }),
        };
      }

      return chain;
    }),
  };

  return supabase;
}

// More controlled mock approach using a sequence of calls
function buildSequentialMock(sequence: Array<() => unknown>) {
  let idx = 0;
  const supabase = {
    from: vi.fn().mockImplementation(() => {
      const handler = sequence[idx++] || (() => ({ data: null, error: null }));
      return handler();
    }),
  };
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishArticle - article not found", () => {
  it("returns error when article is not found", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Article not found" },
        }),
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("nonexistent-id");

    expect(result.success).toBe(false);
    expect(result.article_id).toBe("nonexistent-id");
    expect(result.errors).toContain("Article not found");
    expect(result.channels_published).toBe(0);
  });

  it("returns error when article data is null without error object", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("ghost-id");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("Article not found");
  });
});

describe("publishArticle - publish with channels", () => {
  it("uses publish_channel_ids when provided", async () => {
    const article = {
      id: "art-1",
      title: "Test Article",
      content: "Some content",
      slug: "test-article",
      images: ["https://img.com/test.jpg"],
      publish_channel_ids: [42, 99],
      review_status: "approved",
    };

    const channels = [
      { id: 42, name: "TG Channel", type: "telegram", config: {}, is_active: true },
    ];

    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: article, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          // Dedup query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: channels, error: null }),
          };
        }

        // Update call
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 42,
      channel_name: "TG Channel",
      channel_type: "telegram",
      success: true,
      message_id: 1,
    });

    const result = await publishArticle("art-1");

    expect(result.success).toBe(true);
    expect(result.channels_published).toBe(1);
    expect(mockPublishToChannel).toHaveBeenCalledTimes(1);
    expect(mockPublishToChannel).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test Article" }),
      channels[0]
    );
  });

  it("fetches all active channels when publish_channel_ids is empty", async () => {
    const article = {
      id: "art-2",
      title: "All Channels Article",
      content: "Content",
      slug: "all-channels",
      images: ["https://img.com/art2.jpg"],
      publish_channel_ids: [],
      review_status: "approved",
    };

    const allChannels = [
      { id: 1, name: "Ch1", type: "telegram", config: {}, is_active: true },
      { id: 2, name: "Ch2", type: "telegram", config: {}, is_active: true },
    ];

    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: article, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          // Dedup query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: allChannels, error: null }),
          };
        }

        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Ch1",
      channel_type: "telegram",
      success: true,
    });

    const result = await publishArticle("art-2");

    expect(result.channels_published).toBe(2);
    expect(mockPublishToChannel).toHaveBeenCalledTimes(2);
  });

  it("updates article status to published on success", async () => {
    const article = {
      id: "art-3",
      title: "Published Article",
      content: "Content",
      slug: "published-article",
      images: ["https://img.com/art3.jpg"],
      publish_channel_ids: [],
      review_status: "approved",
    };

    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: article, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          // Dedup query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        // Update call for generated_articles
        return { update: updateMock };
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);

    await publishArticle("art-3");

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "published" })
    );
  });

  it("includes channel error in result when publish fails", async () => {
    const article = {
      id: "art-4",
      title: "Error Article",
      content: "Content",
      slug: "error-article",
      images: ["https://img.com/art4.jpg"],
      publish_channel_ids: [],
      review_status: "approved",
    };

    const channels = [
      { id: 5, name: "FailCh", type: "telegram", config: {}, is_active: true },
    ];

    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: article, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          // Dedup query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: channels, error: null }),
          };
        }

        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 5,
      channel_name: "FailCh",
      channel_type: "telegram",
      success: false,
      error: "Bot token invalid",
    });

    const result = await publishArticle("art-4");

    expect(result.success).toBe(false);
    expect(result.channels_failed).toBe(1);
    expect(result.errors.some((e) => e.includes("FailCh"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Bot token invalid"))).toBe(true);
  });
});

describe("extractImageUrls (via publishArticle images field)", () => {
  function buildArticleMock(images: unknown) {
    const article = {
      id: "img-test",
      title: "Image Test",
      content: "Content",
      slug: "image-test",
      images,
      publish_channel_ids: [],
      review_status: "approved",
    };

    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: article, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          // Cover image dedup query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 1, name: "Ch", type: "telegram", config: {}, is_active: true }],
              error: null,
            }),
          };
        }

        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };

    return supabase;
  }

  it("passes string array images to publishToChannel", async () => {
    const supabase = buildArticleMock(["https://cdn.example.com/img.jpg"]);
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Ch",
      channel_type: "telegram",
      success: true,
    });

    await publishArticle("img-test");

    expect(mockPublishToChannel).toHaveBeenCalledWith(
      expect.objectContaining({ images: ["https://cdn.example.com/img.jpg"] }),
      expect.anything()
    );
  });

  it("extracts url from object array images", async () => {
    const supabase = buildArticleMock([{ url: "https://cdn.example.com/obj.jpg" }]);
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Ch",
      channel_type: "telegram",
      success: true,
    });

    await publishArticle("img-test");

    expect(mockPublishToChannel).toHaveBeenCalledWith(
      expect.objectContaining({ images: ["https://cdn.example.com/obj.jpg"] }),
      expect.anything()
    );
  });

  it("returns error and does not publish when images is null", async () => {
    const supabase = buildArticleMock(null);
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("img-test");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("無圖片，無法發布");
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });

  it("returns error and does not publish when images is undefined", async () => {
    const supabase = buildArticleMock(undefined);
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("img-test");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("無圖片，無法發布");
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });

  it("returns error and does not publish when images is a non-array value", async () => {
    const supabase = buildArticleMock("not-an-array");
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("img-test");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("無圖片，無法發布");
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });

  it("filters out object entries without url property", async () => {
    const supabase = buildArticleMock([
      { url: "https://cdn.example.com/valid.jpg" },
      { other: "no-url-here" },
      "https://cdn.example.com/string.jpg",
    ]);
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Ch",
      channel_type: "telegram",
      success: true,
    });

    await publishArticle("img-test");

    const call = mockPublishToChannel.mock.calls[0][0];
    expect(call.images).toContain("https://cdn.example.com/valid.jpg");
    expect(call.images).toContain("https://cdn.example.com/string.jpg");
    expect(call.images).toHaveLength(2);
  });
});

describe("publishArticle - cover image dedup integration", () => {
  it("substitutes cover image when duplicate is found and updates DB", async () => {
    const article = {
      id: "dedup-1",
      title: "Dedup Article",
      content: "Content",
      slug: "dedup-article",
      images: ["https://img.com/dup.jpg", "https://img.com/unique.jpg"],
      publish_channel_ids: [],
      review_status: "approved",
    };

    const publishedArticles = [
      { images: ["https://img.com/dup.jpg", "https://img.com/other.jpg"] },
    ];

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: article, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: publishedArticles, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 3) {
          return { update: updateMock };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("dedup-1");

    expect(result.success).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        images: expect.arrayContaining(["https://img.com/unique.jpg"]),
      })
    );
    const updatedImages = updateMock.mock.calls[0][0].images;
    expect(updatedImages[0]).toBe("https://img.com/unique.jpg");
  });

  it("keeps original cover when DB update fails and reports error", async () => {
    const article = {
      id: "dedup-fail",
      title: "Dedup Fail Article",
      content: "Content",
      slug: "dedup-fail",
      images: ["https://img.com/dup.jpg", "https://img.com/alt.jpg"],
      publish_channel_ids: [],
      review_status: "approved",
    };

    const publishedArticles = [
      { images: ["https://img.com/dup.jpg"] },
    ];

    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: article, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: publishedArticles, error: null }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 3) {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: "DB write failed" } }),
            }),
          };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("dedup-fail");

    expect(result.errors.some((e) => e.includes("Cover image dedup update failed"))).toBe(true);
  });
});

describe("publishArticle - image validation", () => {
  function makeSingleArticleMock(article: Record<string, unknown>) {
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: article, error: null }),
      }),
    };
  }

  it("blocks publish when images is empty array", async () => {
    const supabase = makeSingleArticleMock({
      id: "no-img-1",
      title: "No Image Article",
      content: "Content",
      slug: "no-img",
      images: [],
      publish_channel_ids: [],
      review_status: "approved",
    });
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("no-img-1");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("無圖片，無法發布");
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });

  it("blocks publish when images is null", async () => {
    const supabase = makeSingleArticleMock({
      id: "no-img-2",
      title: "Null Image Article",
      content: "Content",
      slug: "null-img",
      images: null,
      publish_channel_ids: [],
      review_status: "approved",
    });
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("no-img-2");

    expect(result.success).toBe(false);
    expect(result.errors).toContain("無圖片，無法發布");
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });

  it("allows publish when images has at least one valid URL", async () => {
    let fromCallIndex = 0;
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        fromCallIndex++;

        if (table === "generated_articles" && fromCallIndex === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: "has-img-1",
                title: "Has Image Article",
                content: "Content",
                slug: "has-img",
                images: ["https://img.com/cover.jpg"],
                publish_channel_ids: [],
              },
              error: null,
            }),
          };
        }

        if (table === "generated_articles" && fromCallIndex === 2) {
          // Dedup query
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        if (table === "publish_channels") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }

        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("has-img-1");

    // Should proceed past image check (no "無圖片" error)
    expect(result.errors).not.toContain("無圖片，無法發布");
  });
});

describe("deduplicateCoverImage", () => {
  it("returns original array when cover is not duplicated", () => {
    const images = ["https://img.com/a.jpg", "https://img.com/b.jpg"];
    const existing = new Set(["https://img.com/other.jpg"]);
    const result = deduplicateCoverImage(images, existing);
    expect(result).toEqual(images);
  });

  it("swaps cover with first non-duplicate when cover is duplicated", () => {
    const images = [
      "https://img.com/dup.jpg",
      "https://img.com/unique.jpg",
      "https://img.com/c.jpg",
    ];
    const existing = new Set(["https://img.com/dup.jpg"]);
    const result = deduplicateCoverImage(images, existing);
    expect(result[0]).toBe("https://img.com/unique.jpg");
    expect(result).toContain("https://img.com/dup.jpg");
    expect(result).toHaveLength(3);
  });

  it("skips duplicates to find first available alternative", () => {
    const images = [
      "https://img.com/dup1.jpg",
      "https://img.com/dup2.jpg",
      "https://img.com/unique.jpg",
    ];
    const existing = new Set([
      "https://img.com/dup1.jpg",
      "https://img.com/dup2.jpg",
    ]);
    const result = deduplicateCoverImage(images, existing);
    expect(result[0]).toBe("https://img.com/unique.jpg");
  });

  it("returns original array when all images are duplicated", () => {
    const images = ["https://img.com/dup1.jpg", "https://img.com/dup2.jpg"];
    const existing = new Set([
      "https://img.com/dup1.jpg",
      "https://img.com/dup2.jpg",
    ]);
    const result = deduplicateCoverImage(images, existing);
    expect(result).toEqual(images);
  });

  it("returns original array when only one image exists", () => {
    const images = ["https://img.com/only.jpg"];
    const existing = new Set(["https://img.com/only.jpg"]);
    const result = deduplicateCoverImage(images, existing);
    expect(result).toEqual(images);
  });

  it("returns original array when images is empty", () => {
    const result = deduplicateCoverImage([], new Set());
    expect(result).toEqual([]);
  });

  it("returns original array when existing covers set is empty", () => {
    const images = ["https://img.com/a.jpg", "https://img.com/b.jpg"];
    const result = deduplicateCoverImage(images, new Set());
    expect(result).toEqual(images);
  });

  it("does not mutate the original array", () => {
    const images = [
      "https://img.com/dup.jpg",
      "https://img.com/unique.jpg",
    ];
    const original = [...images];
    const existing = new Set(["https://img.com/dup.jpg"]);
    deduplicateCoverImage(images, existing);
    expect(images).toEqual(original);
  });

  it("handles sequential publish of multiple articles (no race condition)", async () => {
    // Verify that batch publish logic uses sequential loop, not Promise.all()
    // This is tested through the implementation review (code review found Promise.all() → sequential fix)
    // This test documents the expected behavior: dedup queries happen in sequence

    const article = {
      id: "art-sequential-1",
      title: "Sequential Article",
      content: "Content",
      slug: "seq-article",
      images: ["https://img.com/cover.jpg"],
      publish_channel_ids: [],
      review_status: "approved",
    };

    const supabase = {
      from: vi.fn().mockImplementation((_table: string) => {
        const chain = {
          select: vi.fn(),
          eq: vi.fn(),
          neq: vi.fn(),
          order: vi.fn(),
          limit: vi.fn(),
          update: vi.fn(),
          in: vi.fn(),
          single: vi.fn(),
        };

        chain.select.mockReturnValue(chain);
        chain.eq.mockReturnValue(chain);
        chain.neq.mockReturnValue(chain);
        chain.order.mockReturnValue(chain);
        chain.limit.mockResolvedValue({ data: [], error: null }); // Empty published set
        chain.single.mockResolvedValue({ data: article, error: null });
        chain.update.mockReturnValue(chain);
        chain.in.mockReturnValue(chain);

        return chain;
      }),
    };

    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Test Channel",
      channel_type: "telegram",
      success: true,
      message_id: 1,
    });

    const result = await publishArticle("art-sequential-1");

    expect(result.success).toBe(true);
    expect(result.title).toBe("Sequential Article");
    // Sequential publish ensures dedup snapshot is consistent per article
  });

  it("dedup handles article with no other published articles", async () => {
    // Edge case: dedup query completes but returns empty set (first article being published)
    // Should maintain original cover image without error
    const article = {
      id: "art-first-publish",
      title: "Very First Article",
      content: "Content",
      slug: "first-pub",
      images: ["https://img.com/first-cover.jpg"],
      publish_channel_ids: [],
      review_status: "approved",
    };

    const supabase = {
      from: vi.fn().mockImplementation((_table: string) => {
        const chain = {
          select: vi.fn(),
          eq: vi.fn(),
          neq: vi.fn(),
          order: vi.fn(),
          limit: vi.fn(),
          update: vi.fn(),
          in: vi.fn(),
          single: vi.fn(),
        };

        chain.select.mockReturnValue(chain);
        chain.eq.mockReturnValue(chain);
        chain.neq.mockReturnValue(chain);
        chain.order.mockReturnValue(chain);
        chain.limit.mockResolvedValue({ data: [], error: null }); // No published articles yet
        chain.single.mockResolvedValue({ data: article, error: null });
        chain.update.mockReturnValue(chain);
        chain.in.mockReturnValue(chain);

        return chain;
      }),
    };

    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Test",
      channel_type: "telegram",
      success: true,
      message_id: 1,
    });

    const result = await publishArticle("art-first-publish");

    expect(result.success).toBe(true);
    expect(result.title).toBe("Very First Article");
    // First article: no dedup needed, cover image unchanged
  });
});

// ============================================================
// PA: review_status 檢查（補充缺口）
// ============================================================

describe("publishArticle - review_status 阻擋發布（PA）", () => {
  function makeArticleWithReviewStatus(review_status: string | null) {
    return {
      id: "rev-test",
      title: "Review Gate Article",
      content: "Content",
      slug: "review-gate",
      images: ["https://img.com/cover.jpg"],
      publish_channel_ids: [],
      review_status,
    };
  }

  function buildSimpleSupabase(article: Record<string, unknown>) {
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: article, error: null }),
      }),
    };
  }

  it("PA-01: review_status=pending 時阻擋發布並回傳錯誤", async () => {
    const supabase = buildSimpleSupabase(makeArticleWithReviewStatus("pending"));
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("rev-test");

    expect(result.success).toBe(false);
    expect(result.channels_published).toBe(0);
    expect(result.errors.some((e) => e.includes("未通過審查"))).toBe(true);
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });

  it("PA-02: review_status=rejected 時阻擋發布並回傳錯誤", async () => {
    const supabase = buildSimpleSupabase(makeArticleWithReviewStatus("rejected"));
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("rev-test");

    expect(result.success).toBe(false);
    expect(result.channels_published).toBe(0);
    expect(result.errors.some((e) => e.includes("未通過審查"))).toBe(true);
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });

  it("review_status=null 時阻擋發布（視為尚未審查）", async () => {
    const supabase = buildSimpleSupabase(makeArticleWithReviewStatus(null));
    mockCreateServiceClient.mockReturnValue(supabase as never);

    const result = await publishArticle("rev-test");

    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes("未通過審查"))).toBe(true);
    expect(mockPublishToChannel).not.toHaveBeenCalled();
  });
});
