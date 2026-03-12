import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockGetBucket = vi.fn();
const mockCreateBucket = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createServiceClient: () => ({
    storage: {
      getBucket: mockGetBucket,
      createBucket: mockCreateBucket,
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  ensureBucket,
  downloadAndStoreImage,
  downloadAndStoreImages,
} from "@/lib/image-storage";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureBucket", () => {
  it("creates bucket if it does not exist", async () => {
    mockGetBucket.mockResolvedValue({ data: null });
    mockCreateBucket.mockResolvedValue({ data: {}, error: null });

    await ensureBucket();

    expect(mockGetBucket).toHaveBeenCalledWith("article-images");
    expect(mockCreateBucket).toHaveBeenCalledWith("article-images", {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
    });
  });

  it("skips creation if bucket already exists", async () => {
    mockGetBucket.mockResolvedValue({ data: { id: "article-images" } });

    await ensureBucket();

    expect(mockCreateBucket).not.toHaveBeenCalled();
  });
});

describe("downloadAndStoreImage", () => {
  it("downloads image and uploads to storage", async () => {
    const imageBuffer = Buffer.alloc(10000, 0xff);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: async () => imageBuffer.buffer,
    });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.supabase.co/article-images/espn/2026-03/abc.jpg" },
    });

    const result = await downloadAndStoreImage(
      "https://example.com/photo.jpg",
      "ESPN"
    );

    expect(result).toBe("https://storage.supabase.co/article-images/espn/2026-03/abc.jpg");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/photo.jpg",
      expect.objectContaining({
        headers: expect.objectContaining({ "User-Agent": expect.any(String) }),
      })
    );
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^espn\/\d{4}-\d{2}\/\w+\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/jpeg", upsert: true })
    );
  });

  it("returns null for non-image content type", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "text/html"]]),
      arrayBuffer: async () => new ArrayBuffer(10000),
    });

    const result = await downloadAndStoreImage("https://example.com/page", "ESPN");
    expect(result).toBeNull();
  });

  it("returns null for failed HTTP response", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    const result = await downloadAndStoreImage("https://example.com/404.jpg", "ESPN");
    expect(result).toBeNull();
  });

  it("returns null for tiny images (tracking pixels)", async () => {
    const tinyBuffer = Buffer.alloc(100);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/gif"]]),
      arrayBuffer: async () => tinyBuffer.buffer,
    });

    const result = await downloadAndStoreImage("https://example.com/pixel.gif", "ESPN");
    expect(result).toBeNull();
  });

  it("returns null when upload fails", async () => {
    const imageBuffer = Buffer.alloc(10000, 0xff);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/png"]]),
      arrayBuffer: async () => imageBuffer.buffer,
    });
    mockUpload.mockResolvedValue({ error: { message: "Quota exceeded" } });

    const result = await downloadAndStoreImage("https://example.com/img.png", "ESPN");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await downloadAndStoreImage("https://example.com/img.jpg", "ESPN");
    expect(result).toBeNull();
  });

  it("sanitizes source name for file path", async () => {
    const imageBuffer = Buffer.alloc(10000, 0xff);
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: async () => imageBuffer.buffer,
    });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://x.com/path" } });

    await downloadAndStoreImage("https://example.com/img.jpg", "ETtoday 體育");

    const uploadPath = mockUpload.mock.calls[0][0];
    expect(uploadPath).toMatch(/^ettoday___\//);
    expect(uploadPath).not.toContain(" ");
  });
});

describe("downloadAndStoreImages", () => {
  it("returns empty array for empty input", async () => {
    const result = await downloadAndStoreImages([], "ESPN");
    expect(result).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("downloads multiple images and filters failures", async () => {
    const imageBuffer = Buffer.alloc(10000, 0xff);

    // First image succeeds, second fails
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Map([["content-type", "image/jpeg"]]),
        arrayBuffer: async () => imageBuffer.buffer,
      })
      .mockResolvedValueOnce({ ok: false });

    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://storage.com/img1.jpg" } });

    const result = await downloadAndStoreImages(
      ["https://example.com/good.jpg", "https://example.com/bad.jpg"],
      "ESPN"
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe("https://storage.com/img1.jpg");
  });

  it("processes images in parallel", async () => {
    const imageBuffer = Buffer.alloc(10000, 0xff);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: async () => imageBuffer.buffer,
    });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://storage.com/img.jpg" } });

    const urls = ["https://a.com/1.jpg", "https://b.com/2.jpg", "https://c.com/3.jpg"];
    const result = await downloadAndStoreImages(urls, "ESPN");

    expect(result).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
