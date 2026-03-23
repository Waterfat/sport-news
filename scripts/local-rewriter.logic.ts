/**
 * local-rewriter 業務邏輯模組
 *
 * 從入口檔拆出的純函式，可獨立 import 測試。
 * 入口檔 (local-rewriter.ts) 只負責 DB IO + 呼叫這些函式。
 */

import { isValidImageUrl } from "../src/lib/constants";

/**
 * 從多篇原始文章中收集不重複的圖片 URL（最多取 maxImages 張）
 *
 * @param articles - 原始文章陣列（需有 images 欄位）
 * @param usedImages - 同批次其他文章已使用的圖片 Set（跨文章去重）
 * @param maxImages - 每篇文章最多收集的圖片數量（預設 5）
 * @returns 收集到的圖片 URL 陣列
 */
export function collectImages(
  articles: Array<{ images?: string[] }>,
  usedImages: Set<string> = new Set(),
  maxImages = 5,
): string[] {
  const seen = new Set<string>(usedImages);
  const images: string[] = [];
  for (const a of articles) {
    for (const url of a.images || []) {
      if (url && isValidImageUrl(url) && !seen.has(url) && images.length < maxImages) {
        seen.add(url);
        images.push(url);
      }
    }
  }
  return images;
}

/**
 * 將本次收集到的圖片加入全域已使用集合
 * 用於 produceFromPlans 的 for loop 中追蹤同批次已用圖片
 */
export function addToUsedImages(usedImages: Set<string>, newImages: string[]): void {
  for (const url of newImages) {
    usedImages.add(url);
  }
}
