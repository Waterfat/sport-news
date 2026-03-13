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

### E2E 測試三層覆蓋原則

Scenario 測試（`e2e/scenarios/`）必須涵蓋以下三層，缺一不可：

1. **UI 結構驗證**：頁面載入、元素可見、導航正確
2. **互動流程驗證**：按鈕點擊、表單填寫、篩選切換、狀態變化
3. **實際操作 + 後端回應驗證**：觸發真實 API 呼叫，驗證不出現 500 錯誤、schema 錯誤、error alert/toast

第 3 層是最容易遺漏也最關鍵的一層。只驗證「按鈕存在」而不點擊執行，無法發現 DB schema 不同步、API 參數錯誤等後端問題。

**實作方式**：
- 監聽 `page.on("dialog")` 捕捉 alert 錯誤訊息
- 使用 `page.waitForResponse()` 攔截 API 回應，斷言 HTTP status
- 驗證操作後 UI 狀態正確變化（如 loading 狀態、成功提示）

## 測試指令

- 執行測試：`npx vitest run`
- 監聽模式：`npx vitest`
- 測試檔案位置：`src/__tests__/`
- 測試命名規則：`src/__tests__/lib/<module>.test.ts`、`src/__tests__/components/<Component>.test.tsx`

## 資料庫變更規則

- **所有 DB schema 變更（CREATE/ALTER/DROP/INDEX）必須透過 migration 檔案**，不得直接在 SQL Editor 手動改
- Migration 檔案位置：`supabase/migrations/`，編號遞增（如 `009_xxx.sql`）
- 必須使用 `IF NOT EXISTS` / `IF EXISTS` 確保 idempotent（可重複執行）
- 新增/修改 table、column、index、constraint 都算 schema 變更
- Migration 建立後必須 commit 進 git，確保 schema 與程式碼版本一致
- 套用 migration 方式：透過 Supabase Management API（`SUPABASE_ACCESS_TOKEN` 存於 `.env.local`）
  ```
  curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "<SQL>"}'
  ```
- **套用 migration 後必須重載 PostgREST schema cache**（否則 REST API 看不到新 column）：
  ```
  curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "NOTIFY pgrst, '\''reload schema'\'';"}'
  ```
- 套用 migration 後，需驗證應用層正常運作（跑 smoke test + E2E）

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
