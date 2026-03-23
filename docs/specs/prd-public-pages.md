# PRD: 公開頁面模組（Public Pages）

## 1. 產品願景

提供一個面向一般讀者的運動新聞閱讀平台，涵蓋首頁、文章詳情、分類瀏覽、搜尋、作者頁面及 RSS 訂閱等功能。目標是讓讀者能以最快速度獲取最新運動新聞，同時透過個人化推薦、即時比分、排名等輔助資訊提升黏著度。

### 解決的核心問題

- **資訊取得效率**：讀者需要在單一平台快速掌握多聯賽的最新動態
- **內容探索**：透過分類、搜尋、相關推薦等機制，協助讀者發現更多感興趣的內容
- **社群傳播**：內建分享功能與 SEO 優化，降低內容傳播門檻
- **跨裝置體驗**：RWD 設計確保行動裝置與桌機均有良好閱讀體驗

## 2. 目標用戶

### 主要受眾

| 角色 | 使用頻率 | 需求 |
|------|---------|------|
| **一般讀者**（匿名訪客） | 每日多次 | 快速瀏覽最新運動新聞、搜尋特定話題 |
| **登入會員** | 每日多次 | 享受個人化推薦（關注球隊優先排序）、按讚/收藏 |
| **RSS 訂閱者** | 被動接收 | 透過 RSS 閱讀器追蹤最新文章 |
| **社群分享者** | 不定期 | 將感興趣的文章分享到 LINE/Telegram/X |

### 設計策略傾向

新聞媒體風格 -- 以內容密度優先，首頁採用 Hero + 快訊 + 文章列表的多層次資訊架構，確保讀者在一屏內獲得最大量的有價值資訊。

## 3. 核心使用場景

| # | 場景 | 使用者行為 | 期望結果 |
|---|------|-----------|---------|
| 1 | 首頁瀏覽最新新聞 | 打開首頁 | 看到 Hero 焦點新聞 + 快訊列 + 最新報導列表，即時比分 Ticker 滾動顯示 |
| 2 | 依分類瀏覽 | 點擊 Header 的 NBA/MLB/足球/綜合 | 進入分類頁，可排序（最新/最熱門）、分頁瀏覽 |
| 3 | 搜尋文章 | 從 Header 搜尋欄或搜尋頁輸入關鍵字 | 顯示標題或內容包含關鍵字的文章列表（最多 20 筆） |
| 4 | 閱讀文章 | 點擊任一文章卡片 | 進入文章詳情頁，顯示完整 Markdown 內容、圖片、作者資訊 |
| 5 | 互動（按讚/反應） | 在文章底部點擊愛心或表情反應 | 即時顯示按讚計數/反應狀態變更 |
| 6 | 分享文章 | 點擊分享按鈕（複製連結/LINE/Telegram/X） | 一鍵分享到指定平台或複製連結到剪貼簿 |
| 7 | 查看作者文章 | 點擊文章中的作者名稱 | 進入作者頁面，看到作者資訊與所有文章列表 |
| 8 | 查看即時比分 | 在首頁查看 Ticker 或點「查看全部」 | 即時比分卡片每 60 秒自動更新 |
| 9 | 查看排名/賠率 | 在首頁側邊欄（桌機）或下方（手機）查看 | 顯示 NBA 前五名排名與今日賽事 |
| 10 | 首頁分類篩選 | 點擊「最新報導」區的分類 Tab（全部/NBA/MLB/足球/綜合） | 文章列表即時篩選，URL 同步更新（nuqs） |
| 11 | 個人化排序 | 登入會員且有關注球隊 | 首頁文章列表中，與關注球隊相關的文章優先顯示，標記星號 |
| 12 | RSS 訂閱 | RSS 閱讀器訂閱 /rss.xml | 獲取最新 50 篇已發布文章的 feed |
| 13 | 延伸閱讀 | 讀完文章後向下捲動 | 看到同分類相關報導 + 跨分類延伸閱讀推薦 |
| 14 | 投稿申請 | 點擊側邊欄「我要投稿」 | 彈出投稿 Modal 填寫申請資訊 |

## 4. 功能範圍

### 4.1 頁面總覽

| 路由 | 頁面 | 渲染方式 | Revalidate | 說明 |
|------|------|---------|------------|------|
| `/` | 首頁 | SSR (Server Component) | 60s | 焦點新聞 + 快訊 + 文章列表 + 側邊欄 |
| `/news/[slug]` | 文章詳情頁 | SSR (Server Component) | 60s | Markdown 渲染 + SEO + JSON-LD |
| `/category/[slug]` | 分類頁 | SSR (Server Component) | 60s | 分頁 + 排序 + 側邊欄 |
| `/writer/[id]` | 作者頁 | SSR (Server Component) | 預設 | 作者資訊 + 文章列表 |
| `/search` | 搜尋頁 | SSR (Server Component) | 無快取 | 關鍵字搜尋 |
| `/rss.xml` | RSS Feed | Route Handler | Cache 3600s | RSS 2.0 XML |

### 4.2 公共 Layout

**檔案**: `src/app/(public)/layout.tsx`

| 元素 | 說明 |
|------|------|
| **PublicHeader** | 固定頂部：Logo（滾動時自動收合）+ 搜尋 + 深色模式切換 + 導航列 |
| **PullToRefresh** | 行動裝置下拉重新整理 |
| **PageTracker** | 頁面瀏覽追蹤 |
| **Footer** | 連結列（賽事/分類/更多）+ Telegram 頻道 CTA + 版權宣告 |

Header 導航項目：首頁、即時比分、NBA、MLB、足球、綜合、排名、賠率

### 4.3 首頁（`/`）

從 `generated_articles` 取最新 33 篇已發布文章，依區塊分配：

| 區塊 | 文章範圍 | 元件 | 說明 |
|------|---------|------|------|
| **即時比分 Ticker** | -- | `LiveScoreTicker` | 橫向滾動比分卡片，60 秒 polling 更新，依 `scoreboard_configs` 啟用的聯賽 |
| **Hero 區** | 第 1~3 篇 | `HeroSection` | 1 大 + 2 小佈局。桌機 2/3 + 1/3 grid，手機全寬 + 2 col grid |
| **快訊列** | 第 4~13 篇 | `QuickNews` | 取前 5 篇顯示，5 欄 grid（桌機），純標題 + 時間 |
| **最新報導** | 第 14~33 篇 | `HomeArticleSection` | 含分類 Tab 篩選（nuqs URL state）+ `PersonalizedArticleGrid` |
| **側邊欄**（桌機） | -- | `TrendingArticles`, `QuickStandings`, `QuickOdds`, `SubmissionCTA` | 300px 固定寬，sticky 定位 |
| **排名/賽事**（手機） | -- | `QuickStandings`, `QuickOdds` | 文章區下方 1~2 col grid |

#### LiveScoreTicker

- 資料來源：`/api/public/scoreboard?league={key}`
- 更新頻率：`SCOREBOARD_POLLING_MS`（60 秒）
- 排序規則：進行中 > 未開始 > 已結束
- 無賽事時不渲染

#### HeroSection

- 桌機佈局：左 2/3 主焦點（min-h 320px），右 1/3 兩篇副焦點堆疊
- 手機佈局：主焦點全寬（min-h 200px）+ 2 col grid 副焦點
- 顯示元素：分類標籤、標題、摘要（主焦點限 200 字元）、作者、相對時間
- 互動：hover 圖片放大 1.05x、標題變色

#### QuickNews

- 取前 5 篇，5 欄 grid（桌機 lg:grid-cols-5，平板 sm:grid-cols-3，手機 grid-cols-2）
- 每張卡片：標題（line-clamp-3）+ 相對時間
- hover 效果：邊框高亮 + 上浮 0.5px + 點擊縮放

#### HomeArticleSection

- **分類篩選**（`HomeCategoryFilter`）：全部 / NBA / MLB / 足球 / 綜合
- 篩選狀態同步 URL query param `category`（透過 nuqs）
- 切換時 150ms opacity 過渡動畫
- 當篩選結果少於 4 篇，底部顯示「查看更多 X 文章」連結至分類頁

#### PersonalizedArticleGrid

- 第一篇為 Featured 大卡（圖文左右佈局），其餘 2 col grid
- **個人化排序**：登入會員的關注球隊文章優先排列，並標示星號
- 每張卡片含：分類標籤、時間、標題（line-clamp-2）、摘要（line-clamp-2/3）、作者名
- 卡片入場動畫：`animate-fade-in-up`，每張延遲 50ms（最多 9 張）

#### TrendingArticles（側邊欄）

- 資料來源：`/api/public/articles/trending`
- staleTime: 10 分鐘
- 顯示排名序號（1~5），前三名顯示金/銀/銅色
- 每項含：標題（line-clamp-2）+ 分類

#### QuickStandings（側邊欄/手機下方）

- 固定顯示 NBA 前 5 名
- 資料來源：`/api/public/standings?league=nba`
- staleTime: 10 分鐘
- 表格欄位：排名、球隊（含 logo + 中文名）、勝、負

#### QuickOdds（側邊欄/手機下方）

- 固定顯示 NBA 今日賽事前 3 場（優先未結束賽事）
- 資料來源：`/api/public/scoreboard?league=nba`
- polling 間隔：60 秒
- 顯示：狀態（LIVE/時間/終場）、主客隊比分、大小分（O/U）

#### SubmissionCTA（側邊欄）

- 投稿入口，點擊「立即申請」開啟 `SubmissionModal`
- Modal 為表單形式的投稿申請

### 4.4 文章詳情頁（`/news/[slug]`）

**路由解析**：先以 slug 查詢，查無結果 fallback 以 id 查詢。兩者均無 → 404。

#### SEO / Metadata

- `<title>`: `{文章標題} - 好球研究所`
- Open Graph: type=article, publishedTime, authors, images（OG Image API 動態生成）
- Twitter Card: summary_large_image
- Canonical URL: `https://howger-sport.com/news/{slug}`
- JSON-LD: NewsArticle schema（headline, datePublished, author, publisher, articleSection）

#### 頁面結構（由上而下）

| 區塊 | 元件/邏輯 | 說明 |
|------|----------|------|
| Breadcrumb | 原生 nav | 首頁 / 分類 / 文章標題（truncate 200px） |
| Header | 原生 header | 分類標籤 + 標題（h1, 3xl~4xl）+ 作者連結 + 發布日期（完整 + 相對時間） |
| 分享按鈕（頂部） | `ShareButtons` | 複製連結 / LINE / Telegram / X |
| 配圖 | img | 首張圖片，max-h 480px，object-cover |
| 文章目錄 | `TableOfContents` | 內容超過 1500 字元且有 2+ 標題時顯示。手機摺疊式，桌機浮動側邊 |
| 文章內容 | `ArticleContent` | react-markdown + remark-gfm 渲染。支援 YouTube/Twitter 嵌入、auto-link |
| 表情反應 | `ReactionButtons` | 4 種反應（愛心/精彩/驚訝/傷心），localStorage 存儲 |
| 按讚 | `LikeButton` | 後端 API 計數，optimistic update |
| 分享按鈕（底部） | `ShareButtons` | 同頂部 |
| Telegram CTA | `TelegramArticleCTA` | 引導加入 Telegram 頻道 |
| 作者卡片 | 內嵌區塊 | Avatar（姓名第二字/首字）+ 姓名連結 + 簡介 |
| 相關報導 | 內嵌 section | 同分類最新 4 篇，2 col grid |
| 延伸閱讀 | `ExtendedReading` | 同分類前 3 篇 + 跨分類 3 篇，2 col grid |

#### ViewTracker

- Client Component，mount 時 POST `/api/public/articles/{slug}/view`
- 用於累計文章瀏覽次數

#### ArticleContent

- 基於 `react-markdown` + `remark-gfm`
- 自訂渲染元件覆蓋：h1~h4（含 scroll-mt-20 錨點）、p、a、img、blockquote、ul/ol/li、table、code/pre、hr、strong
- **特殊連結處理**：
  - YouTube URL → 自動嵌入 iframe（aspect-video）
  - Twitter/X URL → 特殊樣式連結按鈕
  - 一般外部連結 → 新視窗開啟
- **Auto-link**：透過 `autoLinkChildren` 對文章內容中的球隊/球員名稱自動加上站內連結

#### ShareButtons

- 4 種分享方式：複製連結（clipboard API + fallback）、LINE、Telegram、X
- 複製成功後按鈕變為綠色「已複製」狀態，2 秒後恢復

#### ReactionButtons

- 4 種反應：愛心、精彩、驚訝、傷心
- 狀態存儲：完全基於 localStorage（無後端 API）
- 每種反應可獨立 toggle on/off
- 選中時邊框/背景變藍 + 放大 1.05x

#### LikeButton

- 後端 API：GET `/api/public/likes?article_id={id}` 取得計數 + 是否已按讚
- 後端 API：POST `/api/public/likes` 切換按讚狀態
- Optimistic update：點擊後立即更新 UI，不等 API 回應

### 4.5 分類頁（`/category/[slug]`）

**支援分類 slug**：nba, mlb, soccer, general

**slug 對應**：
| Slug | DB 值 | 顯示名稱 |
|------|-------|---------|
| nba | NBA | NBA |
| mlb | 棒球 | MLB |
| soccer | 足球 | 足球 |
| general | 綜合 | 綜合 |

**敬請期待分類**：soccer, general -- 顯示「敬請期待」頁面 + 回首頁按鈕

#### 頁面結構

| 區塊 | 說明 |
|------|------|
| Banner | 分類背景圖 + overlay + 分類標籤 + 標題 + 文章總數 |
| Breadcrumb | 首頁 / 分類名稱 |
| 排序切換 | 最新 / 最熱門（tab 樣式），切換時重設頁碼為 1 |
| 文章列表 | 每頁 20 篇，卡片含：標題、摘要、作者、時間（熱門模式含瀏覽次數） |
| 分頁器 | 上一頁/下一頁 + 頁碼按鈕（超過 5 頁顯示省略號） |
| 側邊欄 | `CategorySidebar`（本週熱門 + 我的球隊新聞 + 投稿 CTA） |

#### CategorySidebar

- **本週熱門**（`WeeklyTrending`）：`/api/public/articles/trending?category={}&period=week&limit=5`
- **我的球隊新聞**（`RelatedByTeam`）：僅登入會員可見，篩選標題包含關注球隊名稱的文章
- **投稿 CTA**：同首頁側邊欄

#### 分頁邏輯

- URL query params：`page`（頁碼）、`sort`（latest/popular）
- 每頁 20 筆（`ITEMS_PER_PAGE`）
- 分頁器：當前頁前後各 2 頁 + 首頁/末頁，中間省略號
- 排序欄位：`published_at`（最新）或 `view_count`（最熱門），皆降序

### 4.6 搜尋頁（`/search`）

| 項目 | 說明 |
|------|------|
| 進入方式 | Header 搜尋欄 / 直接訪問 `/search` / URL query `?q=keyword` |
| 搜尋邏輯 | `title ILIKE '%keyword%' OR content ILIKE '%keyword%'`，特殊字元 escape |
| 結果上限 | 20 筆 |
| 排序 | `published_at` 降序 |
| 結果卡片 | 分類標籤 + 相對時間 + 標題（line-clamp-2）+ 縮圖 |
| 空結果 | 「找不到包含『{keyword}』的文章」+ 回首頁連結 |
| SearchInput | 支援 Enter 送出（form submit），autofocus |

#### 搜尋 API（`/api/public/search`）

- Method: GET
- Query param: `q`
- 回傳欄位：id, title, slug, category, published_at, images
- 結果上限：10 筆（API 端）
- 空 query 回傳空陣列

### 4.7 作者頁（`/writer/[id]`）

| 項目 | 說明 |
|------|------|
| 資料來源 | `writer_personas` 表 |
| 不存在時 | 404 notFound() |
| 作者資訊 | Avatar（姓名第二字/首字）+ 姓名 + 簡介 + 文章總數 |
| 文章列表 | 該作者所有已發布文章，按 `published_at` 降序 |
| 卡片元素 | 分類標籤 + 日期 + 標題 + 摘要（前 160 字元）+ 發布日期 |

### 4.8 RSS Feed（`/rss.xml`）

| 項目 | 說明 |
|------|------|
| 格式 | RSS 2.0 + Atom self link |
| 文章數 | 最新 50 篇已發布文章 |
| Item 欄位 | title（CDATA）, link, guid（permalink）, description（前 300 字元）, category, pubDate |
| Cache | `Cache-Control: public, max-age=3600, s-maxage=3600` |
| Content-Type | `application/rss+xml; charset=utf-8` |

### 4.9 文章列表 API（`/api/public/articles`）

| 項目 | 說明 |
|------|------|
| Method | GET |
| Query Params | `page`（預設 1）, `limit`（預設值由 parsePagination 決定，上限 100）, `category`, `writer_id` |
| 回傳格式 | `{ articles, total, page, limit }` |
| 排序 | `published_at` 降序 |
| 篩選 | 僅 `status = published`，可選 category / writer_id |

## 5. 非功能需求

### 5.1 效能

| 項目 | 要求 |
|------|------|
| 頁面 ISR 快取 | 首頁/文章頁/分類頁 60 秒 revalidate |
| LiveScoreTicker polling | 60 秒間隔（`SCOREBOARD_POLLING_MS`） |
| TrendingArticles staleTime | 10 分鐘 |
| QuickStandings staleTime | 10 分鐘 |
| QuickOdds staleTime / polling | 5 分鐘 staleTime + 60 秒 refetchInterval |
| RSS 快取 | 1 小時 |
| 圖片載入 | 文章內圖片 `loading="lazy"`，Hero 圖片直接載入 |

### 5.2 SEO

| 項目 | 實作方式 |
|------|---------|
| Metadata | 每頁動態 generateMetadata |
| Open Graph | 文章頁含 article type + publishedTime + authors |
| Twitter Card | summary_large_image |
| JSON-LD | NewsArticle schema（文章頁） |
| Canonical URL | 文章頁設定 `alternates.canonical` |
| RSS | 自動發現 link |

### 5.3 響應式設計

| 斷點 | 佈局差異 |
|------|---------|
| 手機（< 640px） | Hero 全寬堆疊、QuickNews 2 col、無側邊欄（排名/賽事移到文章區下方）、Header Nav 橫向滾動 |
| 平板（640px~1024px） | Hero grid、QuickNews 3 col、分類頁 2 col 側邊欄可能折疊 |
| 桌機（>= 1024px） | Hero 2/3+1/3 grid、QuickNews 5 col、300px sticky 側邊欄 |

### 5.4 Header 行為

- Logo 區隨滾動自動收合/展開（delta 閾值 + cooldown 防抖）
- 搜尋欄 toggle 式展開
- 深色模式切換（next-themes）
- 導航列 active 狀態以 `border-bottom` 標示
- 手機端導航列橫向滾動 + 右側漸層遮罩

### 5.5 行動裝置特殊處理

- `PullToRefresh`：下拉重新整理
- 安全區域：`pt-[env(safe-area-inset-top)]`
- 最小觸控區域：nav link `min-h-[44px]`
- 互動反饋：`active:scale-[0.97~0.99]` 按壓縮放

## 6. 資料模型依賴

### 6.1 主要資料表

| 表 | 公開頁面用途 |
|---|-------------|
| `generated_articles` | 所有文章內容來源。篩選 `status = 'published'` |
| `writer_personas` | 作者資訊（name, description）。透過 foreign key join |
| `scoreboard_configs` | 首頁 LiveScoreTicker 的啟用聯賽設定 |

### 6.2 關鍵欄位

`generated_articles` 在公開頁面使用的欄位：

| 欄位 | 類型 | 用途 |
|------|------|------|
| id | UUID | 主鍵，文章 fallback URL |
| title | text | 文章標題 |
| content | text | Markdown 文章內容 |
| slug | text | SEO 友善 URL |
| category | text | 分類（NBA / 棒球 / 足球 / 綜合） |
| status | text | 發布狀態（僅查詢 published） |
| published_at | timestamp | 發布時間（排序/顯示用） |
| view_count | integer | 瀏覽次數 |
| images | jsonb | 文章圖片陣列 `[{ url: string }]` |
| writer_persona_id | UUID | 外鍵關聯 writer_personas |

## 7. 元件清單

### Server Components

| 元件/頁面 | 檔案路徑 |
|----------|---------|
| HomePage | `src/app/(public)/page.tsx` |
| ArticlePage | `src/app/(public)/news/[slug]/page.tsx` |
| CategoryPage | `src/app/(public)/category/[slug]/page.tsx` |
| WriterPage | `src/app/(public)/writer/[id]/page.tsx` |
| SearchPage | `src/app/(public)/search/page.tsx` |
| RSS Route | `src/app/(public)/rss.xml/route.ts` |
| PublicLayout | `src/app/(public)/layout.tsx` |
| HeroSection | `src/components/public/HeroSection.tsx` |
| QuickNews | `src/components/public/QuickNews.tsx` |
| ExtendedReading | `src/components/public/ExtendedReading.tsx` |

### Client Components（"use client"）

| 元件 | 檔案路徑 | 狀態管理 |
|------|---------|---------|
| PublicHeader | `src/components/public/PublicHeader.tsx` | useState + useRef（滾動、搜尋） |
| LiveScoreTicker | `src/components/public/LiveScoreTicker.tsx` | TanStack Query（polling） |
| HomeArticleSection | `src/components/public/HomeArticleSection.tsx` | nuqs URL state |
| HomeCategoryFilter | `src/components/public/HomeCategoryFilter.tsx` | props callback |
| PersonalizedArticleGrid | `src/components/public/PersonalizedArticleGrid.tsx` | TanStack Query（favorites） |
| TrendingArticles | `src/components/public/TrendingArticles.tsx` | TanStack Query |
| QuickStandings | `src/components/public/QuickStandings.tsx` | TanStack Query |
| QuickOdds | `src/components/public/QuickOdds.tsx` | TanStack Query（polling） |
| CategorySidebar | `src/components/public/CategorySidebar.tsx` | TanStack Query |
| ArticleContent | `src/components/public/ArticleContent.tsx` | 無狀態 |
| TableOfContents | `src/components/public/TableOfContents.tsx` | useState（展開/收合） |
| ShareButtons | `src/components/public/ShareButtons.tsx` | useState（複製狀態） |
| ReactionButtons | `src/components/public/ReactionButtons.tsx` | useState + localStorage |
| LikeButton | `src/app/(public)/news/[slug]/LikeButton.tsx` | TanStack Query + optimistic |
| ViewTracker | `src/app/(public)/news/[slug]/ViewTracker.tsx` | useEffect（一次性 POST） |
| SearchInput | `src/app/(public)/search/SearchInput.tsx` | useState |
| SubmissionCTA | `src/components/public/SubmissionCTA.tsx` | useState（Modal 開關） |
| PullToRefresh | `src/components/public/PullToRefresh.tsx` | -- |
| PageTracker | `src/components/public/PageTracker.tsx` | -- |
| BookmarkButton | `src/components/public/BookmarkButton.tsx` | -- |
| InstallGuide | `src/components/public/InstallGuide.tsx` | -- |

## 8. API 端點總覽

| 端點 | Method | 用途 | 呼叫方 |
|------|--------|------|--------|
| `/api/public/articles` | GET | 文章列表（分頁/篩選） | 外部/元件 |
| `/api/public/articles/trending` | GET | 熱門文章排行 | TrendingArticles, CategorySidebar |
| `/api/public/articles/{slug}/view` | POST | 瀏覽次數累計 | ViewTracker |
| `/api/public/search` | GET | 文章搜尋 | Header 搜尋（API 端） |
| `/api/public/scoreboard` | GET | 即時比分 | LiveScoreTicker, QuickOdds |
| `/api/public/standings` | GET | 聯賽排名 | QuickStandings |
| `/api/public/likes` | GET/POST | 文章按讚 | LikeButton |
| `/api/member/favorites` | GET | 會員關注球隊 | PersonalizedArticleGrid, CategorySidebar |
| `/api/og` | GET | 動態 OG Image 生成 | 文章 SEO metadata |

## 9. 路由 Helper

所有頁面連結均使用 `src/lib/routes.ts` 的型別安全 helper，禁止手動字串拼接：

| Helper | 產出路徑 |
|--------|---------|
| `newsUrl(slugOrId)` | `/news/{slugOrId}` |
| `categoryUrl(slug)` | `/category/{slug}` |
| `writerUrl(writerId)` | `/writer/{writerId}` |
| `scoresUrl()` | `/scores` |
| `standingsUrl(sport)` | `/standings/{sport}` |
| `oddsUrl()` | `/odds` |
| `gameUrl(league, eventId)` | `/game/{league}/{eventId}` |
| `absoluteNewsUrl(base, slug)` | `{base}/news/{slug}` |

## 10. 共用常數依賴

定義於 `src/lib/constants.ts`：

| 常數 | 用途 |
|------|------|
| `CATEGORY_COLORS` | 分類標籤配色 class |
| `CATEGORY_FALLBACK_IMAGES` | 無配圖時的分類預設圖 |
| `CATEGORY_LABELS` | slug -> 顯示名稱 |
| `CATEGORY_DB_MAP` | slug -> DB 查詢值 |
| `getCategorySlug()` | DB 值 -> URL slug |
| `formatRelativeTime()` | 相對時間格式化 |
| `formatDateFull()` | 完整日期格式化 |
| `formatDateShort()` | 簡短日期格式化 |
| `getFirstImageUrl()` | 從 images jsonb 取第一張圖 |
| `SCOREBOARD_POLLING_MS` | 比分 polling 間隔（60s） |
| `SITE_NAME` | 網站名稱 |
| `SITE_URL` | 網站 URL |

## 11. 已知限制與技術債

| 項目 | 說明 | 影響 |
|------|------|------|
| ReactionButtons 純 localStorage | 表情反應無後端同步，換裝置/清 cache 即消失 | 數據不準確 |
| 搜尋無全文索引 | 使用 `ILIKE '%keyword%'` 模糊查詢，大量資料時效能差 | 搜尋延遲 |
| 作者頁無分頁 | 一次撈取作者所有文章 | 文章量大時效能問題 |
| 作者頁 Metadata 模板字串 bug | `"作者未找到 - ${SITE_NAME}"` 使用雙引號，SITE_NAME 不會展開 | Metadata 顯示錯誤 |
| 分類頁「敬請期待」硬編碼 | soccer / general 直接寫在 Set 中 | 新增分類需改程式碼 |
| 作者頁使用硬編碼 Tailwind class | 未使用 theme token（如 bg-slate-50 而非 bg-muted） | 深色模式樣式不一致 |
| QuickOdds 固定 NBA | 側邊欄賽事固定查詢 NBA | 無法動態切換聯賽 |
| LiveScoreTicker 無 error boundary | API 失敗時靜默失敗 | 使用者無感知 |

## 12. 測試策略

| 層級 | 範圍 | 工具 |
|------|------|------|
| Unit | constants helper（formatRelativeTime, getCategorySlug 等） | Vitest |
| Unit | 搜尋字元 escape 邏輯 | Vitest |
| Integration | 各頁面 SSR 渲染（mock Supabase） | Vitest + jsdom |
| E2E | 首頁載入 + 文章點擊 + 搜尋流程 | Playwright |
| E2E | 分類頁排序/分頁 | Playwright |
| E2E | 文章詳情頁各區塊存在性 | Playwright |
| Visual | Hero / 文章卡片 / 分類頁佈局（PC 1440x900 + 手機 430x932） | 截圖驗證 |
