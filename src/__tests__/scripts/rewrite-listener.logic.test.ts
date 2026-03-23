/**
 * rewrite-listener.logic 接力/編排邏輯測試
 *
 * 測試 shouldTriggerProduce、shouldTriggerReview、parseTaskMode 的各種邊界條件
 */
import { describe, it, expect } from "vitest";
import {
  shouldTriggerProduce,
  shouldTriggerReview,
  parseTaskMode,
} from "../../../scripts/rewrite-listener.logic";

describe("shouldTriggerProduce — plan 完成後是否觸發 produce", () => {
  it("plan 成功且有新 plan → 觸發", () => {
    expect(shouldTriggerProduce("plan", true, 5)).toBe(true);
  });

  it("plan 成功但 0 筆新 plan → 不觸發", () => {
    expect(shouldTriggerProduce("plan", true, 0)).toBe(false);
  });

  it("plan 失敗 → 不觸發（即使有 plan）", () => {
    expect(shouldTriggerProduce("plan", false, 5)).toBe(false);
  });

  it("不是 plan 模式 → 不觸發", () => {
    expect(shouldTriggerProduce("produce", true, 5)).toBe(false);
    expect(shouldTriggerProduce("review", true, 5)).toBe(false);
  });

  it("plan 成功 + exit 0 但實際存入 0 筆（Bug #197 場景）→ 不觸發", () => {
    // 這是 Bug #197 的核心場景：
    // plan-generator exit 0（TypeError: fetch failed 不影響 exit code）
    // 但 Supabase 存檔失敗，實際 newPlanCount = 0
    expect(shouldTriggerProduce("plan", true, 0)).toBe(false);
  });
});

describe("shouldTriggerReview — produce 完成後是否觸發 review", () => {
  it("produce 產出 > 0 篇 → 觸發", () => {
    expect(shouldTriggerReview("produce", 3)).toBe(true);
  });

  it("produce 產出 0 篇 → 不觸發", () => {
    expect(shouldTriggerReview("produce", 0)).toBe(false);
  });

  it("不是 produce 模式 → 不觸發", () => {
    expect(shouldTriggerReview("plan", 5)).toBe(false);
    expect(shouldTriggerReview("review", 5)).toBe(false);
  });

  it("produce 產出 1 篇 → 觸發（邊界值）", () => {
    expect(shouldTriggerReview("produce", 1)).toBe(true);
  });
});

describe("parseTaskMode — 解析任務模式", () => {
  it("null metadata → plan 模式", () => {
    expect(parseTaskMode(null)).toEqual({ mode: "plan" });
  });

  it("空物件 → plan 模式", () => {
    expect(parseTaskMode({})).toEqual({ mode: "plan" });
  });

  it("produce 模式 + plan_ids", () => {
    const metadata = { mode: "produce", plan_ids: ["p1", "p2"] };
    expect(parseTaskMode(metadata)).toEqual({
      mode: "produce",
      planIds: ["p1", "p2"],
    });
  });

  it("produce 模式但無 plan_ids → plan 模式（fallback）", () => {
    const metadata = { mode: "produce" };
    expect(parseTaskMode(metadata)).toEqual({ mode: "plan" });
  });

  it("review 模式（無 article_ids）", () => {
    const metadata = { mode: "review" };
    expect(parseTaskMode(metadata)).toEqual({
      mode: "review",
      articleIds: undefined,
    });
  });

  it("review 模式 + article_ids", () => {
    const metadata = { mode: "review", article_ids: ["a1", "a2"] };
    expect(parseTaskMode(metadata)).toEqual({
      mode: "review",
      articleIds: ["a1", "a2"],
    });
  });

  it("未知模式 → plan（預設）", () => {
    const metadata = { mode: "unknown" };
    expect(parseTaskMode(metadata)).toEqual({ mode: "plan" });
  });

  it("auto_publish 欄位不影響模式解析", () => {
    const metadata = { mode: "produce", plan_ids: ["p1"], auto_publish: true };
    expect(parseTaskMode(metadata)).toEqual({
      mode: "produce",
      planIds: ["p1"],
    });
  });
});
