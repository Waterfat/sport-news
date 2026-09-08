# 測試計畫：文章管理模組（Article Management）

> 對應 PRD: `docs/specs/prd-article-management.md`

## TC-1: GET /api/articles/generated（文章列表）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| L-01 | P0 | session = null | GET /api/articles/generated | 401 Unauthorized |
| L-02 | P0 | 已登入；DB 有文章 | GET /api/articles/generated（無篩選） | 200，回傳 { articles, total, page, limit } |
| L-03 | P0 | 已登入 | GET ?status=draft | 查詢帶 .eq("status", "draft") |
| L-04 | P0 | 已登入 | GET ?status=scheduled | 查詢帶 .eq("status", "draft").not("scheduled_at", "is", null) |
| L-05 | P0 | 已登入 | GET ?status=published | 查詢帶 .eq("status", "published") |
| L-06 | P1 | 已登入 | GET ?category=NBA | 查詢帶 .eq("category", "NBA") |
| L-07 | P1 | 已登入；DB 查詢拋錯 | GET /api/articles/generated | 500，回傳 { error } |

## TC-2: GET /api/articles/generated/[id]（文章詳情）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| D-01 | P0 | session = null | GET /api/articles/generated/1 | 401 |
| D-02 | P0 | 已登入；文章不存在 | GET /api/articles/generated/999 | 404，回傳 { error } |
| D-03 | P0 | 已登入；文章存在，raw_article_ids 為空 | GET /api/articles/generated/1 | 200，rawArticles: []，不查詢 raw_articles |
| D-04 | P0 | 已登入；文章存在，有 raw_article_ids | GET /api/articles/generated/1 | 200，查詢並回傳 rawArticles |

## TC-3: PATCH /api/articles/generated/[id]（更新文章）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| U-01 | P0 | session = null | PATCH /api/articles/generated/1 | 401 |
| U-02 | P0 | 已登入 | PATCH body: { title: "" }（空字串） | 400（Zod 驗證失敗） |
| U-03 | P0 | 已登入 | PATCH body: { title: "new", content: "text" } | 200，回傳更新後 { article } |
| U-04 | P1 | 已登入 | PATCH body: { scheduled_at: "2026-04-01T00:00:00Z" } | 200，updateData 含 scheduled_at |
| U-05 | P0 | 已登入；無 publish_channel_ids | PATCH body: { status: "published" } | 200，呼叫 publishArticle(id) |
| U-06 | P0 | 已登入；有 publish_channel_ids | PATCH body: { status: "published", publish_channel_ids: [1,2] } | publishArticle 前先 update publish_channel_ids |
| U-07 | P1 | 已登入；DB update 拋錯（非發布路徑） | PATCH body: { title: "new" } | 500 |

## TC-4: POST /api/articles/generated/batch（批次操作）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| B-01 | P0 | session = null | POST /api/articles/generated/batch | 401 |
| B-02 | P0 | 已登入 | POST body: { action: "delete", ids: [] } | 400（空 ids） |
| B-03 | P0 | 已登入 | POST body: { action: "invalid", ids: [1] } | 400（無效 action） |
| B-04 | P0 | 已登入 | POST body: { action: "delete", ids: [1,2] } | 200，{ success: true, deleted: 2 } |
| B-05 | P1 | 已登入；DB delete 拋錯 | POST body: { action: "delete", ids: [1] } | 500 |
| B-06 | P0 | 已登入；2 篇文章皆可發布 | POST body: { action: "publish", ids: [1,2] } | 200，published: 2，publishArticle 呼叫 2 次 |
| B-07 | P1 | 已登入；1 篇成功 1 篇失敗 | POST body: { action: "publish", ids: [1,2] } | 200，published 反映實際成功數 |

## TC-5: GET /api/articles/generated/review（審核佇列）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| R-01 | P0 | session = null | GET /api/articles/generated/review | 401 |
| R-02 | P0 | 已登入 | GET ?tab=pending（或無 tab，預設） | 查詢 review_status=pending，回傳陣列 |
| R-03 | P0 | 已登入 | GET ?tab=history | 查詢 review_status in [approved, rejected]，回傳陣列 |
| R-04 | P1 | 已登入；DB 查詢拋錯 | GET /api/articles/generated/review | 500 |

## TC-6: PATCH /api/articles/generated/review（更新審核）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| RU-01 | P0 | session = null | PATCH /api/articles/generated/review | 401 |
| RU-02 | P0 | 已登入 | PATCH body: { review_status: "approved" }（缺少 id） | 400 |
| RU-03 | P0 | 已登入 | PATCH body: { id: 1, review_status: "invalid" } | 400（無效 review_status） |
| RU-04 | P0 | 已登入 | PATCH body: { id: 1, review_status: "approved" } | 200，{ success, id, review_status } |
| RU-05 | P0 | 已登入 | PATCH body: { id: 1, review_status: "rejected", reason: "品質不足" } | 200，updateData 含 reviewer_note |
| RU-06 | P1 | 已登入；DB update 拋錯 | PATCH body: 合法資料 | 500 |

## TC-7: GET /api/articles/raw（原始文章）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| RA-01 | P0 | session = null | GET /api/articles/raw | 401 |
| RA-02 | P0 | 已登入；DB 有資料 | GET /api/articles/raw | 200，{ articles, total, page, limit } |
| RA-03 | P1 | 已登入 | GET ?category=NBA | 查詢帶 .eq("category", "NBA") |
| RA-04 | P1 | 已登入 | GET ?source=espn | 查詢帶 .eq("source", "espn") |
| RA-05 | P1 | 已登入；DB 查詢拋錯 | GET /api/articles/raw | 500 |

## TC-8: publishArticle 補缺口

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| PA-01 | P0 | 文章 review_status = pending | 呼叫 publishArticle(id) | 阻擋發布，errors 含「文章未通過審查」 |
| PA-02 | P0 | 文章 review_status = rejected | 呼叫 publishArticle(id) | 阻擋發布，errors 含「文章未通過審查」 |
