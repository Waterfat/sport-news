# 測試計畫：後台設定模組（Admin Settings）

## 1. 概覽

### 文件資訊

| 項目 | 內容 |
|------|------|
| 模組 | 後台設定（Admin Settings） |
| 對應 PRD | docs/specs/prd-admin-settings.md |
| 測試框架 | Vitest + vi.mock() |
| 測試路徑 | src/__tests__/api/ |
| 建立日期 | 2026-03-23 |

### 測試範圍

本計畫涵蓋以下後台設定 API 端點的整合測試：

| 端點 | 方法 | 測試檔案 |
|------|------|----------|
| `/api/settings/sports` | GET, POST | `src/__tests__/api/settings-sports.test.ts` |
| `/api/settings/channels` | GET, POST, PUT, DELETE | `src/__tests__/api/settings-channels.test.ts` |
| `/api/settings/scoreboard` | GET, POST, PUT, DELETE | `src/__tests__/api/settings-scoreboard.test.ts` |
| `/api/settings/automation` | GET, PUT | `src/__tests__/api/settings-automation.test.ts` |
| `/api/dashboard/stats` | GET | `src/__tests__/api/dashboard-stats.test.ts` |
| `src/lib/sport-config.ts` | 設定常數 | `src/__tests__/lib/sport-config.test.ts` |

## 2. 現有覆蓋分析

### 已存在的測試

| 測試檔案 | 涵蓋模組 | 關聯性 |
|---------|---------|--------|
| `src/__tests__/lib/constants.test.ts` | `SPORT_KEY_LABELS`, `CHANNEL_TYPE_LABELS` | 部分相關（常數驗證） |
| `src/__tests__/api/member-favorites.test.ts` | `/api/member/favorites` | 無直接關聯，但提供 API 測試模式參考 |

### 覆蓋缺口

以下功能完全沒有測試：

1. **球種設定 API**（`/api/settings/sports`）：GET 合併 DB 資料 + 預設值的邏輯、POST 無效 sport_key 的 400 回應、upsert 策略
2. **頻道設定 API**（`/api/settings/channels`）：完整 CRUD 四個 handler、id 欄位缺失時的 400 回應、DELETE 使用 query param 的 id 解析
3. **比分設定 API**（`/api/settings/scoreboard`）：完整 CRUD 四個 handler、必填欄位驗證、DELETE 使用 request body 的 id 解析（與 channels 不同）
4. **自動化設定 API**（`/api/settings/automation`）：GET 同時查詢設定 + pending 素材數的 Promise.all 邏輯、PUT 最小值驗證（>= 1）
5. **儀表板統計 API**（`/api/dashboard/stats`）：並行查詢 10 個 DB 表、view_count 加總計算
6. **sport-config.ts 設定邏輯**：SPORTS 常數結構、SportKey 型別推導

## 3. 測試策略

### 3.1 測試分層

每個 API 端點測試包含以下三層：

1. **認證層**：未登入（session 為 null）回傳 401
2. **輸入驗證層**：必填欄位缺失、型別錯誤、業務規則違反回傳 400
3. **業務邏輯層**：正常流程、DB 錯誤回傳 500、邊界值行為

### 3.2 Mock 策略

所有測試統一 mock 以下兩個外部依賴：

```typescript
// 認證
vi.mock("@/auth", () => ({ auth: () => mockAuth() }))

// Supabase 服務客戶端
vi.mock("@/lib/supabase", () => ({ createServiceClient: () => mockSupabase }))
```

Supabase mock 採用鏈式呼叫設計，支援 `.from().select()`, `.insert().select().single()`, `.upsert()`, `.update().eq()`, `.delete().eq()` 等 fluent API。

### 3.3 認證測試矩陣

所有端點的 401 測試統一驗證：
- `session` 為 `null`
- `session.user` 為 `undefined`（`{ user: undefined }`）

## 4. 測試案例清單

### 4.1 sport-config.ts 設定邏輯

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| S-01 | SPORTS 包含 basketball, baseball, football, soccer | 四個 key 都存在 |
| S-02 | basketball 預設 enabled = true | enabled 為 true |
| S-03 | baseball, football, soccer 預設 enabled = false | 三者皆為 false |
| S-04 | 每個球種有 label、keywords、enabled 欄位 | 結構完整 |
| S-05 | keywords 為非空陣列 | 長度 > 0 |
| S-06 | SportKey 型別包含所有球種 key | 四個 key 皆合法 |

### 4.2 球種設定 API（/api/settings/sports）

**GET**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| SP-G-01 | 未登入 | 401 |
| SP-G-02 | DB 回傳空陣列，使用 SPORTS 預設值 | 200，包含四個球種，basketball enabled=true |
| SP-G-03 | DB 有資料，覆蓋預設值 | 200，basketball 使用 DB 的 enabled 值 |
| SP-G-04 | DB 回傳含 sources 陣列的資料 | 200，sources 正確對應 |
| SP-G-05 | DB 錯誤 | 500 |

**POST**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| SP-P-01 | 未登入 | 401 |
| SP-P-02 | 無效 sport_key（如 "tennis"） | 400 |
| SP-P-03 | 缺少 sport_key | 400 |
| SP-P-04 | 合法 sport_key + enabled=true | 200，回傳 {success: true, sport_key, enabled} |
| SP-P-05 | 合法 sport_key + sources 陣列 | 200，sources 被儲存 |
| SP-P-06 | DB upsert 錯誤 | 500 |

### 4.3 頻道設定 API（/api/settings/channels）

**GET**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| CH-G-01 | 未登入 | 401 |
| CH-G-02 | 正常取得頻道列表 | 200，回傳陣列 |
| CH-G-03 | 無頻道時回傳空陣列 | 200，[] |
| CH-G-04 | DB 錯誤 | 500 |

**POST**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| CH-P-01 | 未登入 | 401 |
| CH-P-02 | 缺少 name | 400 |
| CH-P-03 | 缺少 type | 400 |
| CH-P-04 | 正常新增頻道，is_active 預設 true | 201，回傳新建頻道資料 |
| CH-P-05 | 明確傳入 is_active=false | 201，is_active=false |
| CH-P-06 | DB 錯誤 | 500 |

**PUT**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| CH-U-01 | 未登入 | 401 |
| CH-U-02 | 缺少 id | 400 |
| CH-U-03 | 更新 is_active | 200，{success: true} |
| CH-U-04 | 更新 name 和 type | 200，{success: true} |
| CH-U-05 | DB 錯誤 | 500 |

**DELETE**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| CH-D-01 | 未登入 | 401 |
| CH-D-02 | 缺少 id query param | 400 |
| CH-D-03 | 非數字 id | 400 |
| CH-D-04 | 正常刪除 | 200，{success: true} |
| CH-D-05 | DB 錯誤 | 500 |

### 4.4 比分設定 API（/api/settings/scoreboard）

**GET**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| SB-G-01 | 未登入 | 401 |
| SB-G-02 | 正常取得設定列表 | 200，{configs: [...]} |
| SB-G-03 | 無資料時回傳 {configs: []} | 200，configs 為空陣列 |
| SB-G-04 | DB 錯誤 | 500 |

**POST**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| SB-P-01 | 未登入 | 401 |
| SB-P-02 | 缺少必填欄位（任一） | 400 |
| SB-P-03 | 正常新增，enabled 預設 false | 200，{config: {...}} |
| SB-P-04 | 正常新增，sort_order 預設 0 | 200，sort_order=0 |
| SB-P-05 | DB 錯誤 | 500 |

**PUT**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| SB-U-01 | 未登入 | 401 |
| SB-U-02 | 缺少 id | 400 |
| SB-U-03 | 更新 enabled | 200，{config: {...}} |
| SB-U-04 | 只更新 allowedFields，忽略其他欄位 | 200，DB 只收到合法欄位 |
| SB-U-05 | DB 錯誤 | 500 |

**DELETE**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| SB-D-01 | 未登入 | 401 |
| SB-D-02 | 缺少 id（request body） | 400 |
| SB-D-03 | 正常刪除 | 200，{success: true} |
| SB-D-04 | DB 錯誤 | 500 |

### 4.5 自動化設定 API（/api/settings/automation）

**GET**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| AU-G-01 | 未登入 | 401 |
| AU-G-02 | 正常取得設定 + pending_raw_count | 200，包含 is_auto_mode 和 pending_raw_count |
| AU-G-03 | DB 設定查詢失敗 | 500 |
| AU-G-04 | pending count 查詢失敗時，pending_raw_count 為 0 | 200，pending_raw_count=0 |

**PUT**

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| AU-P-01 | 未登入 | 401 |
| AU-P-02 | article_threshold < 1 被忽略（不更新） | 200，DB 沒有收到 article_threshold |
| AU-P-03 | check_interval_minutes < 1 被忽略 | 200，DB 沒有收到 check_interval_minutes |
| AU-P-04 | 合法值全部更新 | 200，回傳更新後的設定 |
| AU-P-05 | is_auto_mode=false 更新 | 200，包含 is_auto_mode=false |
| AU-P-06 | DB 錯誤 | 500 |

### 4.6 儀表板統計 API（/api/dashboard/stats）

| # | 測試案例 | 期望結果 |
|---|---------|---------|
| DS-01 | 未登入 | 401 |
| DS-02 | 正常取得統計數據 | 200，包含所有 10 個統計欄位 |
| DS-03 | view_count 加總計算正確 | total_views = 各文章 view_count 之和 |
| DS-04 | view_count 為 null 時計算為 0 | total_views 不出現 NaN |
| DS-05 | 各 count 欄位為 0 時仍正常回傳 | 200，所有數字欄位為 0 |
| DS-06 | personas 和 channels 回傳陣列結構 | personas 和 channels 為陣列 |

## 5. 退出條件（Exit Criteria）

- 所有測試案例通過（0 failures）
- 涵蓋範圍：每個 API handler 的正常路徑 + 所有 400/401/500 錯誤路徑
- 認證保護：每個 handler 至少一個 401 測試
- 業務規則：所有 PRD 中提到的驗證規則有對應測試

## 6. 不在範圍內

- E2E 測試（Playwright）
- 前端元件測試（SportCard, ChannelForm 等）
- 資料庫 migration 驗證
- `/api/settings/sources` 爬蟲來源 API（複雜性較高，列為後續 issue）
- `/api/personas` 寫手 API（列為後續 issue）
- `/api/admin/analytics` 和 `/api/admin/visitors` 分析 API（列為後續 issue）
