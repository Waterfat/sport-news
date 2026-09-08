# 測試計畫：公開頁面模組（Public Pages）

> 對應 PRD: `docs/specs/prd-public-pages.md`

## TC-1: getFirstImageUrl（單元）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| FI-01 | P0 | images = [{ url: "https://example.com/a.jpg" }] | 呼叫 getFirstImageUrl(images) | 回傳 "https://example.com/a.jpg" |
| FI-02 | P0 | images = ["https://example.com/a.jpg"] | 呼叫 getFirstImageUrl(images) | 回傳 "https://example.com/a.jpg"（支援 string[] 格式） |
| FI-03 | P0 | images = [] | 呼叫 getFirstImageUrl(images) | 回傳 null 或 undefined |
| FI-04 | P1 | images = null 或非陣列 | 呼叫 getFirstImageUrl(images) | 回傳 null 或 undefined（不拋錯） |

## TC-2: GET /api/public/articles

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| PA-01 | P0 | DB 有 published 文章 | GET /api/public/articles | 200，回傳分頁文章列表 |
| PA-02 | P0 | — | GET ?category=NBA | 篩選 category=NBA 的文章 |
| PA-03 | P1 | — | GET ?writer_id=1 | 篩選 writer_id=1 的文章 |
| PA-04 | P1 | — | GET ?limit=200 | limit 上限為 100（截斷） |
| PA-05 | P1 | DB 查詢拋錯 | GET /api/public/articles | 500 |

## TC-3: GET /api/public/articles/trending

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| TR-01 | P0 | DB 有文章 | GET /api/public/articles/trending | 200，回傳熱門文章 |
| TR-02 | P0 | — | GET ?period=week | 篩選近一週的熱門文章 |
| TR-03 | P1 | — | GET ?period=month | 篩選近一月的熱門文章 |
| TR-04 | P1 | — | GET ?category=NBA | 篩選特定分類的熱門文章 |
| TR-05 | P0 | — | GET ?period=invalid | 400（非法 period） |
| TR-06 | P1 | — | GET ?limit=200 | limit 驗證（不超過上限） |

## TC-4: POST /api/public/articles/[slug]/view

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| VW-01 | P0 | 文章 slug 存在 | POST /api/public/articles/test-slug/view | view_count +1 |
| VW-02 | P0 | slug 不存在但 id fallback 可用 | POST /api/public/articles/123/view | 用 id 查找，view_count +1 |
| VW-03 | P0 | slug 和 id 都找不到 | POST /api/public/articles/nonexist/view | 404 |

## TC-5: GET /api/public/likes

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| LK-01 | P0 | — | GET /api/public/likes（缺少 article_id） | 400（article_id 必填） |
| LK-02 | P0 | 使用者已按讚 | GET ?article_id=1 | 回傳 liked: true |
| LK-03 | P0 | 使用者未按讚 | GET ?article_id=1 | 回傳 liked: false |

## TC-6: POST /api/public/likes

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| LKP-01 | P0 | — | POST body: {}（缺少 article_id） | 400（article_id 必填） |
| LKP-02 | P0 | 未按讚 | POST body: { article_id: 1 } | toggle 為按讚 |
| LKP-03 | P0 | 已按讚 | POST body: { article_id: 1 } | toggle 為取消按讚 |

## TC-7: POST /api/public/newsletter

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| NL-01 | P0 | — | POST body: { email: "invalid" } | 400（email 格式驗證失敗） |
| NL-02 | P0 | email 已訂閱 | POST body: { email: "a@b.com" } | 回傳重複訂閱提示 |
| NL-03 | P0 | email 未訂閱 | POST body: { email: "a@b.com" } | 201，成功訂閱 |

## TC-8: POST /api/public/submissions

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SM-01 | P0 | — | POST body: 缺少必填欄位 | 400（Zod 驗證失敗） |
| SM-02 | P0 | 同 email 已有申請 | POST body: 合法資料 | 409（重複申請） |
| SM-03 | P0 | — | POST body: 合法資料 | 201，成功提交 |
| SM-04 | P1 | rate limiting 觸發 | POST body: 合法資料 | 429（頻率限制） |

## TC-9: GET /rss.xml

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| RSS-01 | P0 | DB 有已發布文章 | GET /rss.xml | Content-Type 為 application/xml |
| RSS-02 | P0 | — | GET /rss.xml | Cache-Control 正確設定 |
| RSS-03 | P0 | — | GET /rss.xml | XML 結構正確（channel + item），CDATA 包裝內容 |

## TC-10: GET /api/public/search

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SR-01 | P0 | — | GET ?q=（空字串） | 回傳空陣列 |
| SR-02 | P0 | DB 有匹配文章 | GET ?q=NBA | 回傳匹配文章，欄位完整 |
| SR-03 | P1 | — | GET ?q=test%27s（特殊字元） | 正確 escape，不報錯 |

## TC-11: HeroSection 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| HS-01 | P0 | 有主 hero 文章 | 渲染 HeroSection | 主 hero 正確顯示（標題 + 圖片） |
| HS-02 | P0 | 有 sub-hero 文章 | 渲染 HeroSection | sub-hero 正確顯示 |
| HS-03 | P1 | 文章無 slug，有 id | 渲染 HeroSection | 用 id fallback 生成連結 |
| HS-04 | P1 | 文章無圖片 | 渲染 HeroSection | 使用 fallback 圖片 |

## TC-12: ShareButtons 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SH-01 | P0 | 傳入 url + title | 渲染 ShareButtons | 顯示 4 種分享按鈕 |
| SH-02 | P0 | — | 檢查 LINE 分享 URL | 格式正確含 url + text |
| SH-03 | P0 | — | 檢查 Telegram 分享 URL | 格式正確含 url + text |
| SH-04 | P0 | — | 檢查 X(Twitter) 分享 URL | 格式正確含 url + text |
| SH-05 | P0 | — | 點擊複製按鈕 | navigator.clipboard.writeText 被呼叫 |

## TC-13: ReactionButtons 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| RB-01 | P0 | 傳入 articleId | 渲染 ReactionButtons | 顯示 4 種反應按鈕 |
| RB-02 | P0 | localStorage 無紀錄 | 點擊一種反應 | localStorage 紀錄 + 計數 +1 |
| RB-03 | P0 | localStorage 已有該反應 | 點擊同一反應 | toggle 取消 + 計數 -1 |

## TC-14: ArticleContent 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| AC-01 | P0 | content 含 Markdown 語法 | 渲染 ArticleContent | Markdown 正確渲染為 HTML |
| AC-02 | P1 | content 含 YouTube URL | 渲染 ArticleContent | YouTube embed iframe 正確顯示 |
| AC-03 | P1 | content 含 Twitter/X URL | 渲染 ArticleContent | Twitter/X URL 正確處理 |
| AC-04 | P0 | content 含外部連結 | 渲染 ArticleContent | 外部連結以新視窗開啟（target="_blank"） |

## TC-15: TrendingArticles 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| TA-01 | P1 | 資料載入中 | 渲染 TrendingArticles | 顯示 loading 骨架 |
| TA-02 | P0 | 有熱門文章資料 | 渲染 TrendingArticles | 文章列表正確顯示 |
| TA-03 | P1 | 有文章資料 | 渲染 TrendingArticles | 排名 1/2/3 顯示金/銀/銅顏色 |
| TA-04 | P1 | 無文章資料 | 渲染 TrendingArticles | 顯示空資料狀態 |

## TC-16: HomeArticleSection 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| HAS-01 | P0 | 有多分類文章 | 渲染 HomeArticleSection | 分類篩選按鈕正確顯示 |
| HAS-02 | P0 | 選擇的分類無文章 | 渲染 HomeArticleSection | 顯示「此分類沒有文章」空狀態 |
| HAS-03 | P1 | 有文章資料 | 渲染 HomeArticleSection | 「查看更多」連結正確 |
