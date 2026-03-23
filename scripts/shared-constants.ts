/**
 * 管線共用常數 — plan-generator / rewrite-listener / local-rewriter 共用
 * 修改此檔案後必須重啟 rewrite-listener
 */

/** 素材時效窗口（小時）：只處理此時間內爬到的素材 */
export const MATERIAL_WINDOW_HOURS = 12;

/** 每位寫手每次最多處理的素材數量 */
export const MAX_MATERIALS_PER_WRITER = 20;
