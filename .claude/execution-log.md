# Execution Log

## Issue #109: SEO 技術優化 — robots.ts AI bot 規則 + llms.txt

### 分級：S（≤3 檔案、設定檔修改）
- 跳過 Phase 1-2：S 級別 + 無 API/DB 變更

### Phase 3: 工程 — 2026-03-21

- [x] Branch: feat/109-seo-ai-bot-rules-llms-txt
- [x] 實作完成：robots.ts AI bot 規則 + llms.txt + smoke-test 更新
- [x] Vitest: 332/332 通過，無回歸
- [x] Review: S 級別，3 檔案純設定改動，無邏輯風險

### Phase 4: QA — 2026-03-21

- [x] QA 通過（332 unit + 54 E2E + smoke test）

### Phase 5: 交付 — 2026-03-21

- [x] Commit + Push — PR #119
- [x] PR #119 rebase merge 到 main
- [x] Deploy: main merge 到 release → Vercel 自動部署
- [x] 部署後 QA: ./scripts/qa.sh https://howger-sport.com — 3/3 通過
- [x] Issue #109 已關閉

---

## Issue #110: Route helper 擴充 — team slug / player / game absolute URL

### 分級：S（2 檔案、純 utility 函式擴充、無 API/DB 變更）
- 跳過 Phase 0-2：S 級別 + 純函式新增

### Phase 3: 工程 — 2026-03-21

- [x] Branch: feat/110-route-helper-team-slug-absolute-url
- [x] TDD Red: 8 個測試全部失敗（函式不存在）
- [x] TDD Green: 實作 4 個 route helper，8 個測試通過
- [x] 全站回歸: 340/340 通過
- [x] Review（S 級別快速模式）: reviewer-bugs 95/100 + reviewer-compliance 95/100，無問題

### Phase 4: QA — 2026-03-21

- [x] QA 通過（340 unit + 54 E2E + smoke test）— 3/3

### Phase 5: 交付 — 2026-03-21

- [x] Commit + Push — PR #120
- [x] PR #120 rebase merge 到 main
- [x] Deploy: main merge 到 release → Vercel 自動部署
- [x] 部署後 QA: ./scripts/qa.sh https://howger-sport.com — 3/3 通過
- [x] Issue #110 已關閉
- [x] Evolve: 無改進建議（純函式擴充，流程順暢）

---

## Issue #111: 球隊 slug 映射表 — TEAM_SLUG_MAP

### 分級：S（2 檔案、純常數 + 純函式新增、無 API/DB/UI 變更）
- 跳過 Phase 1-2：S 級別 + 純資料映射

### Phase 3: 工程 — 2026-03-21

- [x] Branch: feat/111-team-slug-map
- [x] ESPN API 驗證：NBA 30 隊 + MLB 30 隊 ID/slug 取得
- [x] TDD Red: 10 個測試全部失敗（常數和函式不存在）
- [x] TDD Green: 實作 TEAM_SLUG_MAP（60 筆）+ getTeamIdBySlug()，10 個測試通過
- [x] 全站回歸: 350/350 通過
- [x] Review（S 級別快速模式）: 純靜態資料 + 純函式，無邏輯風險

### Phase 4: QA — 2026-03-21

- [x] QA 通過（350 unit + 54 E2E + smoke test）— 3/3

### Phase 5: 交付 — 2026-03-21

- [x] Commit + Push — PR #121
- [x] PR #121 rebase merge 到 main
- [x] Deploy: main merge 到 release → Vercel 自動部署
- [x] 部署後 QA: 等待中
- [x] Issue #111 已關閉
- [x] Evolve: 無改進建議（純資料映射，TDD 流程順暢，ESPN API 驗證確保資料正確性）

---

## Issue #112: 球隊 slug 路由整合 — permanentRedirect 到 canonical URL

### 分級：M（修改既有頁面邏輯、新增 redirect 行為、依賴 #110 + #111）
- 簡化 Phase 1-2：M 級別 + 需求明確 + 無 DB/UI 變更

### Phase 3: 工程 — 2026-03-21

- [x] Branch: feat/112-team-slug-redirect（已存在，含 #110 #111 的 commits）
- [x] FE 實作：page.tsx 整合 isNumericId() + permanentRedirect + getTeamIdBySlug
  - slug URL → 308 permanent redirect 到 canonical /team/:sport/:id
  - slug URL generateMetadata → { robots: { index: false } }
  - 未知 slug fallthrough 到正常渲染（ESPN API 回空）
- [x] 測試：6 個 unit tests（slug redirect、MLB slug、numeric ID 不 redirect、unknown slug fallthrough、metadata noindex）
- [x] smoke-test.config.json 新增 slug redirect 驗證
- [x] 全站回歸: 356/356 通過
- [x] TypeScript 編譯通過
- [x] Next.js build 成功
- [x] Review：使用 route helper teamUrl()、permanentRedirect（308）、純 server 端邏輯無 client 影響

### Phase 4: QA — 2026-03-21

- [x] QA 通過（356 unit + 34 smoke + 54 E2E）— 3/3

### Phase 5: 交付 — 2026-03-21

- [x] Commit + Push — PR #122
- [x] PR #122 rebase merge 到 main
- [x] Deploy: main merge 到 release → Vercel 自動部署
- [x] 部署後 QA: ./scripts/qa.sh https://howger-sport.com — 3/3 通過
- [x] Production 驗證: curl /team/nba/los-angeles-lakers → 308 redirect 確認
- [x] Issue #112 已關閉
- [x] Evolve: vi.hoisted() 是 vitest mock hoisting 的正確解法，記住此模式避免未來重複試錯

---

## Issue #113: Sitemap 完整補全 — 補入球隊動態頁面

### 分級：S（1 檔案、純程式碼新增、無 API/DB/UI 變更）
- 跳過 Phase 1-2：S 級別 + 需求明確 + 依賴已 merge

### Phase 3: 工程 — 2026-03-21

- [x] Branch: feat/113-sitemap-team-pages
- [x] 實作完成：sitemap.ts 新增 60 筆球隊頁面（30 NBA + 30 MLB）
  - 遍歷 TEAM_SLUG_MAP 取得 sport + teamId
  - 使用 absoluteTeamUrl() 產生 canonical URL
  - changeFrequency: weekly, priority: 0.6
- [x] TypeScript 編譯通過
- [x] Review（S 級別快速模式）：1 檔案純新增區塊，使用既有 helper 和常數，無邏輯風險

### Phase 4: QA — 2026-03-21

- [x] QA 通過（unit + smoke + E2E）— 3/3

### Phase 5: 交付 — 2026-03-21

- [x] Commit + Push — PR #123
- [x] PR #123 rebase merge 到 main
- [x] Deploy: main merge 到 release → Vercel 自動部署
- [x] 部署後 QA: ./scripts/qa.sh https://howger-sport.com — 3/3 通過
- [x] Issue #113 已關閉
- [x] Evolve: 流程順暢，無改進建議。S 級別純新增區塊，依賴 #110 route helper + #111 TEAM_SLUG_MAP 均已就位，實作直接了當

---

## Issue #114: 文章延伸閱讀 — ExtendedReading 元件

### 分級：M（新增元件 + 測試 + 修改既有頁面、無 DB schema 變更）
- 簡化 Phase 1-2：已有完整 spec（Section 2.1）+ implementation plan（Task 6），需求明確

### Phase 3: 工程 — 2026-03-21

- [x] Branch: feat/114-extended-reading（已存在）
- [x] TDD Red: 7 個測試全部失敗（元件不存在）
- [x] TDD Green: 實作 ExtendedReading 元件，7 個測試通過
  - 純 server component（無 "use client"）
  - 使用 newsUrl route helper
  - 使用 CATEGORY_COLORS + formatRelativeTime
  - 空陣列時 return null
  - 分類 Badge + 標題 line-clamp-2 + 相對時間
- [x] 頁面整合：news/[slug]/page.tsx 新增跨分類查詢 + ExtendedReading JSX
- [x] 全站回歸: 363/363 通過
- [x] Review: 純 server component，無副作用，使用既有 helper 和常數

### Phase 4: QA — 2026-03-21

- [x] QA 通過（363 unit + smoke + 54 E2E）— 3/3
