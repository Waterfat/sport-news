import { describe, it, expect } from "vitest";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  getCategorySlug,
  CHANNEL_TYPE_LABELS,
  ARTICLE_STATUS,
  ARTICLE_STATUS_LABELS,
  formatDateFull,
  formatDateShort,
  parsePagination,
} from "@/lib/constants";

describe("CATEGORY_COLORS", () => {
  it("has expected keys", () => {
    expect(CATEGORY_COLORS).toHaveProperty("NBA");
    expect(CATEGORY_COLORS).toHaveProperty("籃球");
    expect(CATEGORY_COLORS).toHaveProperty("MLB");
    expect(CATEGORY_COLORS).toHaveProperty("足球");
    expect(CATEGORY_COLORS).toHaveProperty("綜合");
  });

  it("NBA and 籃球 share the same color class", () => {
    expect(CATEGORY_COLORS["NBA"]).toBe(CATEGORY_COLORS["籃球"]);
  });

  it("MLB and 棒球 share the same color class", () => {
    expect(CATEGORY_COLORS["MLB"]).toBe(CATEGORY_COLORS["棒球"]);
  });
});

describe("CATEGORY_LABELS", () => {
  it("maps nba to NBA", () => {
    expect(CATEGORY_LABELS["nba"]).toBe("NBA");
    expect(CATEGORY_LABELS["nba"]).not.toBe("nba");
  });

  it("maps mlb to MLB", () => {
    expect(CATEGORY_LABELS["mlb"]).toBe("MLB");
    expect(CATEGORY_LABELS["mlb"]).not.toBe("mlb");
  });

  it("maps soccer to 足球", () => {
    expect(CATEGORY_LABELS["soccer"]).toBe("足球");
    expect(CATEGORY_LABELS["soccer"]).not.toBe("soccer");
  });

  it("maps general to 綜合", () => {
    expect(CATEGORY_LABELS["general"]).toBe("綜合");
    expect(CATEGORY_LABELS["general"]).not.toBe("general");
  });
});

describe("getCategorySlug", () => {
  it("returns nba for NBA", () => {
    expect(getCategorySlug("NBA")).toBe("nba");
  });

  it("returns nba for 籃球", () => {
    expect(getCategorySlug("籃球")).toBe("nba");
  });

  it("returns mlb for MLB", () => {
    expect(getCategorySlug("MLB")).toBe("mlb");
  });

  it("returns mlb for 棒球", () => {
    expect(getCategorySlug("棒球")).toBe("mlb");
  });

  it("returns soccer for 足球", () => {
    expect(getCategorySlug("足球")).toBe("soccer");
  });

  it("returns general for 綜合", () => {
    expect(getCategorySlug("綜合")).toBe("general");
  });

  it("returns general for unknown category", () => {
    expect(getCategorySlug("未知運動")).toBe("general");
    expect(getCategorySlug("")).toBe("general");
    expect(getCategorySlug("random")).toBe("general");
  });
});

describe("ARTICLE_STATUS", () => {
  it("has DRAFT value as draft", () => {
    expect(ARTICLE_STATUS.DRAFT).toBe("draft");
  });

  it("has PUBLISHED value as published", () => {
    expect(ARTICLE_STATUS.PUBLISHED).toBe("published");
  });
});

describe("ARTICLE_STATUS_LABELS", () => {
  it("maps draft to 未發布", () => {
    expect(ARTICLE_STATUS_LABELS["draft"]).toBe("未發布");
    expect(ARTICLE_STATUS_LABELS["draft"]).not.toBe("draft");
  });

  it("maps published to 已發布", () => {
    expect(ARTICLE_STATUS_LABELS["published"]).toBe("已發布");
    expect(ARTICLE_STATUS_LABELS["published"]).not.toBe("published");
  });
});

describe("CHANNEL_TYPE_LABELS", () => {
  it("maps facebook to Facebook", () => {
    expect(CHANNEL_TYPE_LABELS["facebook"]).toBe("Facebook");
    expect(CHANNEL_TYPE_LABELS["facebook"]).not.toBe("facebook");
  });

  it("maps telegram to Telegram", () => {
    expect(CHANNEL_TYPE_LABELS["telegram"]).toBe("Telegram");
    expect(CHANNEL_TYPE_LABELS["telegram"]).not.toBe("telegram");
  });

  it("maps x_twitter to X/Twitter", () => {
    expect(CHANNEL_TYPE_LABELS["x_twitter"]).toBe("X/Twitter");
    expect(CHANNEL_TYPE_LABELS["x_twitter"]).not.toBe("x_twitter");
  });

  it("maps line to LINE", () => {
    expect(CHANNEL_TYPE_LABELS["line"]).toBe("LINE");
    expect(CHANNEL_TYPE_LABELS["line"]).not.toBe("line");
  });

  it("maps custom to 自訂", () => {
    expect(CHANNEL_TYPE_LABELS["custom"]).toBe("自訂");
    expect(CHANNEL_TYPE_LABELS["custom"]).not.toBe("custom");
  });
});

describe("formatDateFull", () => {
  it("returns empty string for null", () => {
    expect(formatDateFull(null)).toBe("");
  });

  it("formats a date string in zh-TW with time", () => {
    const result = formatDateFull("2024-01-15T10:30:00.000Z");
    // Should contain year and month in Chinese format
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/月/);
    expect(result).toMatch(/日/);
    // Should contain time part (hour:minute)
    expect(result).toMatch(/\d+:\d+/);
  });

  it("returns a non-empty string for a valid date", () => {
    const result = formatDateFull("2023-06-20T00:00:00.000Z");
    expect(result).not.toBe("");
    expect(result.length).toBeGreaterThan(5);
  });
});

describe("formatDateShort", () => {
  it("returns empty string for null", () => {
    expect(formatDateShort(null)).toBe("");
  });

  it("formats a date string in zh-TW short form without time", () => {
    const result = formatDateShort("2024-01-15T10:30:00.000Z");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/月/);
    expect(result).toMatch(/日/);
    // Short format should NOT contain hour:minute with colon
    expect(result).not.toMatch(/\d{2}:\d{2}/);
  });

  it("returns a non-empty string for a valid date", () => {
    const result = formatDateShort("2023-06-20T00:00:00.000Z");
    expect(result).not.toBe("");
    expect(result.length).toBeGreaterThan(5);
  });
});

describe("parsePagination", () => {
  it("returns default values when no params are provided", () => {
    const params = new URLSearchParams();
    const result = parsePagination(params);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it("returns custom page and limit values", () => {
    const params = new URLSearchParams({ page: "3", limit: "50" });
    const result = parsePagination(params);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(100);
  });

  it("handles NaN page by returning default page=1", () => {
    const params = new URLSearchParams({ page: "abc" });
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  it("handles NaN limit by returning default limit", () => {
    const params = new URLSearchParams({ limit: "xyz" });
    const result = parsePagination(params);
    expect(result.limit).toBe(20);
  });

  it("clamps negative page to 1", () => {
    const params = new URLSearchParams({ page: "-5" });
    const result = parsePagination(params);
    expect(result.page).toBe(1);
  });

  it("clamps limit to max 500", () => {
    const params = new URLSearchParams({ limit: "1000" });
    const result = parsePagination(params);
    expect(result.limit).toBe(500);
  });

  it("clamps limit minimum to 1", () => {
    const params = new URLSearchParams({ limit: "-10" });
    const result = parsePagination(params);
    expect(result.limit).toBe(1);
  });

  it("calculates correct offset for page 2 with default limit", () => {
    const params = new URLSearchParams({ page: "2" });
    const result = parsePagination(params);
    expect(result.offset).toBe(20);
  });

  it("calculates correct offset for page 5 with limit 10", () => {
    const params = new URLSearchParams({ page: "5", limit: "10" });
    const result = parsePagination(params);
    expect(result.offset).toBe(40);
  });

  it("respects custom defaultLimit parameter", () => {
    const params = new URLSearchParams();
    const result = parsePagination(params, 100);
    expect(result.limit).toBe(100);
  });
});
