# 超級運動資訊網 — 視覺 / UX / SEO 雙軌優化設計書

**日期**：2026-03-21
**狀態**：Draft
**策略**：雙軌並行 — SEO 立即推進 + 視覺改版同步設計

---

## 1. 背景與目標

### 現況

超級運動資訊網是一個以 AI 自動生成內容為核心的繁體中文運動新聞平台，具備即時比分、賠率、排名、文章個人化等功能。技術棧成熟（Next.js 16 + React 19 + Supabase + Tailwind 4 + shadcn/ui），但：

- 流量幾乎為零（尚未推廣）
- 視覺設計使用 shadcn/ui 預設風格，缺乏品牌辨識度
- 行動端響應式完整但缺乏原生感
- 已有「球場夜幕」設計方案文件但未實作，需要 mockup 驗證

### 目標使用者

以台灣一般運動迷為主，重度數據派（Fantasy/運彩）為輔。

### 成功標準

- Phase 1 後：SEO 基礎指標改善（Google Search Console 索引頁數、AI 搜尋引擎引用）
- Phase 2 後：確認視覺方向，產出可實作的設計規格
- Phase 3 後：品牌辨識度提升、行動端留存率改善

---

## 2. Phase 1：SEO 與內容發現（立即執行，1-2 週）

### 2.1 內部連結強化

**現況**：文章頁有「相關文章」區塊，但首頁和分類頁缺乏交叉連結。

**改法**：

- 文章內文自動連結到相關球隊頁 `/team/[sport]/[id]`、球員頁 `/player/[sport]/[id]`
- 分類頁側邊欄加「本週熱門」「同隊新聞」區塊
- 文章底部加「延伸閱讀」（同分類 + 跨分類各 2-3 篇）

**影響範圍**：
- `src/components/public/` — 新增 sidebar 元件
- `src/app/(public)/news/[slug]/page.tsx` — 延伸閱讀區塊
- 文章內文 markdown 處理邏輯 — 自動偵測球隊/球員名稱並加入連結

### 2.2 長尾關鍵字頁面

**現況**：只有大分類頁（NBA、MLB、足球、綜合）。

**改法**：

- 自動生成球隊專屬聚合頁（如 `/nba/lakers`），內容包括：
  - 該隊所有相關新聞
  - 即時戰績（從 standings 資料）
  - 近期賽程與賠率
- 這些頁面作為長尾 SEO 入口（「湖人最新消息」「勇士戰績」等搜尋詞）

**影響範圍**：
- 新增路由 `src/app/(public)/[sport]/[team]/page.tsx`
- 新增 API 或 query 聚合該隊相關文章
- `src/app/sitemap.ts` — 加入球隊頁

### 2.3 內容密度提升

**現況**：首頁一屏約 3-5 篇文章（Hero 1 大 + 2 小）。

**改法**：

- Hero 下方加一排「快訊」區塊
- 僅顯示標題，一行一則，展示 10 則
- 增加首頁關鍵字密度和點擊入口

**影響範圍**：
- 新增 `src/components/public/QuickNews.tsx`
- `src/app/(public)/page.tsx` — 插入快訊區塊於 Hero 與文章列表之間

### 2.4 搜尋引擎技術優化

| 項目 | 現況 | 改法 |
|------|------|------|
| `robots.txt` | 未確認是否允許 AI 爬蟲 | 明確允許 GPTBot、ClaudeBot、PerplexityBot |
| `llms.txt` | 不存在 | 新增，描述網站定位與內容結構 |
| 結構化資料 | 使用 `Article` schema | 升級為 `NewsArticle`（Google News 優先收錄） |

**影響範圍**：
- `public/robots.txt`
- 新增 `public/llms.txt`
- 文章頁 JSON-LD schema 修改

### 2.5 首屏空間優化

- Live Ticker 改為條件顯示：有進行中或即將開始的賽事時才顯示，無賽事時隱藏
- 釋放首屏空間給內容

**影響範圍**：
- `src/components/public/LiveScoreTicker.tsx` — 加入空狀態判斷

---

## 3. Phase 2：視覺改版 Mockup（同步進行，2-3 週）

### 3.1 三個視覺方向

使用 Pencil 設計工具產出首頁 mockup（PC 1440px + Mobile 430px），供使用者比較選擇。

#### 方向 1：「球場夜幕」進化版

- 延續 `docs/design/dark-sports-premium.md` 方案
- 深色底（#0f1419）+ 霓虹分類色（NBA 橙、MLB 綠、足球藍）
- 玻璃質感導航列（backdrop-blur）
- 卡片微光邊框（hover 時分類色發光）
- 定位：**專業運動媒體**（The Athletic 質感）

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
| 導航 | 底部 Tab Bar 取代頂部 scrollable tabs |
| 文章列表 | Infinite scroll 取代分頁按鈕 |
| 比分頁 | 左右滑動切換日期（手勢操作） |
| 觸控反饋 | 統一所有可點擊元素：press → scale 0.97 + opacity 0.8 |

### 4.3 頁面轉場與動畫

| 項目 | 技術方案 |
|------|----------|
| 頁面轉場 | Next.js View Transitions API（React 19 支援） |
| 文章列表 → 詳情 | Shared element transition（卡片圖片展開為 Hero） |
| 分類切換 | 淡入淡出 + stagger animation |
| 卡片進場 | IntersectionObserver + CSS stagger delay |
| 篩選重排 | Layout animation |
| 比分更新 | 數字翻牌動畫（flip animation） |
| Live 比分變化 | 背景短暫高亮（分類色 flash） |
| 下拉刷新 | Spring physics 彈性動畫 |
| Tab 切換 | Indicator slide animation |
| 骨架屏 | Skeleton 載入態取代空白 |

### 4.4 使用者留存機制

| 項目 | 說明 |
|------|------|
| PWA 推播通知 | 喜愛球隊開賽提醒、重大新聞推播 |
| 每日摘要 | 根據偏好自動組合當日重點 |
| 首次引導 | 選球隊 → 個人化首頁 |

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
| P0 | SEO 技術優化（robots.txt、llms.txt、NewsArticle schema） |
| P0 | 內部連結強化（文章互連、球隊聚合頁） |
| P1 | 首頁快訊區塊 |
| P1 | Live Ticker 條件顯示 |
| P1 | 骨架屏載入態 |

### Phase 2（同步，P0-P1）

| 優先級 | 項目 |
|--------|------|
| P0 | 3 個視覺方向 Mockup（Pencil 出圖） |
| P1 | 行動端底部 Tab Bar 原型 |
| P1 | 首次訪問引導流程設計 |

### Phase 3（確認後，P0-P2）

| 優先級 | 項目 |
|--------|------|
| P0 | 全站視覺改版 |
| P0 | 行動端 UX 重構 |
| P1 | 微動畫系統 |
| P1 | PWA 推播通知 |
| P2 | 文章內嵌比分卡、閱讀進度條、AI 快速摘要 |

---

## 6. 技術考量

### 動畫技術選型

- **不引入 Framer Motion / GSAP** — 使用 CSS animations + View Transitions API，保持 bundle 輕量
- IntersectionObserver 用於 scroll-triggered 動畫
- CSS `@starting-style` + `transition-behavior: allow-discrete` 用於進場動畫

### SEO 注意事項

- 球隊聚合頁需確保有足夠內容（至少 3 篇文章才生成頁面），避免 thin content
- `llms.txt` 需定期更新以反映網站結構變化
- NewsArticle schema 需包含 `datePublished`、`dateModified`、`author`、`publisher` 完整欄位

### 行動端相容性

- View Transitions API 在 Safari 17.5+ 支援，需 fallback（graceful degradation）
- Bottom Tab Bar 需處理 iOS safe area（`env(safe-area-inset-bottom)`）
- PWA 推播需 Service Worker + VAPID key 設定

---

## 7. 風險與緩解

| 風險 | 緩解策略 |
|------|----------|
| 球隊聚合頁文章不足 → thin content | 設門檻（≥3 篇才生成），不足的加 noindex |
| 視覺改版範圍過大 → 拖延 | 分批上線：先 Header + 色彩 → 再卡片 → 再動畫 |
| View Transitions 瀏覽器相容性 | Progressive enhancement，不支援時 fallback 為無動畫 |
| PWA 推播權限拒絕率高 | 延遲詢問（使用 3 次後才彈出），說明推播內容 |
| SEO 改動影響既有排名 | 漸進式推出，保留 canonical URL 不變 |
