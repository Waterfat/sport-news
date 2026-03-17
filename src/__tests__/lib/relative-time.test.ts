import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime } from "@/lib/constants";

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string for null input", () => {
    expect(formatRelativeTime(null)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(formatRelativeTime("")).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatRelativeTime("not-a-date")).toBe("");
  });

  it('returns "剛剛" for less than 1 minute ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:30Z"));
    expect(formatRelativeTime("2026-03-17T12:00:00Z")).toBe("剛剛");
  });

  it('returns "N 分鐘前" for less than 60 minutes ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:15:00Z"));
    expect(formatRelativeTime("2026-03-17T12:00:00Z")).toBe("15 分鐘前");
  });

  it('returns "N 小時前" for less than 24 hours ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T18:00:00Z"));
    expect(formatRelativeTime("2026-03-17T12:00:00Z")).toBe("6 小時前");
  });

  it('returns "N 天前" for less than 7 days ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00Z"));
    expect(formatRelativeTime("2026-03-17T12:00:00Z")).toBe("3 天前");
  });

  it("returns formatted date for 7+ days ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T12:00:00Z"));
    const result = formatRelativeTime("2026-03-17T12:00:00Z");
    // Should fall through to formatDateShort, which returns zh-TW date
    expect(result).not.toBe("");
    expect(result).not.toContain("天前");
  });

  it("returns formatted date for future dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-17T12:00:00Z"));
    const result = formatRelativeTime("2026-03-20T12:00:00Z");
    expect(result).not.toBe("");
    expect(result).not.toContain("前");
  });
});
