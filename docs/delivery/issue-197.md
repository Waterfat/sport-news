# Issue #197: fix: 文章圖片重複 + 管線斷裂

**級別**: M
**類型**: Bug Fix
**相關 Issue**: #196（skill 規則更新，已完成）

## 需求摘要

1. **Bug 1 — 跨文章圖片重複**：`collectImages()` 每篇獨立收集，同批次不同文章引用重疊素材時產出相同圖片組
2. **Bug 2 — 管線靜默斷裂**：plan 存檔 `TypeError: fetch failed` 但 exit 0 → listener 判定成功但查無新 plan → 不觸發 produce/review/publish
3. **附帶修復**：`shared-claude` 遇 rate limit 無 retry

## 修復方案

### 1. local-rewriter 重構
- 拆出 `scripts/local-rewriter.logic.ts`，export `collectImages()` 和 `produceFromPlans()` 的核心邏輯
- `collectImages()` 改為接受 `usedImages: Set<string>` 參數，同批次跨文章去重
- 入口檔 `local-rewriter.ts` 只負責 DB IO + 呼叫 logic

### 2. rewrite-listener 重構
- 拆出 `scripts/rewrite-listener.logic.ts`，export `shouldTriggerProduce()` 和 `shouldTriggerReview()` 判斷邏輯
- `shouldTriggerProduce()` 改為檢查實際存入筆數，不只看 exit code

### 3. plan-generator 存檔 retry
- Supabase insert 加 retry（最多 2 次，間隔 2 秒）
- 失敗時 exit 1（而非 exit 0），讓 listener 能正確判斷

### 4. shared-claude rate limit retry
- 偵測 `You've hit your limit` 回應
- 等待指定時間後重試（最多 3 次）

### 5. 補 unit test
- `src/__tests__/scripts/local-rewriter.logic.test.ts` — 測 collectImages 跨文章去重、produceFromPlans 批次邏輯
- `src/__tests__/scripts/rewrite-listener.logic.test.ts` — 測 shouldTriggerProduce/Review 的各種邊界條件
- `src/__tests__/scripts/shared-claude.test.ts` — 測 rate limit 偵測

## 受影響檔案

- `scripts/local-rewriter.ts` + 新增 `scripts/local-rewriter.logic.ts`
- `scripts/rewrite-listener.ts` + 新增 `scripts/rewrite-listener.logic.ts`
- `scripts/plan-generator.ts`
- `scripts/shared-claude.ts`
- `src/__tests__/scripts/` 下新增測試檔

## BE 交付紀錄

### 修改檔案清單
- `scripts/local-rewriter.ts` — 移除內建 collectImages，改用 logic 模組；produceFromPlans 加入 batchUsedImages 追蹤
- `scripts/local-rewriter.logic.ts` — **新增**：collectImages（含 usedImages 參數）、addToUsedImages
- `scripts/rewrite-listener.ts` — 移除內建 parseTaskMode，改用 logic 模組；接力判斷改用 shouldTriggerProduce/Review
- `scripts/rewrite-listener.logic.ts` — **新增**：shouldTriggerProduce、shouldTriggerReview、parseTaskMode
- `scripts/plan-generator.ts` — 存檔加 retry（3 次 / 間隔 2 秒）+ 全部失敗 exit 1
- `scripts/shared-claude.ts` — 新增 isRateLimitError + callClaude 加 rate limit retry（最多 3 次，遞增等待）

### 新增測試
- `src/__tests__/scripts/local-rewriter.logic.test.ts` — 12 tests
- `src/__tests__/scripts/rewrite-listener.logic.test.ts` — 17 tests
- `src/__tests__/scripts/shared-claude.test.ts` — 8 tests

### 測試結果
- 新增 37 tests 全部通過
- 全站 1059 tests / 84 files 全部通過

### 給 QA 的注意事項
- 無新增 API route，smoke-test 不需更新
- 修改 scripts/ 後必須重啟 rewrite-listener
- 核心驗證：同批次產出的文章圖片不應完全相同

## 部署注意

- 修改 `scripts/` 後**必須重啟 rewrite-listener**
