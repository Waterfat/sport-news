/**
 * Zod schema — ESPN API 回傳值 runtime 驗證
 * 只涵蓋關鍵數值欄位的 range/type 約束，不驗整個 response 結構
 */
import { z } from "zod";

/** 數字字串 ID（ESPN team/player/event ID 格式） */
export const numericIdSchema = z.string().regex(/^\d+$/, "ID must be numeric string");

/** 百分比 0-1 scale（如 winPercentage） */
export const pctZeroOneSchema = z.number().min(0).max(1);

/** 百分比 0-100 scale（如 winProbability display） */
export const pctZeroHundredSchema = z.number().min(0).max(100);

/** 非負整數字串（如 score） */
export const nonNegIntStringSchema = z.string().regex(/^\d+$/, "Must be non-negative integer string");

// ---------------------------------------------------------------------------
// Assertion helpers — 用於 parse 函式中做輕量驗證，失敗時 log 但不 throw
// ---------------------------------------------------------------------------

/** 驗證值是否符合 schema，失敗時 console.warn 並回傳 fallback */
export function safeValidate<T>(
  schema: z.ZodType<T>,
  value: unknown,
  label: string,
  fallback: T
): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    console.warn(
      `[Schema] ${label} validation failed:`,
      result.error.issues[0]?.message,
      `(got: ${JSON.stringify(value)})`
    );
    return fallback;
  }
  return result.data;
}
