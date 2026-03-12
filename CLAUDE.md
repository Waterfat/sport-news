# Sport News 專案規則

## 強制開發流程

- 每次 commit 前必須執行 `npx vitest run`，測試未通過不得 commit
- 新增/修改 `src/lib/*.ts` 或 `src/app/api/**/*.ts` → 必須同步新增/更新對應 unit test
- `/review` 重構完 → 執行 `/write-tests` 補齊測試覆蓋
- **部署後必須依序執行兩道驗證**，全部通過才算部署完成：
  1. `./scripts/smoke-test.sh` — API 層驗證（HTTP status、認證保護、DB 連通）
  2. `./scripts/e2e-test.sh` — 瀏覽器 E2E 驗證（頁面渲染、UI 元素、互動流程）
- 新增 API 端點後 → 更新 `smoke-test.config.json` 對應的 protected_apis 或 public_apis
- 新增/修改頁面後 → 更新對應的 `e2e/*.spec.ts` 測試

## E2E 測試

- 框架：Playwright（`npx playwright test`）
- 測試目錄：`e2e/`
- 執行：`./scripts/e2e-test.sh [BASE_URL]`
- 後台測試需設定環境變數：`E2E_USERNAME` + `E2E_PASSWORD`（未設定時腳本會主動詢問，不得自動跳過）
- 新增頁面/修改 UI 時必須同步更新 E2E 測試

## 測試指令

- 執行測試：`npx vitest run`
- 監聽模式：`npx vitest`
- 測試檔案位置：`src/__tests__/`
- 測試命名規則：`src/__tests__/lib/<module>.test.ts`、`src/__tests__/components/<Component>.test.tsx`

## 技術棧

- Next.js App Router + TypeScript
- Supabase (PostgreSQL) - Project Ref: `fmakjkvkmbltqgyndijb`
- Vitest + jsdom (測試)
- Tailwind CSS + shadcn/ui
- NextAuth.js (認證)

## 共用常數

新增常數統一放 `src/lib/constants.ts`，避免跨檔案重複定義。

## 發布邏輯

所有發布行為統一使用 `src/lib/publish-article.ts` 的 `publishArticle()` 函式，預設全頻道發布。
