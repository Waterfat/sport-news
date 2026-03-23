import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  numericIdSchema,
  pctZeroOneSchema,
  pctZeroHundredSchema,
  nonNegIntStringSchema,
  safeValidate,
} from "@/lib/espn/schemas";

// ─── numericIdSchema ──────────────────────────────────────────────────────────

describe("numericIdSchema", () => {
  it("接受純數字字串", () => {
    expect(numericIdSchema.safeParse("123").success).toBe(true);
    expect(numericIdSchema.safeParse("0").success).toBe(true);
    expect(numericIdSchema.safeParse("999999").success).toBe(true);
  });

  it("拒絕含字母的字串", () => {
    expect(numericIdSchema.safeParse("abc").success).toBe(false);
    expect(numericIdSchema.safeParse("123abc").success).toBe(false);
  });

  it("拒絕空字串", () => {
    expect(numericIdSchema.safeParse("").success).toBe(false);
  });

  it("拒絕負號字串", () => {
    expect(numericIdSchema.safeParse("-123").success).toBe(false);
  });

  it("拒絕小數點字串", () => {
    expect(numericIdSchema.safeParse("1.5").success).toBe(false);
  });
});

// ─── pctZeroOneSchema ─────────────────────────────────────────────────────────

describe("pctZeroOneSchema", () => {
  it("接受 0 和 1", () => {
    expect(pctZeroOneSchema.safeParse(0).success).toBe(true);
    expect(pctZeroOneSchema.safeParse(1).success).toBe(true);
  });

  it("接受 0-1 之間的小數", () => {
    expect(pctZeroOneSchema.safeParse(0.5).success).toBe(true);
    expect(pctZeroOneSchema.safeParse(0.65).success).toBe(true);
  });

  it("拒絕大於 1 的值", () => {
    expect(pctZeroOneSchema.safeParse(1.1).success).toBe(false);
    expect(pctZeroOneSchema.safeParse(100).success).toBe(false);
  });

  it("拒絕小於 0 的值", () => {
    expect(pctZeroOneSchema.safeParse(-0.1).success).toBe(false);
    expect(pctZeroOneSchema.safeParse(-1).success).toBe(false);
  });
});

// ─── pctZeroHundredSchema ─────────────────────────────────────────────────────

describe("pctZeroHundredSchema", () => {
  it("接受 0 和 100", () => {
    expect(pctZeroHundredSchema.safeParse(0).success).toBe(true);
    expect(pctZeroHundredSchema.safeParse(100).success).toBe(true);
  });

  it("接受 0-100 之間的值", () => {
    expect(pctZeroHundredSchema.safeParse(50).success).toBe(true);
    expect(pctZeroHundredSchema.safeParse(65.5).success).toBe(true);
  });

  it("拒絕大於 100 的值", () => {
    expect(pctZeroHundredSchema.safeParse(100.1).success).toBe(false);
    expect(pctZeroHundredSchema.safeParse(200).success).toBe(false);
  });

  it("拒絕小於 0 的值", () => {
    expect(pctZeroHundredSchema.safeParse(-1).success).toBe(false);
  });
});

// ─── nonNegIntStringSchema ────────────────────────────────────────────────────

describe("nonNegIntStringSchema", () => {
  it("接受 '0' 和正整數字串", () => {
    expect(nonNegIntStringSchema.safeParse("0").success).toBe(true);
    expect(nonNegIntStringSchema.safeParse("42").success).toBe(true);
    expect(nonNegIntStringSchema.safeParse("100").success).toBe(true);
  });

  it("拒絕負號", () => {
    expect(nonNegIntStringSchema.safeParse("-1").success).toBe(false);
  });

  it("拒絕小數字串", () => {
    expect(nonNegIntStringSchema.safeParse("1.5").success).toBe(false);
  });

  it("拒絕空字串", () => {
    expect(nonNegIntStringSchema.safeParse("").success).toBe(false);
  });
});

// ─── safeValidate ─────────────────────────────────────────────────────────────

describe("safeValidate", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("驗證成功時回傳值", () => {
    const result = safeValidate(numericIdSchema, "123", "test.id", "0");
    expect(result).toBe("123");
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("驗證成功時不呼叫 console.warn", () => {
    safeValidate(pctZeroOneSchema, 0.65, "winPct", 0.5);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("驗證失敗時回傳 fallback 值", () => {
    const result = safeValidate(numericIdSchema, "abc", "test.id", "0");
    expect(result).toBe("0");
  });

  it("驗證失敗時呼叫 console.warn", () => {
    safeValidate(numericIdSchema, "abc", "test.id", "0");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("console.warn 訊息包含 label 名稱", () => {
    safeValidate(numericIdSchema, "invalid!", "homeTeam.id", "0");
    const warnArgs = consoleSpy.mock.calls[0].join(" ");
    expect(warnArgs).toContain("homeTeam.id");
  });

  it("pct 0-1 驗證失敗時回傳 fallback 0.5", () => {
    const result = safeValidate(pctZeroOneSchema, 1.5, "pickCenter.homeWinPct", 0.5);
    expect(result).toBe(0.5);
  });

  it("pct 0-100 驗證成功時回傳正確值", () => {
    const result = safeValidate(pctZeroHundredSchema, 65, "winProb", 50);
    expect(result).toBe(65);
  });

  it("ID 驗證成功時回傳原始值（非 fallback）", () => {
    const result = safeValidate(numericIdSchema, "42", "team.id", "0");
    expect(result).toBe("42");
    expect(result).not.toBe("0");
  });
});
