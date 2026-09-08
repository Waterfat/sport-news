# 測試計畫：後台設定模組（Admin Settings）

> 對應 PRD: `docs/specs/prd-admin-settings.md`

## TC-1: sport-config.ts 設定邏輯

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| S-01 | P1 | 匯入 SPORTS | 檢查 SPORTS 物件 key | 包含 basketball, baseball, football, soccer 四個 key |
| S-02 | P1 | 匯入 SPORTS | 讀取 basketball.enabled | enabled 為 true |
| S-03 | P1 | 匯入 SPORTS | 讀取 baseball/football/soccer.enabled | 三者皆為 false |
| S-04 | P1 | 匯入 SPORTS | 檢查每個球種物件結構 | 每個都有 label、keywords、enabled 欄位 |
| S-05 | P1 | 匯入 SPORTS | 檢查每個球種 keywords | 為非空陣列（length > 0） |
| S-06 | P2 | 匯入 SportKey | 型別檢查四個 key 是否合法 | basketball/baseball/football/soccer 皆合法 |

## TC-2: 球種設定 API — GET /api/settings/sports

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SP-G-01 | P0 | session = null | GET /api/settings/sports | 401 |
| SP-G-02 | P0 | 已登入；DB 回傳空陣列 | GET /api/settings/sports | 200，包含四個球種，basketball enabled=true（使用預設值） |
| SP-G-03 | P0 | 已登入；DB 有 basketball enabled=false | GET /api/settings/sports | 200，basketball 使用 DB 的 enabled 值 |
| SP-G-04 | P1 | 已登入；DB 回傳含 sources 陣列 | GET /api/settings/sports | 200，sources 正確對應 |
| SP-G-05 | P1 | 已登入；DB 查詢拋錯 | GET /api/settings/sports | 500 |

## TC-3: 球種設定 API — POST /api/settings/sports

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SP-P-01 | P0 | session = null | POST /api/settings/sports | 401 |
| SP-P-02 | P0 | 已登入 | POST body: { sport_key: "tennis" } | 400（無效 sport_key） |
| SP-P-03 | P0 | 已登入 | POST body: {} (缺少 sport_key) | 400 |
| SP-P-04 | P0 | 已登入 | POST body: { sport_key: "basketball", enabled: true } | 200，回傳 {success: true, sport_key, enabled} |
| SP-P-05 | P1 | 已登入 | POST body: { sport_key: "basketball", sources: [...] } | 200，sources 被儲存 |
| SP-P-06 | P1 | 已登入；DB upsert 拋錯 | POST body: 合法資料 | 500 |

## TC-4: 頻道設定 API — GET /api/settings/channels

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| CH-G-01 | P0 | session = null | GET /api/settings/channels | 401 |
| CH-G-02 | P0 | 已登入；DB 有頻道資料 | GET /api/settings/channels | 200，回傳陣列 |
| CH-G-03 | P1 | 已登入；DB 無頻道 | GET /api/settings/channels | 200，[] |
| CH-G-04 | P1 | 已登入；DB 查詢拋錯 | GET /api/settings/channels | 500 |

## TC-5: 頻道設定 API — POST /api/settings/channels

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| CH-P-01 | P0 | session = null | POST /api/settings/channels | 401 |
| CH-P-02 | P0 | 已登入 | POST body: { type: "telegram" }（缺少 name） | 400 |
| CH-P-03 | P0 | 已登入 | POST body: { name: "test" }（缺少 type） | 400 |
| CH-P-04 | P0 | 已登入 | POST body: { name: "test", type: "telegram" } | 201，回傳新建頻道資料，is_active 預設 true |
| CH-P-05 | P1 | 已登入 | POST body: { name: "test", type: "telegram", is_active: false } | 201，is_active=false |
| CH-P-06 | P1 | 已登入；DB insert 拋錯 | POST body: 合法資料 | 500 |

## TC-6: 頻道設定 API — PUT /api/settings/channels

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| CH-U-01 | P0 | session = null | PUT /api/settings/channels | 401 |
| CH-U-02 | P0 | 已登入 | PUT body: { is_active: false }（缺少 id） | 400 |
| CH-U-03 | P0 | 已登入 | PUT body: { id: 1, is_active: false } | 200，{success: true} |
| CH-U-04 | P1 | 已登入 | PUT body: { id: 1, name: "new", type: "line" } | 200，{success: true} |
| CH-U-05 | P1 | 已登入；DB update 拋錯 | PUT body: 合法資料 | 500 |

## TC-7: 頻道設定 API — DELETE /api/settings/channels

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| CH-D-01 | P0 | session = null | DELETE /api/settings/channels | 401 |
| CH-D-02 | P0 | 已登入 | DELETE /api/settings/channels（無 id query param） | 400 |
| CH-D-03 | P1 | 已登入 | DELETE /api/settings/channels?id=abc（非數字） | 400 |
| CH-D-04 | P0 | 已登入 | DELETE /api/settings/channels?id=1 | 200，{success: true} |
| CH-D-05 | P1 | 已登入；DB delete 拋錯 | DELETE /api/settings/channels?id=1 | 500 |

## TC-8: 比分設定 API — GET /api/settings/scoreboard

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SB-G-01 | P0 | session = null | GET /api/settings/scoreboard | 401 |
| SB-G-02 | P0 | 已登入；DB 有設定資料 | GET /api/settings/scoreboard | 200，{configs: [...]} |
| SB-G-03 | P1 | 已登入；DB 無資料 | GET /api/settings/scoreboard | 200，{configs: []} |
| SB-G-04 | P1 | 已登入；DB 查詢拋錯 | GET /api/settings/scoreboard | 500 |

## TC-9: 比分設定 API — POST /api/settings/scoreboard

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SB-P-01 | P0 | session = null | POST /api/settings/scoreboard | 401 |
| SB-P-02 | P0 | 已登入 | POST body: 缺少必填欄位 | 400 |
| SB-P-03 | P0 | 已登入 | POST body: 完整必填欄位 | 200，{config: {...}}，enabled 預設 false |
| SB-P-04 | P1 | 已登入 | POST body: 完整必填欄位，未帶 sort_order | 200，sort_order 預設 0 |
| SB-P-05 | P1 | 已登入；DB insert 拋錯 | POST body: 合法資料 | 500 |

## TC-10: 比分設定 API — PUT /api/settings/scoreboard

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SB-U-01 | P0 | session = null | PUT /api/settings/scoreboard | 401 |
| SB-U-02 | P0 | 已登入 | PUT body: { enabled: true }（缺少 id） | 400 |
| SB-U-03 | P0 | 已登入 | PUT body: { id: 1, enabled: true } | 200，{config: {...}} |
| SB-U-04 | P1 | 已登入 | PUT body: { id: 1, enabled: true, 非法欄位: "x" } | 200，DB 只收到 allowedFields |
| SB-U-05 | P1 | 已登入；DB update 拋錯 | PUT body: 合法資料 | 500 |

## TC-11: 比分設定 API — DELETE /api/settings/scoreboard

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| SB-D-01 | P0 | session = null | DELETE /api/settings/scoreboard | 401 |
| SB-D-02 | P0 | 已登入 | DELETE body: {}（缺少 id） | 400 |
| SB-D-03 | P0 | 已登入 | DELETE body: { id: 1 } | 200，{success: true} |
| SB-D-04 | P1 | 已登入；DB delete 拋錯 | DELETE body: { id: 1 } | 500 |

## TC-12: 自動化設定 API — GET /api/settings/automation

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| AU-G-01 | P0 | session = null | GET /api/settings/automation | 401 |
| AU-G-02 | P0 | 已登入；DB 正常 | GET /api/settings/automation | 200，包含 is_auto_mode 和 pending_raw_count |
| AU-G-03 | P1 | 已登入；DB 設定查詢失敗 | GET /api/settings/automation | 500 |
| AU-G-04 | P1 | 已登入；pending count 查詢失敗 | GET /api/settings/automation | 200，pending_raw_count=0 |

## TC-13: 自動化設定 API — PUT /api/settings/automation

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| AU-P-01 | P0 | session = null | PUT /api/settings/automation | 401 |
| AU-P-02 | P1 | 已登入 | PUT body: { article_threshold: 0 } | 200，DB 沒有收到 article_threshold（< 1 被忽略） |
| AU-P-03 | P1 | 已登入 | PUT body: { check_interval_minutes: 0 } | 200，DB 沒有收到 check_interval_minutes（< 1 被忽略） |
| AU-P-04 | P0 | 已登入 | PUT body: { article_threshold: 5, check_interval_minutes: 30 } | 200，回傳更新後設定 |
| AU-P-05 | P0 | 已登入 | PUT body: { is_auto_mode: false } | 200，包含 is_auto_mode=false |
| AU-P-06 | P1 | 已登入；DB update 拋錯 | PUT body: 合法資料 | 500 |

## TC-14: 儀表板統計 API — GET /api/dashboard/stats

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| DS-01 | P0 | session = null | GET /api/dashboard/stats | 401 |
| DS-02 | P0 | 已登入；DB 正常 | GET /api/dashboard/stats | 200，包含所有 10 個統計欄位 |
| DS-03 | P0 | 已登入；文章有 view_count | GET /api/dashboard/stats | total_views = 各文章 view_count 之和 |
| DS-04 | P1 | 已登入；某些文章 view_count 為 null | GET /api/dashboard/stats | total_views 不出現 NaN（null 計為 0） |
| DS-05 | P1 | 已登入；所有表為空 | GET /api/dashboard/stats | 200，所有數字欄位為 0 |
| DS-06 | P1 | 已登入 | GET /api/dashboard/stats | personas 和 channels 為陣列結構 |
