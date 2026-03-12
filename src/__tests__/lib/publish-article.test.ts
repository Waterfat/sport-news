import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing the module under test
vi.mock("@/lib/supabase", () => ({
  createServiceClient: vi.fn(),
}));

// Mock the channel publisher
vi.mock("@/lib/publishers", () => ({
  publishToChannel: vi.fn(),
}));

import { publishArticle } from "@/lib/publish-article";
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
      images: [],
      publish_channel_ids: [42, 99],
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
      images: null,
      publish_channel_ids: [],
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
      images: [],
      publish_channel_ids: [],
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
      images: [],
      publish_channel_ids: [],
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

  it("passes empty array when images is null", async () => {
    const supabase = buildArticleMock(null);
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Ch",
      channel_type: "telegram",
      success: true,
    });

    await publishArticle("img-test");

    expect(mockPublishToChannel).toHaveBeenCalledWith(
      expect.objectContaining({ images: [] }),
      expect.anything()
    );
  });

  it("passes empty array when images is undefined", async () => {
    const supabase = buildArticleMock(undefined);
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Ch",
      channel_type: "telegram",
      success: true,
    });

    await publishArticle("img-test");

    expect(mockPublishToChannel).toHaveBeenCalledWith(
      expect.objectContaining({ images: [] }),
      expect.anything()
    );
  });

  it("passes empty array when images is a non-array value", async () => {
    const supabase = buildArticleMock("not-an-array");
    mockCreateServiceClient.mockReturnValue(supabase as never);
    mockPublishToChannel.mockResolvedValue({
      channel_id: 1,
      channel_name: "Ch",
      channel_type: "telegram",
      success: true,
    });

    await publishArticle("img-test");

    expect(mockPublishToChannel).toHaveBeenCalledWith(
      expect.objectContaining({ images: [] }),
      expect.anything()
    );
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
