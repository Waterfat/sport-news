# 整合測試計畫：新聞管線系統（News Pipeline）

> 對應 PRD: `docs/specs/prd-news-pipeline.md`
> Issue: #194

## 1. 測試範圍概覽

### 已覆蓋（137 個既有測試）

| 模組 | 測試檔案 | 測試數 | 覆蓋內容 |
|------|---------|--------|---------|
| 爬蟲 URL 過濾 | `generic-crawler.test.ts` | 58 | URL 過濾、圖片提取、基路徑優先順序 |
| 發布流程 | `publish-article.test.ts` | 23 | 頻道選擇、封面圖去重、狀態更新 |
| Telegram 發布 | `telegram-publisher.test.ts` | 16 | 文字截斷、圖片發布、fallback |
| AI 規劃解析 | `plan-generator.test.ts` | 31 | JSON 解析、Zod 驗證、標題去重 |
| 標籤提取 | `extract-tags.test.ts` | 9 | 聯盟/球隊識別、別名處理 |

### 缺口清單（需補齊）

| # | 模組 | 缺失測試 | 優先級 | 風險 |
|---|------|---------|--------|------|
| G1 | 寫手專長匹配 | `matchesSpecialties()` 函式 | P0 | 錯誤匹配導致文章分配錯誤 |
| G2 | 爬蟲完整流程 | `runAllCrawlers()` 整合 | P1 | 多源並行 + 去重邏輯未驗證 |
| G3 | 規劃生成流程 | `generatePlans()` 整合 | P1 | 素材時效 + 分組 + AI 呼叫 |
| G4 | 改寫流程 | `local-rewriter.ts` 核心邏輯 | P1 | 產文流程未驗證 |
| G5 | 審稿流程 | `editor-in-chief.ts` 審查邏輯 | P1 | 審稿通過/拒絕判定未驗證 |
| G6 | 其他發布渠道 | Facebook/Twitter/Line | P2 | 僅 Telegram 有測試 |
| G7 | Cron 端點 | `/api/cron/*` 路由 | P2 | 排程觸發邏輯未驗證 |
| G8 | 任務監聽 | `rewrite-listener.ts` 事件驅動 | P3 | 常駐服務較難單元測試 |

## 2. 整合測試 Case

### TC-1: 寫手專長匹配（matchesSpecialties）

| # | 測試案例 | 輸入 | 預期結果 |
|---|---------|------|---------|
| 1.1 | 全能寫手（無專長設定） | specialties = {} | 匹配所有文章 |
| 1.2 | 球種匹配 — 籃球寫手 | specialties.sports = ["籃球"], 文章含 "NBA" | ✅ 匹配 |
| 1.3 | 球種不匹配 | specialties.sports = ["棒球"], 文章含 "NBA" | ❌ 不匹配 |
| 1.4 | 聯盟匹配 | specialties.leagues = ["NBA"], 文章含 "Lakers" | ✅ 匹配 |
| 1.5 | 球隊匹配 | specialties.teams = ["Lakers"], 文章含 "湖人" | ✅ 匹配 |
| 1.6 | 多球種寫手 | specialties.sports = ["籃球", "棒球"] | 匹配任一球種的文章 |
| 1.7 | 混合文章 — 多球種內容 | 文章同時提到 NBA 和 MLB | 按關鍵字加權取主分類 |
| 1.8 | 空文章內容 | title = "", content = "" | 不匹配（除非全能寫手） |

### TC-2: 爬蟲整合流程（runAllCrawlers）

| # | 測試案例 | 前置條件 | 預期結果 |
|---|---------|---------|---------|
| 2.1 | 多來源並行爬取 | 3 個啟用來源 | 回傳合併結果 |
| 2.2 | 球種過濾 | 只啟用「籃球」 | 只保留籃球相關文章 |
| 2.3 | URL 去重 | 同 URL 文章已存在 DB | 標記為 duplicate，不重複儲存 |
| 2.4 | 單一來源失敗不影響其他 | 來源 A 超時 | 來源 B、C 正常完成 |
| 2.5 | 無啟用來源 | 所有來源 is_active=false | 回傳空結果，不報錯 |
| 2.6 | 圖片下載（可選） | crawl_images=true | 圖片存入 Supabase Storage |

### TC-3: AI 規劃生成流程（generatePlans）

| # | 測試案例 | 前置條件 | 預期結果 |
|---|---------|---------|---------|
| 3.1 | 12 小時時效窗口 | 素材 crawled_at 超過 12 小時 | 不納入規劃 |
| 3.2 | 素材上限 20 篇 | 寫手有 30 篇匹配素材 | 只取前 20 篇 |
| 3.3 | 標題去重（14 天） | 規劃標題與 10 天前發布的相似 | 該規劃被過濾 |
| 3.4 | 同批次標題去重 | 兩個規劃標題相似 | 只保留其一 |
| 3.5 | 無圖素材過濾 | 規劃引用的素材無圖片 | 該規劃被過濾 |
| 3.6 | is_processed 標記 | 規劃完成 | 被引用的素材標記 is_processed=true |
| 3.7 | 無素材 | 12 小時內無未處理素材 | 不產出規劃，不報錯 |
| 3.8 | 垃圾標題過濾 | 素材標題 < 10 字 | 被過濾排除 |

### TC-4: AI 產文流程（local-rewriter）

| # | 測試案例 | 前置條件 | 預期結果 |
|---|---------|---------|---------|
| 4.1 | Produce 模式 — 官方戰報 | plan_type="official" | 產出正式新聞風格文章 |
| 4.2 | Produce 模式 — 專欄 | plan_type="columnist" | 產出個人觀點風格文章 |
| 4.3 | 圖片收集（最多 5 張） | 素材共有 8 張圖 | 產出文章最多 5 張圖片 |
| 4.4 | 標籤 fallback | AI 未回傳 tags | 用 extractTagsFromContent 補充 |
| 4.5 | cited_sources 構建 | AI 未回傳 cited_sources | 用原始素材資訊構建 |
| 4.6 | 儲存為 draft + pending | 產文完成 | status=draft, review_status=pending |
| 4.7 | Classic 模式 — 聯盟分組 | 多聯盟素材 | 每聯盟一篇綜合戰報 |

### TC-5: AI 審稿流程（editor-in-chief）

| # | 測試案例 | 前置條件 | 預期結果 |
|---|---------|---------|---------|
| 5.1 | 審查通過 — 高分 | 所有項 ≥ 7 分，checks 全 pass | decision=approved |
| 5.2 | 審查拒絕 — 低分 | 平均 < 6 分 | decision=rejected |
| 5.3 | 審查拒絕 — 單項過低 | 某項 < 4 分但平均 ≥ 6 | decision=rejected |
| 5.4 | 審查拒絕 — 題材重複 | topic_unique=fail | decision=rejected |
| 5.5 | 審查拒絕 — 無圖片 | has_image=fail | decision=rejected |
| 5.6 | 通過自動發布 | approved + auto_publish | status 更新為 published |
| 5.7 | 封面圖替換 | 封面圖與已發布重複 | 自動替換為其他圖片 |
| 5.8 | 審查結果儲存 | 審查完成 | review_result JSON 寫入 DB |

### TC-6: 多渠道發布

| # | 測試案例 | 前置條件 | 預期結果 |
|---|---------|---------|---------|
| 6.1 | Facebook 發布 | 有效 page_id + access_token | API 呼叫成功 |
| 6.2 | Twitter 發布 | 有效 API credentials | Tweet 發送成功 |
| 6.3 | LINE 發布 | 有效 Messaging API token | 推播訊息成功 |
| 6.4 | 部分渠道失敗 | Telegram 成功、Facebook 失敗 | 回傳部分成功結果 |
| 6.5 | SSRF 防護 | 圖片 URL 指向 127.0.0.1 | 被過濾，不發送 |
| 6.6 | 未審查文章 | review_status ≠ approved | 拒絕發布 |

### TC-7: Cron 端點

| # | 測試案例 | 前置條件 | 預期結果 |
|---|---------|---------|---------|
| 7.1 | /api/cron/crawl 觸發 | 有效 CRON_SECRET | 執行爬取並回傳統計 |
| 7.2 | /api/cron/crawl 未授權 | 無或錯誤 CRON_SECRET | 401 Unauthorized |
| 7.3 | /api/cron/publish-scheduled | 有預約文章到期 | 發布並回傳數量 |
| 7.4 | /api/cron/auto-pipeline Phase A | 有完成的自動任務 | 自動發布文章 |
| 7.5 | /api/cron/auto-pipeline Phase B | 素材達門檻 | 建立新 rewrite_task |

### TC-8: 管線端到端整合

| # | 測試案例 | 流程 | 預期結果 |
|---|---------|------|---------|
| 8.1 | 完整管線 — 爬取到發布 | crawl → plan → produce → review → publish | 文章成功發布到所有渠道 |
| 8.2 | 管線中斷恢復 | produce 階段失敗 | task 標記 failed，可重新觸發 |
| 8.3 | 並行管線 | 同時有 plan 和 produce 任務 | 單任務鎖確保序列執行 |

## 3. 實作優先順序

### Phase 1（立即實作）
1. **G1 寫手專長匹配** — 純函式，易測試，影響所有文章分配
2. **G5 審稿邏輯** — 審查通過/拒絕判定，影響發布品質

### Phase 2（短期補齊）
3. **G3 規劃生成** — 需 mock DB 和 AI，但邏輯關鍵
4. **G4 改寫流程** — 需 mock AI 呼叫
5. **G6 其他發布渠道** — Facebook/Twitter/Line publisher

### Phase 3（中期完善）
6. **G2 爬蟲整合** — 需 mock HTTP 請求
7. **G7 Cron 端點** — 需 mock Next.js route handler
8. **G8 任務監聽** — 常駐服務，考慮 integration test

## 4. 測試環境與工具

| 工具 | 用途 |
|------|------|
| Vitest | 單元/整合測試框架 |
| vi.mock() | 模組 mock（DB、AI、HTTP） |
| msw | HTTP 請求攔截（爬蟲、API） |
| Playwright | E2E 測試（後台管線頁面） |

## 5. 品質門檻

| 指標 | 目標 |
|------|------|
| 新增測試數 | ≥ 40 個 test case |
| 覆蓋缺口 | G1-G5 全部覆蓋 |
| 測試通過率 | 100% |
