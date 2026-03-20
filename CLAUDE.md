# Sport News 專案規則

## 需求處理流程

收到**需要修改程式碼**的功能需求或架構變更時，**預設先進入 Plan Mode**，不可直接修改程式碼。純討論、問答、規劃不需要進入 Plan Mode。

### Plan Mode 流程

1. 讀取相關程式碼，理解現有架構
2. 向使用者說明：
   - 我理解的需求（確認沒有誤解）
   - 受影響的檔案與模組
   - 具體改法與重構計畫
   - 可能的風險或副作用
   - 是否需要重啟服務、清除 session 等（參考「變更影響對照表」）
3. 使用者確認或調整後，才退出 Plan Mode 開始實作

### 可跳過 Plan Mode 的情況

- 明確的 bug fix（如「這個按鈕壞了」、「這個 API 回傳錯誤」）
- 使用者明確說「直接改」
- 純文字、設定檔、環境變數修改
- 使用者指示非常具體且範圍明確

**注意：跳過 Plan Mode ≠ 跳過 PM 流程。** Bug fix 仍需走 PM 完整流程（Issue → branch → 修復 → review → QA → deploy → evolve），只是不需要在動手前先做需求確認。

### 變更影響對照表

| 修改範圍 | 需要的動作 |
|----------|-----------|
| `scripts/` 下的檔案 | 重啟 rewrite-listener |
| `.env.local` | 重啟 dev server |
| `src/auth.ts` 或 auth 相關 | 線上需重新部署使 session 生效 |
| Vercel 環境變數 | 必須重新部署才生效 |
| DB migration | 套用 SQL + NOTIFY pgrst reload schema |
| `package.json` 依賴變更 | npm install + 重啟 dev server |
| CSS 佈局變更 | 需截圖驗證（PC 1440×900 + 手機 430×932） |
| 新增 API 端點 | 更新 `smoke-test.config.json` |
| 新增/修改頁面 | 更新 E2E 測試 |

## Skill 專案設定（供 /dev、/deploy、/review 讀取）

| 設定項 | 值 |
|--------|-----|
| 正式環境 URL | `https://howger-sport.com` |
| 本地開發 URL | `http://localhost:3000` |
| 部署方式 | PR rebase merge 到 main → `/deploy` 將 main merge 到 release → Vercel 從 release 自動部署 prod → QA 通過後 `gh issue close #N`。**禁止直接 push release**。 |
| 部署確認 | **自動**（QA 通過後直接部署，不需暫停詢問使用者） |
| Git Push 確認 | **自動**（安全掃描通過後直接 push，不需暫停詢問使用者） |
| 統一 QA 指令 | `./scripts/qa.sh <URL>`（串接 vitest + smoke + E2E） |
| 共用常數檔案 | `src/lib/constants.ts` |
| 跨服務介面 | `scripts/` ↔ `src/app/api/` 共用 DB schema（特別是 `rewrite_tasks` 表） |

## 強制開發流程

- 每次 commit 前必須執行統一 QA：`./scripts/qa.sh`，未通過不得 commit
- **部署後必須對正式環境執行統一 QA**：`./scripts/qa.sh https://howger-sport.com`

## E2E 測試

- 框架：Playwright（`npx playwright test`）
- 測試目錄：`e2e/`
- 執行：`./scripts/e2e-test.sh [BASE_URL]`
- 後台測試需設定環境變數：`E2E_USERNAME` + `E2E_PASSWORD`（未設定時腳本會主動詢問，不得自動跳過）

## 測試指令

- 執行測試：`npx vitest run`
- 監聽模式：`npx vitest`
- 測試檔案位置：`src/__tests__/`
- 測試命名規則：`src/__tests__/lib/<module>.test.ts`、`src/__tests__/components/<Component>.test.tsx`

## 資料庫（Supabase 特定）

- Migration 檔案位置：`supabase/migrations/`，編號遞增（如 `009_xxx.sql`）
- 套用 migration 方式：透過 Supabase Management API（`SUPABASE_ACCESS_TOKEN` 存於 `.env.local`）
  ```
  curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "<SQL>"}'
  ```
- **套用 migration 後必須重載 PostgREST schema cache**：
  ```
  curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query": "NOTIFY pgrst, '\''reload schema'\'';"}'
  ```

## 常駐服務管理

### rewrite-listener（Mac Mini 本機）

- 腳本位置：`scripts/rewrite-listener.ts`
- 執行方式：`nohup npx tsx scripts/rewrite-listener.ts > /tmp/rewrite-listener.log 2>&1 &`
- 功能：透過 Supabase Realtime 監聯 `rewrite_tasks` 表，收到 pending 任務後執行規劃（plan-generator）或產出（local-rewriter）
- **修改 `scripts/` 下任何檔案後，必須重啟 listener**：
  ```bash
  pkill -f "rewrite-listener"
  nohup npx tsx scripts/rewrite-listener.ts > /tmp/rewrite-listener.log 2>&1 &
  ```
- 檢查是否存活：`ps aux | grep rewrite-listener | grep -v grep`
- 檢查日誌：`cat /tmp/rewrite-listener.log`

### 跨服務介面一致性

- `scripts/` 下的 listener 與 `src/app/api/` 下的 API route 共用 DB schema，修改其中一邊的欄位名稱時，必須同步檢查另一邊
- 特別注意 `rewrite_tasks` 表：API 寫入的欄位（如 `metadata`）必須與 listener 讀取的欄位一致

## 技術棧

- Next.js App Router + TypeScript
- Supabase (PostgreSQL) - Project Ref: `fmakjkvkmbltqgyndijb`
- TanStack Query（server state 管理）
- nuqs（URL state 管理）
- Vitest + jsdom (測試)
- Tailwind CSS + shadcn/ui
- NextAuth.js (認證)

### Server State 管理原則

- **禁止**用 `useEffect + fetch + useState` 管理 server state，改用 TanStack Query 的 `useQuery`
- 篩選/排序/分頁狀態用 `nuqs` URL state（`useQueryState`），不用 `useState`
- 即時任務狀態用 `refetchInterval` conditional polling 或 Supabase Realtime
- 新增 Client Component 需要 fetch 資料時，必須用 `useQuery`，不可自寫 useEffect
- Mutation（POST/PUT/DELETE）用 `useMutation` + `invalidateQueries` 自動刷新

## API 數值契約

- ESPN API 百分比回傳為 **0-1 scale**（如 `winPercentage: 0.65`），前端顯示時才 ×100
- parse 函式回傳百分比必須明確標註 scale（變數名含 `Pct` = 0-1，含 `Percent` = 0-100）
- 關鍵數值欄位使用 `src/lib/espn/schemas.ts` 的 Zod schema 做 runtime 驗證

## 路由 URL

- 所有 `<Link href>` 和 URL 拼接**必須使用 `src/lib/routes.ts` 的 route helper**，禁止手動字串拼接
- 外部分享 URL（SEO/RSS/社群）使用 `absolute*Url()` helper

## 共用常數

新增常數統一放 `src/lib/constants.ts`，避免跨檔案重複定義。

## 發布邏輯

所有發布行為統一使用 `src/lib/publish-article.ts` 的 `publishArticle()` 函式，預設全頻道發布。
