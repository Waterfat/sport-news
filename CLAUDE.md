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
| 部署方式 | push main 自動部署（Vercel）；push hook 會自動提醒等待部署 + 跑 QA；未觸發時用 `/deploy manual` 手動部署 |
| 統一 QA 指令 | `./scripts/qa.sh <URL>`（串接 vitest + smoke + E2E） |
| 共用常數檔案 | `src/lib/constants.ts` |
| 跨服務介面 | `scripts/` ↔ `src/app/api/` 共用 DB schema（特別是 `rewrite_tasks` 表） |

## 強制開發流程

- 每次 commit 前必須執行統一 QA：`./scripts/qa.sh`，未通過不得 commit
- 新增/修改 `src/lib/*.ts` 或 `src/app/api/**/*.ts` → 必須同步新增/更新對應 unit test
- `/review` 重構完 → 執行 `/write-tests` 補齊測試覆蓋
- **部署後必須對正式環境執行統一 QA**：`./scripts/qa.sh https://howger-sport.com`
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

## CSS 佈局變更驗證 SOP

Vitest + jsdom 無法渲染 CSS，佈局問題只能靠視覺驗證。以下為強制流程：

### 觸發條件

修改以下任一項時，必須執行視覺驗證：
- `table-fixed` / 欄位寬度（`w-[Npx]`）
- flex / grid 容器屬性（`flex-wrap`、`gap`、`grid-cols`）
- `overflow`、`truncate`、`line-clamp` 等裁切行為
- 響應式斷點（`hidden sm:block`、`sm:hidden`）

### 驗證步驟

1. **先算再寫**：設定固定寬度前，先估算內容所需最小寬度（元素數 × 單個寬度 + gap），留 15-20% buffer
2. **PC 截圖**（1440×900）：確認所有欄位可見、按鈕不換行、文字不異常截斷
3. **手機截圖**（430×932）：確認 card layout 或響應式切換正常
4. **必須用 `browser_take_screenshot`**，不能只看 `browser_snapshot`（DOM 樹看不到換行、溢出）

### 常見陷阱

| 問題 | 原因 | 預防 |
|------|------|------|
| 按鈕換行 | `flex-wrap` + 容器寬度不足 | 計算最小寬度，移除不必要的 `flex-wrap` |
| 欄位被推出畫面 | `table-fixed` 固定欄位寬度總和過大 | 加總所有固定寬度，確認 < 表格寬度 |
| 文字截斷看不到 | `truncate` + 欄位太窄 | 用真實資料長度估算，不要用短字串測試 |

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

## iOS / In-App Browser 相容性

### 滾動穿透問題（Telegram、LINE 等 in-app browser）

**症狀**：iOS in-app browser 中滑動頁面時，文章內容會從瀏覽器網址列上方的透明狀態列區域穿透出來。

**根因**：in-app browser 的 WebView 會偷看 document 的滾動內容並顯示在透明的狀態列區域。`theme-color`、`safe-area-inset`、CSS 遮罩等方式對 Telegram WebView 均無效。

**解法 — App Shell 模式**：讓 document 本身不滾動，改用內部容器滾動：
```html
<div class="h-[100dvh] flex flex-col overflow-hidden">
  <header class="flex-shrink-0">...</header>
  <div class="flex-1 overflow-y-auto overscroll-contain">
    <main>...</main>
    <footer>...</footer>
  </div>
</div>
```
- 外層 `overflow-hidden` → document 不滾動 → WebView 無內容可穿透
- 內層 `overflow-y-auto` → 只有內部容器滾動
- `overscroll-contain` → 防止滾動穿透到外層

**注意**：此模式下不能使用 `sticky` header，header 直接是 flex 容器的固定區塊。

### 手機版水平導覽列 Scrollbar

**症狀**：手機版導覽列水平滾動時 scrollbar 壓在文字上。

**解法**：使用 `scrollbar-hide` utility class 隱藏 scrollbar，加 `pb-1` 留出底部間距：
```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

## 常駐服務管理

### rewrite-listener（Mac Mini 本機）

- 腳本位置：`scripts/rewrite-listener.ts`
- 執行方式：`nohup npx tsx scripts/rewrite-listener.ts > /tmp/rewrite-listener.log 2>&1 &`
- 功能：透過 Supabase Realtime 監聯 `rewrite_tasks` 表，收到 pending 任務後執行規劃（plan-generator）或產出（local-rewriter）
- **修改 `scripts/` 下任何檔案後，必須重啟 listener**：
  ```bash
  # 找到並終止舊進程
  pkill -f "rewrite-listener"
  # 啟動新進程
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
- Vitest + jsdom (測試)
- Tailwind CSS + shadcn/ui
- NextAuth.js (認證)

## 共用常數

新增常數統一放 `src/lib/constants.ts`，避免跨檔案重複定義。

## 發布邏輯

所有發布行為統一使用 `src/lib/publish-article.ts` 的 `publishArticle()` 函式，預設全頻道發布。
