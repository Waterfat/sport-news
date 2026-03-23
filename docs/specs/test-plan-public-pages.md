# 測試計畫：公開頁面模組（Public Pages）

## 1. 範圍說明

依據 PRD `prd-public-pages.md` 定義的公開頁面模組，覆蓋 API 路由、UI 元件、RSS feed 三個層次。

---

## 2. 現有測試覆蓋盤點

| 測試檔案 | 覆蓋範圍 | 狀態 |
|---------|---------|------|
| `components/QuickNews.test.tsx` | 快訊元件渲染、路由 helper、相對時間 | 已完成 |
| `components/ExtendedReading.test.tsx` | 延伸閱讀渲染、邊界情況 | 已完成 |
| `components/ArticleCardSkeleton.test.tsx` | 骨架屏元件 | 已完成 |
| `lib/auto-link.test.tsx` | 球隊名稱自動連結邏輯 | 已完成 |
| `lib/constants.test.ts` | CATEGORY_COLORS/LABELS/DB_MAP、formatDateFull/Short、parsePagination 等 | 已完成 |
| `lib/relative-time.test.ts` | formatRelativeTime | 已完成 |
| `lib/routes-extended.test.ts` | teamSlugUrl、absoluteTeamUrl 等路由 helper | 已完成 |
| `api/member-favorites.test.ts` | 會員收藏 API | 已完成 |

---

## 3. 測試缺口清單

### 3.1 Constants Helpers（單元）

| 目標 | 缺口說明 | 優先級 |
|------|---------|--------|
| `getFirstImageUrl()` | 未測試 `{ url: string }[]` 格式、string[] 格式、空陣列、非陣列輸入 | 高 |

### 3.2 公開 API 路由（整合）

| 端點 | 缺口說明 | 優先級 |
|------|---------|--------|
| `GET /api/public/articles` | 分頁、category 篩選、writer_id 篩選、limit 上限 100 | 高 |
| `GET /api/public/articles/trending` | period 篩選（week/month/all）、category 篩選、limit 驗證、非法 period 回傳 400 | 高 |
| `POST /api/public/articles/[slug]/view` | slug 查找、id fallback、404 處理、view_count 累計 | 高 |
| `GET /api/public/likes` | article_id 必填驗證、回傳 liked 狀態 | 高 |
| `POST /api/public/likes` | toggle 按讚/取消、article_id 必填驗證 | 高 |
| `POST /api/public/newsletter` | email 格式驗證、重複訂閱、成功回傳 201 | 高 |
| `POST /api/public/submissions` | Zod 驗證、rate limiting、重複申請 409、成功回傳 201 | 高 |
| `GET /rss.xml` | Content-Type、Cache-Control、XML 結構、CDATA | 高 |
| `GET /api/public/search` | 空 q 回傳空陣列、特殊字元 escape、回傳欄位完整 | 高 |

### 3.3 公開頁面元件（整合）

| 元件 | 缺口說明 | 優先級 |
|------|---------|--------|
| `HeroSection` | 主 hero 渲染、sub-hero 渲染、slug/id fallback、無圖片 fallback | 高 |
| `ShareButtons` | 4 種分享按鈕渲染、LINE/Telegram/X URL 格式、複製按鈕行為 | 高 |
| `ReactionButtons` | 4 種反應渲染、localStorage toggle、計數更新 | 高 |
| `ArticleContent` | Markdown 渲染、YouTube embed 解析、Twitter/X URL 處理、外部連結新視窗 | 高 |
| `TrendingArticles` | Loading 骨架、文章列表、排名顏色（金銀銅）、空資料狀態 | 中 |
| `HomeArticleSection` | 分類篩選、「此分類沒有文章」空狀態、查看更多連結 | 中 |

---

## 4. 測試策略

### 4.1 API 路由測試

- 使用 `vi.mock("@/lib/supabase", ...)` 隔離 Supabase client
- 使用 `NextRequest` 建構測試請求
- 驗證：HTTP status、回傳 JSON 結構、錯誤情況（缺少欄位、DB 失敗）

### 4.2 元件測試

- 使用 `@testing-library/react` render + screen 查詢
- Client Component 測試用 `vi.mock("nuqs", ...)` 處理 URL state
- TanStack Query 元件用 `QueryClientProvider` wrapper
- `navigator.clipboard` 與 `localStorage` 使用 `vi.stubGlobal` 或 jsdom 內建

### 4.3 RSS 測試

- 呼叫 GET handler，驗證回傳 Response 的 Content-Type、Cache-Control 及 XML 結構

---

## 5. 測試檔案對照表

| 測試檔案 | 覆蓋的缺口 |
|---------|-----------|
| `src/__tests__/lib/get-first-image-url.test.ts` | getFirstImageUrl |
| `src/__tests__/api/public-articles.test.ts` | /api/public/articles + /api/public/articles/trending |
| `src/__tests__/api/public-view.test.ts` | /api/public/articles/[slug]/view |
| `src/__tests__/api/public-likes.test.ts` | /api/public/likes GET + POST |
| `src/__tests__/api/public-newsletter.test.ts` | /api/public/newsletter |
| `src/__tests__/api/public-submissions.test.ts` | /api/public/submissions |
| `src/__tests__/api/public-search.test.ts` | /api/public/search |
| `src/__tests__/api/rss-feed.test.ts` | /rss.xml |
| `src/__tests__/components/HeroSection.test.tsx` | HeroSection |
| `src/__tests__/components/ShareButtons.test.tsx` | ShareButtons |
| `src/__tests__/components/ReactionButtons.test.tsx` | ReactionButtons |
| `src/__tests__/components/ArticleContent.test.tsx` | ArticleContent |
| `src/__tests__/components/TrendingArticles.test.tsx` | TrendingArticles |
| `src/__tests__/components/HomeArticleSection.test.tsx` | HomeArticleSection |

---

## 6. 品質門檻

| 指標 | 目標 |
|------|------|
| 公開頁面模組整體覆蓋率 | ≥ 90% |
| API 路由關鍵路徑覆蓋 | 100%（成功 + 驗證錯誤 + DB 失敗） |
| 元件基礎渲染 | 100% |
| Critical defects（阻塞功能） | 0 |

---

## 7. 已發現的既有技術債（來自 PRD 11 節）

| 問題 | 影響 | 建議 |
|------|------|------|
| 作者頁 Metadata 模板字串使用雙引號 | Metadata 顯示為 literal `${SITE_NAME}` | 加入測試驗證 SEO metadata |
| ReactionButtons 純 localStorage | 換裝置/清 cache 後失效 | 記錄在已知限制，不在本次測試範圍 |
| 搜尋無全文索引 | 效能問題 | 在搜尋 API 測試中補充效能警示 |
