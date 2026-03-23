import { describe, it, expect } from "vitest";
import { getFirstImageUrl } from "@/lib/constants";

describe("getFirstImageUrl", () => {
  it("returns null for null input", () => {
    expect(getFirstImageUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getFirstImageUrl(undefined)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(getFirstImageUrl([])).toBeNull();
  });

  it("returns null for non-array input", () => {
    expect(getFirstImageUrl("https://example.com/image.jpg")).toBeNull();
    expect(getFirstImageUrl(42)).toBeNull();
    expect(getFirstImageUrl({})).toBeNull();
  });

  it("returns url from object format { url: string }[]", () => {
    const images = [{ url: "https://cdn.example.com/photo.jpg" }];
    expect(getFirstImageUrl(images)).toBe("https://cdn.example.com/photo.jpg");
  });

  it("returns first url when multiple objects in array", () => {
    const images = [
      { url: "https://cdn.example.com/first.jpg" },
      { url: "https://cdn.example.com/second.jpg" },
    ];
    expect(getFirstImageUrl(images)).toBe("https://cdn.example.com/first.jpg");
  });

  it("returns url from string array format", () => {
    const images = ["https://cdn.example.com/photo.jpg", "https://cdn.example.com/photo2.jpg"];
    expect(getFirstImageUrl(images)).toBe("https://cdn.example.com/photo.jpg");
  });

  it("returns null when first element has no url property", () => {
    const images = [{ src: "https://cdn.example.com/photo.jpg" }];
    expect(getFirstImageUrl(images)).toBeNull();
  });

  it("returns null when url property is not a string", () => {
    const images = [{ url: 123 }];
    expect(getFirstImageUrl(images)).toBeNull();
  });

  it("returns null when first element is null", () => {
    const images = [null, { url: "https://cdn.example.com/photo.jpg" }];
    expect(getFirstImageUrl(images)).toBeNull();
  });
});
