# 測試計畫：新聞管線系統（News Pipeline）

> 對應 PRD: `docs/specs/prd-news-pipeline.md`

## TC-1: 寫手專長匹配（matchesSpecialties）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 1.1 | P0 | specialties = {} | 呼叫 matchesSpecialties(persona, article) | 匹配所有文章（全能寫手） |
| 1.2 | P0 | specialties.sports = ["籃球"]；文章含 "NBA" | 呼叫 matchesSpecialties | 匹配 |
| 1.3 | P0 | specialties.sports = ["棒球"]；文章含 "NBA" | 呼叫 matchesSpecialties | 不匹配 |
| 1.4 | P0 | specialties.leagues = ["NBA"]；文章含 "Lakers" | 呼叫 matchesSpecialties | 匹配 |
| 1.5 | P0 | specialties.teams = ["Lakers"]；文章含 "湖人" | 呼叫 matchesSpecialties | 匹配 |
| 1.6 | P1 | specialties.sports = ["籃球", "棒球"] | 呼叫 matchesSpecialties with 籃球文章 | 匹配任一球種的文章 |
| 1.7 | P1 | 文章同時提到 NBA 和 MLB | 呼叫 matchesSpecialties | 按關鍵字加權取主分類 |
| 1.8 | P1 | title = "", content = "" | 呼叫 matchesSpecialties（非全能寫手） | 不匹配 |

## TC-2: 爬蟲整合流程（runAllCrawlers）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 2.1 | P1 | 3 個啟用來源 | 呼叫 runAllCrawlers() | 回傳合併結果 |
| 2.2 | P1 | 只啟用「籃球」 | 呼叫 runAllCrawlers() | 只保留籃球相關文章 |
| 2.3 | P0 | 同 URL 文章已存在 DB | 呼叫 runAllCrawlers() | 標記為 duplicate，不重複儲存 |
| 2.4 | P0 | 來源 A 超時 | 呼叫 runAllCrawlers() | 來源 B、C 正常完成（單一失敗不影響其他） |
| 2.5 | P1 | 所有來源 is_active=false | 呼叫 runAllCrawlers() | 回傳空結果，不報錯 |
| 2.6 | P2 | crawl_images=true | 呼叫 runAllCrawlers() | 圖片存入 Supabase Storage |

## TC-3: AI 規劃生成流程（generatePlans）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 3.1 | P0 | 素材 crawled_at 超過 12 小時 | 呼叫 generatePlans() | 該素材不納入規劃 |
| 3.2 | P1 | 寫手有 30 篇匹配素材 | 呼叫 generatePlans() | 只取前 20 篇（上限） |
| 3.3 | P0 | 規劃標題與 10 天前發布的文章相似 | 呼叫 generatePlans() | 該規劃被過濾（14 天去重） |
| 3.4 | P0 | 同批次兩個規劃標題相似 | 呼叫 generatePlans() | 只保留其一 |
| 3.5 | P1 | 規劃引用的素材無圖片 | 呼叫 generatePlans() | 該規劃被過濾 |
| 3.6 | P0 | 規劃完成 | 檢查被引用的素材 | is_processed=true |
| 3.7 | P1 | 12 小時內無未處理素材 | 呼叫 generatePlans() | 不產出規劃，不報錯 |
| 3.8 | P1 | 素材標題 < 10 字 | 呼叫 generatePlans() | 該素材被過濾排除 |

## TC-4: AI 產文流程（local-rewriter）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 4.1 | P0 | plan_type="official" | 執行 produce | 產出正式新聞風格文章 |
| 4.2 | P0 | plan_type="columnist" | 執行 produce | 產出個人觀點風格文章 |
| 4.3 | P1 | 素材共有 8 張圖 | 執行 produce | 產出文章最多 5 張圖片 |
| 4.4 | P1 | AI 未回傳 tags | 執行 produce | 用 extractTagsFromContent 補充 |
| 4.5 | P1 | AI 未回傳 cited_sources | 執行 produce | 用原始素材資訊構建 |
| 4.6 | P0 | 產文完成 | 檢查文章狀態 | status=draft, review_status=pending |
| 4.7 | P1 | 多聯盟素材 | 執行 classic 模式 produce | 每聯盟一篇綜合戰報 |

## TC-5: AI 審稿流程（editor-in-chief）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 5.1 | P0 | 所有項 ≥ 7 分，checks 全 pass | 執行審查 | decision=approved |
| 5.2 | P0 | 平均 < 6 分 | 執行審查 | decision=rejected |
| 5.3 | P0 | 某項 < 4 分但平均 ≥ 6 | 執行審查 | decision=rejected（單項過低） |
| 5.4 | P0 | topic_unique=fail | 執行審查 | decision=rejected |
| 5.5 | P0 | has_image=fail | 執行審查 | decision=rejected |
| 5.6 | P0 | approved + auto_publish 啟用 | 審查通過後 | status 更新為 published |
| 5.7 | P1 | 封面圖與已發布文章重複 | 審查通過後 | 自動替換為其他圖片 |
| 5.8 | P1 | 審查完成 | 檢查 DB | review_result JSON 寫入 DB |

## TC-6: 多渠道發布

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 6.1 | P2 | 有效 page_id + access_token | 發布到 Facebook | API 呼叫成功 |
| 6.2 | P2 | 有效 API credentials | 發布到 Twitter | Tweet 發送成功 |
| 6.3 | P2 | 有效 Messaging API token | 發布到 LINE | 推播訊息成功 |
| 6.4 | P1 | Telegram 成功、Facebook 失敗 | 多渠道發布 | 回傳部分成功結果 |
| 6.5 | P0 | 圖片 URL 指向 127.0.0.1 | 發布 | 被 SSRF 過濾，不發送 |
| 6.6 | P0 | review_status ≠ approved | 發布 | 拒絕發布 |

## TC-7: Cron 端點

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 7.1 | P1 | 有效 CRON_SECRET | GET /api/cron/crawl | 執行爬取並回傳統計 |
| 7.2 | P0 | 無或錯誤 CRON_SECRET | GET /api/cron/crawl | 401 Unauthorized |
| 7.3 | P1 | 有預約文章到期 | GET /api/cron/publish-scheduled | 發布並回傳數量 |
| 7.4 | P1 | 有完成的自動任務 | GET /api/cron/auto-pipeline Phase A | 自動發布文章 |
| 7.5 | P1 | 素材達門檻 | GET /api/cron/auto-pipeline Phase B | 建立新 rewrite_task |

## TC-8: 管線端到端整合

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| 8.1 | P0 | 完整環境可用 | crawl → plan → produce → review → publish | 文章成功發布到所有渠道 |
| 8.2 | P1 | produce 階段失敗 | 執行管線 | task 標記 failed，可重新觸發 |
| 8.3 | P1 | 同時有 plan 和 produce 任務 | 並行管線 | 單任務鎖確保序列執行 |
