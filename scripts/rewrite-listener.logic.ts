/**
 * rewrite-listener 接力/編排邏輯模組
 *
 * 從入口檔拆出的純函式，可獨立 import 測試。
 * 負責判斷 plan/produce/review 完成後是否觸發下一步。
 */

/**
 * 判斷 plan 完成後是否應觸發 produce
 *
 * @param mode - 當前任務模式
 * @param taskSucceeded - 子程序是否成功（exit code 0）
 * @param newPlanCount - 實際新增的 plan 筆數
 * @returns 是否應觸發 produce
 */
export function shouldTriggerProduce(
  mode: string,
  taskSucceeded: boolean,
  newPlanCount: number,
): boolean {
  return mode === "plan" && taskSucceeded && newPlanCount > 0;
}

/**
 * 判斷 produce 完成後是否應觸發 review
 *
 * @param mode - 當前任務模式
 * @param generatedCount - 實際產出的文章數量
 * @returns 是否應觸發 review
 */
export function shouldTriggerReview(
  mode: string,
  generatedCount: number,
): boolean {
  return mode === "produce" && generatedCount > 0;
}

/**
 * 解析任務的模式：plan / produce / review
 */
export function parseTaskMode(
  metadata: Record<string, unknown> | null,
): { mode: string; planIds?: string[]; articleIds?: string[] } {
  if (!metadata) return { mode: "plan" };
  if (metadata.mode === "produce" && Array.isArray(metadata.plan_ids)) {
    return { mode: "produce", planIds: metadata.plan_ids as string[] };
  }
  if (metadata.mode === "review") {
    const articleIds = Array.isArray(metadata.article_ids)
      ? (metadata.article_ids as string[])
      : undefined;
    return { mode: "review", articleIds };
  }
  return { mode: "plan" };
}
