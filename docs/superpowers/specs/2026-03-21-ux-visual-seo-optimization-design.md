# 超級運動資訊網 — 視覺 / UX / SEO 雙軌優化設計書

**日期**：2026-03-21
**狀態**：Draft
**策略**：雙軌並行 — SEO 立即推進 + 視覺改版同步設計

---

## 1. 背景與目標

### 現況

超級運動資訊網是一個以 AI 自動生成內容為核心的繁體中文運動新聞平台，具備即時比分、賠率、排名、文章個人化等功能。技術棧成熟（Next.js 16 + React 19 + Supabase + Tailwind 4 + shadcn/ui），已有深色/淺色主題切換。但：

- 流量幾乎為零（尚未推廣）
- 視覺設計雖有深色主題，但整體仍以 shadcn/ui 預設風格為主，缺乏運動品牌辨識度
- 行動端響應式完整但缺乏原生感
- 已有「球場夜幕」設計方案文件（`docs/design/dark-sports-premium.md`，狀態：待實作）但需要與其他方向做 mockup 比較後再決定

### 與既有設計文件的關係

- **`docs/design/dark-sports-premium.md`**：完整的實作規格書，詳細到每個元件的 class 替換。本設計書的 Phase 2 方向 1 以此為基礎進化。若最終選擇方向 1，將以該文件為實作依據並補充本設計書新增的項目；若選擇其他方向，該文件標記為 archived。
- **`docs/design/competitor-analysis-2026-03.md`**：功能優先級矩陣。其中 P0 建議（排名頁進階數據、比分頁日期導覽、賽程表、球隊頁下一場比賽）屬於功能面改善，不在本設計書的視覺/UX/SEO 範疇內，將獨立開 issue 追蹤。

### 目標使用者

以台灣一般運動迷為主，重度數據派（Fantasy/運彩）為輔。

### 成功標準

- **Phase 1 後（30 天內）**：
  - Google Search Console 索引頁數從目前基線增加 50%+
  - 新增球隊聚合頁被 Google 收錄
  - `llms.txt` 上線，AI 爬蟲可存取
- **Phase 2 後**：確認視覺方向，產出 Pencil mockup（.pen 檔 + 匯出 PNG）供使用者選擇
- **Phase 3 後（上線 30 天內）**：
  - GA4 行動端 session duration 較改版前提升 20%+
  - GA4 bounce rate 降低 10%+

---

## 2. Phase 1：SEO 與內容發現（立即執行，1-2 週）

### 2.1 內部連結強化

**現況**：文章頁有「相關文章」區塊，但首頁和分類頁缺乏交叉連結。

**改法**：

- 分類頁側邊欄加「本週熱門」「同隊新聞」區塊
- 文章底部加「延伸閱讀」（同分類 + 跨分類各 2-3 篇）
- 文章內文自動連結到相關球隊頁 `/team/[sport]/[id]`、球員頁 `/player/[sport]/[id]`
  - 名稱比對資料來源：使用 ESPN API 的球隊/球員名稱清單（中英文），存於 `src/lib/constants.ts`
  - 消歧義：優先匹配文章所屬分類的聯盟，同名時不加連結
  - 已有 markdown 連結的文字不重複處理
  - 處理在 react-markdown 的 custom renderer 層級進行，不修改原始 markdown

**影響範圍**：
- `src/components/public/` — 新增 sidebar 元件
- `src/app/(public)/news/[slug]/page.tsx` — 延伸閱讀區塊
- react-markdown custom renderer — 自動連結邏輯

### 2.2 長尾關鍵字頁面（球隊聚合頁）

**現況**：只有大分類頁（NBA、MLB、足球、綜合），已有 `/team/[sport]/[id]` 頁面但使用 ESPN ID。

**改法**：

- 在既有 `/team/[sport]/[id]` 路由基礎上，新增 slug 別名路由 `src/app/(public)/team/[sport]/[slug]/page.tsx`
  - 例如 `/team/nba/lakers` → 解析為 ESPN ID `1610612747`
  - 建立 slug ↔ ESPN ID 映射表（存於 `src/lib/team-slugs.ts`）
  - slug 路由做 server-side redirect 到 canonical `/team/[sport]/[id]` URL
- 球隊頁內容聚合：該隊所有相關新聞 + 即時戰績 + 近期賽程與賠率
- 門檻：至少 3 篇相關文章才生成頁面，不足的加 `noindex`
- 新增 route helper 到 `src/lib/routes.ts`（`teamSlugUrl()`、`absoluteTeamSlugUrl()`）

**影響範圍**：
- 新增 `src/app/(public)/team/[sport]/[slug]/page.tsx`
- 新增 `src/lib/team-slugs.ts`
- 更新 `src/lib/routes.ts`
- 更新 `src/app/sitemap.ts` — 加入球隊 slug 頁

### 2.3 Sitemap 補全

**現況**：sitemap 缺少多個已存在的動態頁面（`/team/[sport]/[id]`、`/player/[sport]/[id]`、`/game/[sport]/[id]`）。

**改法**：
- 將所有已存在的動態路由加入 `src/app/sitemap.ts`
- 球隊頁、球員頁使用 weekly changefreq，priority 0.6
- 比賽頁使用 daily changefreq，priority 0.4

### 2.4 內容密度提升

**現況**：首頁一屏約 3-5 篇文章（Hero 1 大 + 2 小）。

**改法**：

- Hero 下方加一排「快訊」區塊
- 僅顯示標題，一行一則，展示 10 則
- 增加首頁關鍵字密度和點擊入口

**注意**：Phase 3 視覺改版時，此區塊的樣式會隨整體風格調整，但功能和位置不變。

**影響範圍**：
- 新增 `src/components/public/QuickNews.tsx`
- `src/app/(public)/page.tsx` — 插入快訊區塊於 Hero 與文章列表之間

### 2.5 搜尋引擎技術優化

| 項目 | 現況 | 改法 |
|------|------|------|
| `robots.txt` | `src/app/robots.ts` 已存在，`userAgent: "*", allow: "/"` 允許所有爬蟲 | 新增明確的 AI 爬蟲規則（GPTBot、ClaudeBot、PerplexityBot），確保不被未來的預設封鎖影響 |
| `llms.txt` | 不存在 | 新增 `public/llms.txt`，描述網站定位與內容結構 |
| 結構化資料 | 文章頁已使用 `NewsArticle` schema | ✅ 已完成，無需修改。確認欄位完整性（`datePublished`、`dateModified`、`author`、`publisher`） |

**影響範圍**：
- `src/app/robots.ts` — 新增 AI bot 規則
- 新增 `public/llms.txt`

### 2.6 首屏空間優化

- Live Ticker 改為條件顯示：有進行中或即將開始的賽事時才顯示，無賽事時隱藏
- 釋放首屏空間給內容
- Phase 3 改版時樣式會更新，但條件顯示邏輯保留

**影響範圍**：
- `src/components/public/LiveScoreTicker.tsx` — 加入空狀態判斷

### 2.7 骨架屏載入態

- 為文章列表、側邊欄等元件加入 Skeleton 載入態
- 此為 Phase 1 即可上線的體驗改善，Phase 3 改版時 Skeleton 的樣式隨主題更新

**影響範圍**：
- 新增 Skeleton 元件（shadcn/ui 已內建）
- 文章列表、側邊欄載入態

---

## 3. Phase 2：視覺改版 Mockup（同步進行，2-3 週）

### 3.1 三個視覺方向

使用 Pencil 設計工具產出首頁 mockup（PC 1440px + Mobile 430px）。

**交付物**：每個方向產出 `.pen` 設計檔 + 匯出 PNG 截圖，由使用者比較後選擇方向或混搭元素。

#### 方向 1：「球場夜幕」進化版

- 以 `docs/design/dark-sports-premium.md` 為基礎進化
- 深色底（#0f1419）+ 霓虹分類色（NBA 橙、MLB 綠、足球藍、綜合紫）
- 玻璃質感導航列（backdrop-blur）
- 卡片微光邊框（hover 時分類色發光）
- 定位：**專業運動媒體**（The Athletic 質感）
- 若選此方向：以既有規格書為實作基礎，補充本設計書新增項目

#### 方向 2：「乾淨明亮」

- Apple News / The Verge 風格
- 大量留白、大字標題、高對比
- 明亮底色 + 單一強調色（品牌橙或品牌藍）
- 圖片為主的卡片佈局
- 定位：**大眾化、易讀性優先**

#### 方向 3：「數據運動風」

- ESPN / FiveThirtyEight 風格
- 比分、數據、圖表與新聞並列
- 分欄密集佈局、即時更新感
- 深色 + 螢光綠/橙做強調
- 定位：**數據派球迷**，強調即時性與專業感

### 3.2 行動端導航原型

- 設計底部 Tab Bar 原型（首頁 / 比分 / 分類 / 我的）
- 與現有頂部 scrollable tabs 做 A/B 比較
- Tab Bar 僅限行動端（< 640px），桌面端維持現有頂部導航
- 考慮 iOS safe area：底部留 `env(safe-area-inset-bottom)` 空間
- 整合到既有 `h-[100dvh] flex flex-col` App Shell：Tab Bar 作為 flex-col 的最後一個子元素

### 3.3 首次訪問引導流程

- 新使用者引導流程設計（選喜愛球隊 → 個人化首頁）
- 輕量級，3 步以內完成

---

## 4. Phase 3：改版實作（方向確認後，3-4 週）

### 4.1 全站視覺改版

依 Phase 2 選定的方向，實作：

- 色彩系統（CSS variables / Tailwind theme）
- 元件樣式更新（Card、Badge、Button、Header、Footer）
- 頁面佈局調整

### 4.2 行動端 UX 重構

| 項目 | 改法 |
|------|------|
| 導航 | 底部 Tab Bar 取代頂部 scrollable tabs（僅行動端） |
| 文章列表 | 「載入更多」按鈕 + URL 分頁參數（保留 SEO 可爬取性，不用 infinite scroll） |
| 比分頁 | 左右滑動切換日期（手勢操作） |
| 觸控反饋 | 統一所有可點擊元素：press → scale 0.97 + opacity 0.8 |

### 4.3 頁面轉場與動畫

分為兩批實作，降低風險：

**第一批（隨視覺改版一起上）**：
| 項目 | 技術方案 |
|------|----------|
| 卡片進場 | IntersectionObserver + CSS stagger delay |
| 分類切換 | 淡入淡出 + stagger animation |
| 篩選重排 | CSS layout animation |
| Tab 切換 | Indicator slide animation（CSS transition） |
| 骨架屏樣式更新 | 配合新主題的 Skeleton 色彩 |

**第二批（第一批穩定後再加）**：
| 項目 | 技術方案 | 備註 |
|------|----------|------|
| 頁面轉場 | Next.js View Transitions API | 實驗性功能，需驗證 Next.js 16 支援度 |
| 文章列表 → 詳情 | Shared element transition | 高複雜度，App Router RSC 下需 POC |
| 比分更新 | 數字翻牌動畫（flip animation） | CSS only |
| Live 比分變化 | 背景短暫高亮（分類色 flash） | CSS only |
| 下拉刷新 | Spring physics 彈性動畫 | CSS only |

### 4.4 使用者留存機制

| 項目 | 說明 | 複雜度 |
|------|------|--------|
| 首次引導 | 選球隊 → 個人化首頁 | 低（前端 only） |
| 每日摘要 | 根據偏好自動組合當日重點 | 中（需 API） |
| PWA 推播通知 | 喜愛球隊開賽提醒、重大新聞推播 | 高（需後端推播服務、DB schema 變更、Service Worker、VAPID key；iOS 需使用者先安裝 PWA） |

PWA 推播獨立為一個 issue，不阻擋其他 Phase 3 項目。

### 4.5 內容消費體驗

| 項目 | 說明 |
|------|------|
| 閱讀進度條 | 文章頁頂部顯示閱讀進度 |
| 內嵌比分卡 | 文章提到某場比賽時，自動嵌入即時比分 |
| AI 快速摘要 | 文章開頭 3 句話重點（AI 生成） |

---

## 5. 優先級總覽

### Phase 1（立即，P0-P1）

| 優先級 | 項目 |
|--------|------|
| P0 | SEO 技術優化（robots.ts AI bot 規則、llms.txt） |
| P0 | Sitemap 補全（既有動態頁面 + 球隊聚合頁） |
| P0 | 內部連結強化（文章互連、延伸閱讀） |
| P0 | 球隊聚合頁（slug 路由 + route helper） |
| P1 | 首頁快訊區塊 |
| P1 | Live Ticker 條件顯示 |
| P1 | 骨架屏載入態 |

### Phase 2（同步，P0-P1）

| 優先級 | 項目 |
|--------|------|
| P0 | 3 個視覺方向 Mockup（Pencil 出圖 + PNG 匯出） |
| P1 | 行動端底部 Tab Bar 原型 |
| P1 | 首次訪問引導流程設計 |

### Phase 3（確認後，P0-P2）

| 優先級 | 項目 |
|--------|------|
| P0 | 全站視覺改版（色彩 + 元件 + 佈局） |
| P0 | 行動端 UX 重構（Tab Bar + 載入更多 + 手勢） |
| P1 | 第一批動畫（卡片進場、分類切換、篩選重排） |
| P1 | 首次引導流程實作 |
| P2 | 第二批動畫（View Transitions、比分翻牌） |
| P2 | PWA 推播通知（獨立 issue） |
| P2 | 文章內嵌比分卡、閱讀進度條、AI 快速摘要 |

---

## 6. 技術考量

### 動畫技術選型

- **不引入 Framer Motion / GSAP** — 使用 CSS animations + View Transitions API，保持 bundle 輕量
- IntersectionObserver 用於 scroll-triggered 動畫
- CSS `@starting-style` + `transition-behavior: allow-discrete` 用於進場動畫
- View Transitions 為第二批，需先做 POC 驗證 Next.js 16 + App Router 支援度

### SEO 注意事項

- 球隊聚合頁需確保有足夠內容（至少 3 篇文章才生成頁面），避免 thin content
- `llms.txt` 需定期更新以反映網站結構變化
- 文章列表使用「載入更多」按鈕 + URL 分頁參數（`?page=2`），確保搜尋引擎可爬取所有分頁內容（不用 infinite scroll）
- slug 路由做 301 redirect 到 canonical URL，避免重複內容

### 行動端相容性

- View Transitions API 在 Safari 17.5+ 支援，需 fallback（graceful degradation，不支援時無動畫）
- Bottom Tab Bar 需處理 iOS safe area（`env(safe-area-inset-bottom)`），僅行動端顯示
- PWA 推播在 iOS Safari 需使用者先將 PWA 加到主畫面才能收推播

### Phase 間的關係

- Phase 1 的 UI 改動（快訊區塊、骨架屏、Live Ticker 條件顯示）在 Phase 3 改版時**保留功能邏輯，更新樣式**
- Phase 1 不做視覺風格改動，僅做功能性 UI 新增
- Phase 3 開始前，Phase 1 的所有項目應已上線並穩定

---

## 7. 測試策略

每個 Phase 的新增/修改項目都需要對應的測試：

| 項目 | 測試方式 |
|------|----------|
| 球隊聚合頁 | E2E 測試（頁面渲染、slug redirect）+ smoke test |
| 快訊區塊 | 元件測試（資料載入、空狀態） |
| Live Ticker 條件顯示 | 元件測試（有/無賽事兩種狀態） |
| 骨架屏 | 視覺驗證（截圖比對） |
| 視覺改版 | CSS 佈局變更 → PC 1440×900 + Mobile 430×932 截圖驗證 |
| Tab Bar | E2E 測試（行動端導航流程） |
| 動畫 | 手動驗證 + 效能測試（FPS 不低於 60） |
| sitemap | 自動化驗證（URL 可存取性） |

新增 API 端點時更新 `smoke-test.config.json`。

---

## 8. 風險與緩解

| 風險 | 緩解策略 |
|------|----------|
| 球隊聚合頁文章不足 → thin content | 設門檻（≥3 篇才生成），不足的加 noindex |
| slug 路由與既有路由衝突 | slug 路由放在 `/team/[sport]/[slug]` 下，不使用頂層 `[sport]` 避免衝突 |
| 視覺改版範圍過大 → 拖延 | 分批上線：先色彩系統 + Header → 再卡片 → 再動畫 |
| View Transitions 瀏覽器相容性 | 列為第二批，先做 POC；不支援時 graceful degradation |
| PWA 推播技術複雜度高 | 獨立 issue，不阻擋其他 Phase 3 項目 |
| SEO 改動影響既有排名 | 漸進式推出，保留 canonical URL 不變 |
| Phase 1 UI 改動被 Phase 3 覆蓋造成浪費 | Phase 1 僅做功能性改動，不涉及視覺風格 |
