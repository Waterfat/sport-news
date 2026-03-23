# 測試計畫：文章管理模組（Article Management）

## 1. 範圍說明

本計畫覆蓋 PRD `prd-article-management.md` 定義的所有 API 端點與核心業務邏輯，並補齊現有 `publish-article.test.ts` 未涵蓋的缺口。

### 被測模組

| 模組 | 檔案路徑 | 測試類型 |
|------|---------|---------|
| 文章列表 API | `src/app/api/articles/generated/route.ts` | 整合測試（API） |
| 文章詳情與更新 API | `src/app/api/articles/generated/[id]/route.ts` | 整合測試（API） |
| 批次操作 API | `src/app/api/articles/generated/batch/route.ts` | 整合測試（API） |
| 審核 API | `src/app/api/articles/generated/review/route.ts` | 整合測試（API） |
| 原始文章 API | `src/app/api/articles/raw/route.ts` | 整合測試（API） |
| 發布邏輯 | `src/lib/publish-article.ts` | 單元測試（補缺口） |

---

## 2. 現有測試覆蓋分析

### 已有測試（勿重複）

| 測試檔案 | 覆蓋範圍 |
|---------|---------|
| `src/__tests__/lib/publish-article.test.ts` | `publishArticle()` 完整路徑（找不到文章、有/無頻道、更新 DB 狀態、頻道失敗、圖片解析、封面去重、SSRF 過濾）；`deduplicateCoverImage()` 純函式 |
| `src/__tests__/integration/articles-page-state.test.ts` | 前台狀態機（篩選重置、批次操作狀態、單篇發布 optimistic update） |
| `src/__tests__/integration/articles-page-wiring.test.ts` | Hook 串接（polling 觸發、planManager 回調） |

### 缺口（本計畫補齊）

| API / 功能 | 缺口描述 |
|-----------|---------|
| `GET /api/articles/generated` | 未測試 401 鑑權、status 篩選邏輯、scheduled 特殊過濾、category 篩選、分頁參數傳遞 |
| `GET /api/articles/generated/[id]` | 未測試 401、找不到文章回 404、關聯 raw_articles 查詢、raw_article_ids 為空時不查詢 |
| `PATCH /api/articles/generated/[id]` | 未測試 401、Zod 驗證失敗、一般欄位更新（title/content/排程）、發布路徑（觸發 publishArticle）、publish_channel_ids 先行更新 |
| `POST /api/articles/generated/batch` | 未測試 401、Zod 驗證（無效 action、空 ids）、批次刪除路徑、批次發布路徑（串行呼叫 publishArticle） |
| `GET /api/articles/generated/review` | 未測試 401、tab=pending 查詢、tab=history 查詢 |
| `PATCH /api/articles/generated/review` | 未測試 401、缺少 id 回 400、無效 review_status 回 400、更新 approved/rejected + reason |
| `GET /api/articles/raw` | 未測試 401、category 篩選、source 篩選、分頁 |
| `publishArticle` - review_status 檢查 | 未測試 review_status 非 approved 時阻擋發布 |

---

## 3. 測試策略

### 測試工具

- **Vitest** + **vi.mock()** — 所有外部依賴（Supabase、auth、next/cache）以 mock 替代
- **NextRequest** — 建構 API 請求
- **無真實 DB** — 純 mock，不需要 Docker 容器

### Mock 策略

```
@/auth              → vi.mock → mockAuth.mockResolvedValue({ user: {...} })
@/lib/supabase      → vi.mock → mockCreateServiceClient
@/lib/publish-article → vi.mock（在 batch/id route 測試中）
next/cache          → vi.mock → vi.fn() (revalidatePath)
```

### Supabase Chain Mock 模式

所有 Supabase 查詢使用 chainable mock，終端方法回傳 Promise：

```typescript
const makeChain = (resolved: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(resolved),
  // 當 range() 為終端時需讓 range 也可 resolve
});
```

---

## 4. 測試案例清單

### 4.1 `GET /api/articles/generated`（文章列表）

| # | 案例 | 期望結果 |
|---|------|---------|
| L-01 | 未登入請求 | 401 Unauthorized |
| L-02 | 正常請求，無篩選 | 200，回傳 `{ articles, total, page, limit }` |
| L-03 | `status=draft` | 查詢帶 `.eq("status", "draft")` |
| L-04 | `status=scheduled` | 查詢帶 `.eq("status", "draft").not("scheduled_at", "is", null)` |
| L-05 | `status=published` | 查詢帶 `.eq("status", "published")` |
| L-06 | `category=NBA` | 查詢帶 `.eq("category", "NBA")` |
| L-07 | DB 錯誤 | 500，回傳 `{ error }` |

### 4.2 `GET /api/articles/generated/[id]`（文章詳情）

| # | 案例 | 期望結果 |
|---|------|---------|
| D-01 | 未登入 | 401 |
| D-02 | 找不到文章 | 404，回傳 `{ error }` |
| D-03 | 文章存在，raw_article_ids 為空 | 200，`rawArticles: []`，不查詢 raw_articles |
| D-04 | 文章存在，有 raw_article_ids | 200，查詢並回傳 `rawArticles` |

### 4.3 `PATCH /api/articles/generated/[id]`（更新文章）

| # | 案例 | 期望結果 |
|---|------|---------|
| U-01 | 未登入 | 401 |
| U-02 | 請求 body 驗證失敗（title 空字串） | 400 |
| U-03 | 更新 title + content | 200，回傳更新後 `{ article }` |
| U-04 | 設定 scheduled_at | 200，updateData 含 scheduled_at |
| U-05 | 發布（status=published），無 publish_channel_ids | 200，呼叫 publishArticle(id) |
| U-06 | 發布時先更新 publish_channel_ids 再呼叫 publishArticle | publishArticle 前 update 已呼叫 |
| U-07 | DB 更新失敗（非發布路徑） | 500 |

### 4.4 `POST /api/articles/generated/batch`（批次操作）

| # | 案例 | 期望結果 |
|---|------|---------|
| B-01 | 未登入 | 401 |
| B-02 | ids 空陣列 | 400 |
| B-03 | 無效 action | 400 |
| B-04 | action=delete，成功 | 200，`{ success: true, deleted: N }` |
| B-05 | action=delete，DB 錯誤 | 500 |
| B-06 | action=publish，2 篇全成功 | 200，`published: 2`，publishArticle 呼叫 2 次 |
| B-07 | action=publish，部分失敗 | 200，`published` 反映實際成功數 |

### 4.5 `GET /api/articles/generated/review`（審核佇列）

| # | 案例 | 期望結果 |
|---|------|---------|
| R-01 | 未登入 | 401 |
| R-02 | tab=pending（預設） | 查詢 `review_status=pending`，回傳陣列 |
| R-03 | tab=history | 查詢 `review_status in [approved, rejected]`，回傳陣列 |
| R-04 | DB 錯誤 | 500 |

### 4.6 `PATCH /api/articles/generated/review`（更新審核）

| # | 案例 | 期望結果 |
|---|------|---------|
| RU-01 | 未登入 | 401 |
| RU-02 | 缺少 id | 400 |
| RU-03 | 無效 review_status | 400 |
| RU-04 | approved，無 reason | 200，`{ success, id, review_status }` |
| RU-05 | rejected，有 reason | 200，updateData 含 reviewer_note |
| RU-06 | DB 錯誤 | 500 |

### 4.7 `GET /api/articles/raw`（原始文章）

| # | 案例 | 期望結果 |
|---|------|---------|
| RA-01 | 未登入 | 401 |
| RA-02 | 正常請求 | 200，`{ articles, total, page, limit }` |
| RA-03 | category 篩選 | 查詢帶 `.eq("category", ...)` |
| RA-04 | source 篩選 | 查詢帶 `.eq("source", ...)` |
| RA-05 | DB 錯誤 | 500 |

### 4.8 `publishArticle` 補缺口

| # | 案例 | 期望結果 |
|---|------|---------|
| PA-01 | review_status 為 pending | 阻擋發布，errors 含「文章未通過審查」 |
| PA-02 | review_status 為 rejected | 阻擋發布，errors 含「文章未通過審查」 |

---

## 5. 測試檔案規劃

| 檔案 | 覆蓋案例 |
|------|---------|
| `src/__tests__/api/articles-generated-list.test.ts` | L-01 ~ L-07 |
| `src/__tests__/api/articles-generated-id.test.ts` | D-01 ~ D-04, U-01 ~ U-07 |
| `src/__tests__/api/articles-generated-batch.test.ts` | B-01 ~ B-07 |
| `src/__tests__/api/articles-generated-review.test.ts` | R-01 ~ R-04, RU-01 ~ RU-06 |
| `src/__tests__/api/articles-raw.test.ts` | RA-01 ~ RA-05 |
| `src/__tests__/lib/publish-article.test.ts`（補充） | PA-01 ~ PA-02（加入現有檔案） |

---

## 6. 品質門檻

| 指標 | 目標 |
|------|------|
| 本模組 API 測試案例數 | 35 個以上 |
| 所有案例通過率 | 100% |
| 鑑權（401）路徑覆蓋 | 每個 handler 至少 1 個未登入案例 |
| 錯誤路徑覆蓋 | 每個 handler 至少 1 個 DB 錯誤案例 |
| 驗證失敗覆蓋 | 所有有 Zod schema 的 handler 至少 1 個驗證失敗案例 |

---

## 7. 執行指令

```bash
# 執行全部文章管理 API 測試
npx vitest run src/__tests__/api/articles-generated-list.test.ts
npx vitest run src/__tests__/api/articles-generated-id.test.ts
npx vitest run src/__tests__/api/articles-generated-batch.test.ts
npx vitest run src/__tests__/api/articles-generated-review.test.ts
npx vitest run src/__tests__/api/articles-raw.test.ts

# 執行 publish-article（含補充案例）
npx vitest run src/__tests__/lib/publish-article.test.ts

# 一次執行全部
npx vitest run src/__tests__/api/articles-generated-list.test.ts src/__tests__/api/articles-generated-id.test.ts src/__tests__/api/articles-generated-batch.test.ts src/__tests__/api/articles-generated-review.test.ts src/__tests__/api/articles-raw.test.ts
```
