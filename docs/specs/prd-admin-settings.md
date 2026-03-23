# PRD: 後台設定模組（Admin Settings）

## 1. 產品願景

提供一套直覺化的後台設定中心，讓內容營運者無需技術背景即可管理運動新聞平台的核心參數 -- 包括球種分類、爬蟲來源、發布頻道、即時比分來源、寫手人設，以及自動化管線設定。所有設定變更即時生效，無需重新部署。

### 解決的核心問題

- **營運自主性**：營運人員無需依賴工程師即可調整平台行為（開關球種、新增爬蟲來源等）
- **多維度可觀測**：透過儀表板與數據分析頁面，快速掌握平台運營狀態
- **設定集中化**：所有影響管線行為的設定集中在後台管理，避免散落在程式碼或環境變數中
- **操作安全性**：刪除等破壞性操作皆有二次確認機制，降低誤操作風險

## 2. 目標用戶

### 主要受眾

| 角色 | 使用頻率 | 需求 |
|------|---------|------|
| **內容營運者**（後台管理員） | 每日 | 監控平台狀態、調整球種/來源設定、管理寫手與頻道 |
| **站長/產品負責人** | 每週 | 查看數據分析、調整自動化策略、新增比分來源 |

### 設計策略傾向

直覺操作 + 即時反饋 -- 所有設定頁面使用 Switch/Toggle 即時切換，搭配 Toast 通知確認操作結果，不需要「儲存」按鈕（開關類操作）。表單類操作使用 Dialog 模式，支援 Enter 送出。

## 3. 核心使用場景

| # | 場景 | 使用者行為 | 期望結果 |
|---|------|-----------|---------|
| 1 | 查看平台概況 | 進入後台儀表板 | 一覽原始新聞數、今日產出、已發布數、瀏覽數等關鍵指標 |
| 2 | 監控爬蟲健康度 | 在儀表板查看爬蟲狀態區塊 | 看到每個來源的最後爬取時間與狀態燈號（綠/黃/紅） |
| 3 | 啟停球種 | 在球種分類頁切換開關 | 該球種的新聞立即納入/排除爬取與產文流程 |
| 4 | 設定球種爬蟲來源 | 在球種卡片勾選對應來源 | 該球種僅從勾選的來源爬取新聞 |
| 5 | 管理爬蟲來源 | 在爬蟲來源頁新增/編輯/刪除來源 | 新來源立即可被球種選用；刪除來源同步清理球種關聯 |
| 6 | 手動觸發爬蟲 | 在爬蟲來源頁點擊「爬取」按鈕 | 立即執行該來源的爬蟲，顯示爬取結果（新增/重複/過濾數量） |
| 7 | 管理發布頻道 | 在頻道頁新增 Telegram/Line 等頻道 | 發布文章時自動推送到所有啟用的頻道 |
| 8 | 管理即時比分 | 在比分設定頁新增/編輯聯賽 | 前台即時比分頁顯示對應聯賽的 ESPN 資料 |
| 9 | 管理寫手人設 | 在寫手管理頁設定風格與專長 | AI 產文時套用該寫手的語氣和專業領域 |
| 10 | 查看數據分析 | 切換「訪客分析」與「內容成效」分頁 | 掌握流量趨勢、熱門頁面、裝置分佈、文章表現等數據 |

## 4. 功能範圍

### 做什麼（In Scope）

#### 4.1 儀表板（Dashboard）

**路由**：`/admin`

**功能**：
- 8 張統計卡片：原始新聞總數、今日爬取、今日產出、未發布、已發布、今日發布、排程中、總瀏覽數
- 爬蟲狀態表格：顯示每個來源的文章數、最後爬取時間、健康狀態燈號
  - 綠燈：24 小時內有爬取
  - 黃燈：24-48 小時無爬取
  - 紅燈：超過 48 小時無爬取

**資料來源**：
- API：`GET /api/dashboard/stats`
- DB 表：`raw_articles`、`generated_articles`、`writer_personas`、`publish_channels`
- API：`GET /api/dashboard/crawler-status`

**技術實作**：
- TanStack Query 管理 server state
- `staleTime: 5min` + `refetchOnWindowFocus: false`（爬蟲狀態）

#### 4.2 球種分類（Sports Settings）

**路由**：`/admin/sports`

**功能**：
- 以卡片形式顯示所有球種（籃球、棒球、美式足球、足球）
- 每張卡片包含：
  - 球種名稱與關鍵字列表
  - 啟用/停用 Switch（即時切換）
  - 啟用狀態 Badge（已啟用/未啟用）
  - 爬蟲來源多選 Checkbox（僅啟用時顯示）
- 支援的球種定義在 `src/lib/sport-config.ts` 的 `SPORTS` 常數

**資料來源**：
- API：`GET /api/settings/sports` -- 取得各球種啟用狀態與已選來源
- API：`POST /api/settings/sports` -- 更新球種啟用狀態或來源
- DB 表：`sport_settings`（sport_key, enabled, sources, updated_at）
- API：`GET /api/settings/sources` -- 取得可用爬蟲來源列表

**業務規則**：
- `sport_key` 必須是 `SPORTS` 定義的有效值，否則 API 回傳 400
- 使用 `upsert` 策略，首次設定時自動建立記錄
- 預設啟用狀態來自 `SPORTS` 常數定義

#### 4.3 爬蟲來源管理（Crawl Sources）

**路由**：`/admin/sources`

**功能**：
- 來源列表：名稱、URL、圖片爬取開關、操作按鈕
- 新增來源：填入名稱 + Base URL
- 編輯來源：修改名稱或 URL（名稱變更時同步更新所有球種的來源引用）
- 刪除來源：二次確認 Dialog（刪除時同步清理所有球種的來源引用）
- 手動爬取：點擊觸發單一來源爬蟲，顯示結果（total / saved / duplicate / filtered）
- 圖片爬取開關：控制是否下載文章圖片

**資料來源**：
- API：`GET /api/settings/sources` -- 取得來源列表
- API：`POST /api/settings/sources` -- 新增來源
- API：`PUT /api/settings/sources` -- 更新來源
- API：`DELETE /api/settings/sources?id={id}` -- 刪除來源
- API：`POST /api/settings/sources/crawl` -- 手動觸發爬蟲
- DB 表：`crawl_sources`（id, name, base_url, is_active, crawl_images）

**業務規則**：
- 刪除來源時，自動從所有球種的 `sources` 陣列中移除該來源名稱
- 重新命名來源時，自動在所有球種的 `sources` 陣列中同步更新名稱
- 新增需填寫名稱和 URL，兩者皆必填

#### 4.4 發布頻道管理（Publish Channels）

**路由**：`/admin/channels`

**功能**：
- 頻道列表：以卡片形式顯示，包含名稱、類型、啟停開關
- 新增頻道：選擇類型（telegram / line / facebook / twitter）、填入名稱與設定
- 編輯頻道：修改名稱、類型、設定參數
- 刪除頻道：二次確認 AlertDialog
- 啟停切換：Switch 即時切換

**資料來源**：
- API：`GET /api/settings/channels` -- 取得頻道列表
- API：`POST /api/settings/channels` -- 新增頻道
- API：`PUT /api/settings/channels` -- 更新頻道
- API：`DELETE /api/settings/channels?id={id}` -- 刪除頻道
- DB 表：`publish_channels`（id, name, type, config, is_active, created_at）

**業務規則**：
- `name` 和 `type` 為必填欄位
- `config` 為 JSON 物件，儲存各頻道類型的專屬設定（如 bot_token、chat_id）
- 新增時預設 `is_active = true`
- 每種頻道類型有對應的 config 欄位模板（由 `resetConfigForType` 函式定義）

#### 4.5 即時比分設定（Scoreboard Configs）

**路由**：`/admin/scoreboard`

**功能**：
- 比分來源表格：排序、聯賽名稱、ESPN Endpoint、球種、啟用開關、操作按鈕
- 新增比分來源：Dialog 表單（球種 Key、聯賽 Key、顯示名稱、ESPN Endpoint、排序）
- 編輯比分來源：同上 Dialog（league_key 編輯時不可修改）
- 刪除比分來源：二次確認 Dialog
- 啟停切換：Switch 即時切換

**資料來源**：
- API：`GET /api/settings/scoreboard` -- 取得設定列表（按 sort_order 排序）
- API：`POST /api/settings/scoreboard` -- 新增設定
- API：`PUT /api/settings/scoreboard` -- 更新設定
- API：`DELETE /api/settings/scoreboard` -- 刪除設定（body 傳 id）
- DB 表：`scoreboard_configs`（id, sport_key, league_key, label, espn_endpoint, enabled, sort_order, updated_at）

**業務規則**：
- `sport_key`、`league_key`、`label`、`espn_endpoint` 為必填欄位
- `league_key` 為唯一值，建立後不可修改
- 預設 `enabled = false`、`sort_order = 0`
- 球種名稱顯示使用 `SPORT_KEY_LABELS` 常數映射
- 表單支援 Enter 送出（`onKeyDown` 攔截）

#### 4.6 寫手管理（Writer Personas）

**路由**：`/admin/personas`

**功能**：
- 寫手列表：以卡片形式顯示，包含名稱、描述、類型、專長、啟停開關
- 新增寫手：表單包含名稱、描述、風格提示詞、寫手類型、專長設定、最大文章數、頭像 URL、專長標籤
- 編輯寫手：點擊編輯後頁面上方顯示表單，自動捲動到頂部
- 刪除寫手：二次確認 AlertDialog
- 啟停切換：Switch 即時切換
- 系統寫作規則：獨立區塊顯示全域寫作規則設定

**資料來源**：
- API：`GET /api/personas` -- 取得寫手列表
- API：`POST /api/personas` -- 新增寫手
- API：`PUT /api/personas` -- 更新寫手
- API：`DELETE /api/personas?id={id}` -- 刪除寫手
- DB 表：`writer_personas`

**業務規則**：
- `name` 和 `style_prompt` 為必填
- `writer_type` 預設為 `columnist`
- `max_articles` 預設為 2
- `specialties` 包含 sports / leagues / teams 三個維度
- `specialty_tags` 以逗號分隔的標籤字串

#### 4.7 數據分析（Analytics）

**路由**：`/admin/analytics`

**功能**：

**訪客分析（Visitor Tab）**：
- 6 張摘要卡片：今日 PV、今日 UV、總 PV、總 UV、頁/人、會員瀏覽數
- 每日 PV/UV 趨勢：橫條圖顯示每日數據
- 熱門頁面 TOP 20：路徑、PV、UV
- 流量來源：來源名稱、百分比長條圖
- 裝置分佈：Desktop / Mobile / Tablet 佔比
- 最近訪客：可展開的 session 列表（含瀏覽軌跡）
- 時間範圍切換：7 天 / 30 天 / 90 天

**內容成效（Content Tab）**：
- 4 張摘要卡片：總瀏覽次數、已發布文章、平均瀏覽數、平均文章長度
- 每日文章瀏覽趨勢（近 30 天）：直條圖
- 熱門文章 TOP 10：標題、分類、瀏覽次數
- 分類瀏覽統計：各分類的文章數與瀏覽數

**資料來源**：
- API：`GET /api/admin/analytics` -- 內容成效數據
- API：`GET /api/admin/visitors?period={period}` -- 訪客分析數據
- DB 表：`generated_articles`（view_count, like_count, published_at, category）
- DB RPC：`get_avg_content_length`（伺服器端計算平均文章長度）

**技術實作**：
- 使用 `nuqs` 管理 URL state（tab、period 參數）
- Tab 切換使用 `enabled` 條件控制 query 執行，避免不必要的 API 呼叫
- Server Component 外殼 + Client Component 內容（`Suspense` 包裹）

#### 4.8 自動化設定（Automation Settings）

**功能**：
- 自動模式開關：控制管線是否自動觸發
- 文章門檻：累積多少篇素材後自動開始規劃
- 檢查間隔：自動檢查的頻率（分鐘）
- 待處理素材數：顯示目前未處理的 raw_articles 數量

**資料來源**：
- API：`GET /api/settings/automation` -- 取得設定 + 待處理數
- API：`PUT /api/settings/automation` -- 更新設定
- DB 表：`automation_settings`（id=1, is_auto_mode, article_threshold, check_interval_minutes, updated_at）

**業務規則**：
- 全域單一設定（固定 id=1）
- `article_threshold` 最小值為 1
- `check_interval_minutes` 最小值為 1

### 不做什麼（Out of Scope）

- 後台使用者角色權限管理（目前所有登入使用者皆為管理員）
- 設定版本歷史與回滾
- 設定匯出/匯入
- 多語系支援（目前僅繁體中文）
- 批次操作（如一次啟停多個球種）

## 5. 資訊架構

### 後台導覽結構

```
後台（/admin）
├── 總覽
│   ├── 儀表板（/admin）
│   ├── 管線狀態（/admin/pipeline）
│   └── 數據分析（/admin/analytics）
├── 內容
│   ├── 文章管理（/admin/articles）
│   ├── 審稿佇列（/admin/review）
│   └── 素材庫（/admin/raw）
└── 設定
    ├── 寫手管理（/admin/personas）
    ├── 球種分類（/admin/sports）
    ├── 爬蟲來源（/admin/sources）
    ├── 發布頻道（/admin/channels）
    └── 比分設定（/admin/scoreboard）
```

### 側邊欄 UI

- 深色背景（`#0f172a`），分三組顯示
- 當前頁面高亮（白色背景 + 粗體）
- 審稿佇列與素材庫顯示待處理數量 Badge（每 60 秒自動刷新）
- 響應式：桌面固定顯示，手機以 overlay 方式開合
- 底部登出按鈕

## 6. API 端點總覽

| 端點 | 方法 | 功能 | 認證 |
|------|------|------|------|
| `/api/dashboard/stats` | GET | 儀表板統計數據 | NextAuth session |
| `/api/dashboard/crawler-status` | GET | 爬蟲狀態 | NextAuth session |
| `/api/settings/sports` | GET | 球種設定列表 | NextAuth session |
| `/api/settings/sports` | POST | 更新球種設定 | NextAuth session |
| `/api/settings/sources` | GET | 爬蟲來源列表 | NextAuth session |
| `/api/settings/sources` | POST | 新增爬蟲來源 | NextAuth session |
| `/api/settings/sources` | PUT | 更新爬蟲來源 | NextAuth session |
| `/api/settings/sources` | DELETE | 刪除爬蟲來源 | NextAuth session |
| `/api/settings/sources/crawl` | POST | 手動觸發爬蟲 | NextAuth session |
| `/api/settings/channels` | GET | 頻道列表 | NextAuth session |
| `/api/settings/channels` | POST | 新增頻道 | NextAuth session |
| `/api/settings/channels` | PUT | 更新頻道 | NextAuth session |
| `/api/settings/channels` | DELETE | 刪除頻道 | NextAuth session |
| `/api/settings/scoreboard` | GET | 比分設定列表 | NextAuth session |
| `/api/settings/scoreboard` | POST | 新增比分設定 | NextAuth session |
| `/api/settings/scoreboard` | PUT | 更新比分設定 | NextAuth session |
| `/api/settings/scoreboard` | DELETE | 刪除比分設定 | NextAuth session |
| `/api/settings/automation` | GET | 自動化設定 | NextAuth session |
| `/api/settings/automation` | PUT | 更新自動化設定 | NextAuth session |
| `/api/personas` | GET | 寫手列表 | NextAuth session |
| `/api/personas` | POST | 新增寫手 | NextAuth session |
| `/api/personas` | PUT | 更新寫手 | NextAuth session |
| `/api/personas` | DELETE | 刪除寫手 | NextAuth session |
| `/api/admin/analytics` | GET | 內容分析數據 | NextAuth session |
| `/api/admin/visitors` | GET | 訪客分析數據 | NextAuth session |
| `/api/admin/pipeline-status` | GET | 側邊欄 Badge 數據 | NextAuth session |

## 7. 資料模型

### DB Tables

```
sport_settings
├── sport_key (PK, text)     -- 球種識別碼（basketball, baseball, football, soccer）
├── enabled (boolean)         -- 啟用狀態
├── sources (text[])          -- 啟用的爬蟲來源名稱陣列
└── updated_at (timestamptz)  -- 最後更新時間

crawl_sources
├── id (PK, serial)
├── name (text)               -- 來源名稱
├── base_url (text)           -- 來源基礎 URL
├── is_active (boolean)       -- 啟用狀態
└── crawl_images (boolean)    -- 是否爬取圖片

publish_channels
├── id (PK, serial)
├── name (text)               -- 頻道名稱
├── type (text)               -- 頻道類型（telegram/line/facebook/twitter）
├── config (jsonb)            -- 頻道專屬設定（bot_token, chat_id 等）
├── is_active (boolean)       -- 啟用狀態
└── created_at (timestamptz)  -- 建立時間

scoreboard_configs
├── id (PK, serial)
├── sport_key (text)          -- 球種識別碼
├── league_key (text, unique) -- 聯賽識別碼（如 nba, mlb, epl）
├── label (text)              -- 顯示名稱
├── espn_endpoint (text)      -- ESPN API 端點路徑
├── enabled (boolean)         -- 啟用狀態
├── sort_order (integer)      -- 前台顯示排序
└── updated_at (timestamptz)  -- 最後更新時間

automation_settings
├── id (PK, integer)          -- 固定為 1（單一全域設定）
├── is_auto_mode (boolean)    -- 自動模式開關
├── article_threshold (integer) -- 觸發規劃的素材門檻
├── check_interval_minutes (integer) -- 檢查間隔（分鐘）
└── updated_at (timestamptz)  -- 最後更新時間

writer_personas
├── id (PK, uuid)
├── name (text)               -- 寫手名稱
├── description (text)        -- 寫手描述
├── style_prompt (text)       -- AI 風格提示詞
├── is_active (boolean)       -- 啟用狀態
├── writer_type (text)        -- 寫手類型（columnist/reporter）
├── specialties (jsonb)       -- 專長設定 {sports, leagues, teams}
├── max_articles (integer)    -- 每批次最大文章數
├── avatar_url (text)         -- 頭像 URL
└── specialty_tags (text[])   -- 專長標籤陣列
```

### 前端 State 管理

| 資料類型 | 管理方式 | Query Key |
|---------|---------|-----------|
| 球種設定 | TanStack Query | `["sport-settings"]` |
| 爬蟲來源 | TanStack Query | `["crawl-sources"]` |
| 頻道列表 | TanStack Query | `["channels"]` |
| 比分設定 | TanStack Query | `["scoreboard-configs"]` |
| 寫手列表 | TanStack Query | `["personas"]` |
| 儀表板統計 | TanStack Query | `["dashboard-stats"]` |
| 爬蟲狀態 | TanStack Query | `["crawler-status"]` |
| 側邊欄 Badge | TanStack Query | `["sidebar-badges"]` |
| 內容分析 | TanStack Query | `["analytics-content"]` |
| 訪客分析 | TanStack Query | `["analytics-visitors", period]` |
| 分析 Tab/Period | nuqs URL state | `tab`, `period` |

## 8. 共用元件與設計模式

### UI 元件庫

基於 shadcn/ui，後台設定模組使用以下元件：

| 元件 | 用途 |
|------|------|
| `Card` / `CardHeader` / `CardContent` | 卡片式佈局（球種、寫手、頻道、統計） |
| `Switch` | 啟停切換（即時生效） |
| `Dialog` / `DialogContent` | 表單彈窗（比分設定新增/編輯） |
| `AlertDialog` | 刪除確認（頻道、來源、寫手） |
| `Table` / `TableRow` | 表格佈局（比分設定列表） |
| `Button` | 操作按鈕 |
| `Input` / `Label` | 表單欄位 |
| `toast`（sonner） | 操作結果通知 |

### 共用設計模式

1. **Optimistic Update + Invalidation**：所有 mutation 在 `onSuccess` 中呼叫 `invalidateQueries` 刷新相關 query，確保畫面與資料庫同步。
2. **Loading State**：統一顯示「載入中...」文字，分析頁使用 Skeleton 動畫。
3. **Empty State**：統一顯示灰色居中文字（如「尚無比分來源設定」）。
4. **Error Boundary**：儀表板在 API 失敗時顯示紅色錯誤提示。
5. **認證保護**：所有 API route 首先驗證 `auth()` session，未登入回傳 401。
6. **Service Client**：所有 API 使用 `createServiceClient()` 取得 Supabase 管理權限客戶端。

## 9. 跨模組依賴

| 設定項 | 影響的下游模組 |
|--------|--------------|
| 球種啟停 | 爬蟲過濾（僅爬取啟用球種的新聞）、管線規劃（僅為啟用球種產文） |
| 爬蟲來源 | 爬蟲排程（決定從哪些網站爬取）、球種來源對應 |
| 發布頻道 | 文章發布（決定推送到哪些社群平台） |
| 比分設定 | 前台即時比分頁（決定顯示哪些聯賽的比分） |
| 寫手人設 | AI 產文（決定文章風格與專長領域） |
| 自動化設定 | rewrite-listener（決定是否自動觸發管線與觸發門檻） |

## 10. 安全性

- **認證**：所有後台頁面和 API 端點皆需 NextAuth session 驗證
- **授權**：目前為單一角色（管理員），未實作細粒度權限
- **輸入驗證**：API 層驗證必填欄位與資料型別，無效輸入回傳 400
- **CSRF**：Next.js App Router 內建 CSRF 保護
- **SQL Injection**：透過 Supabase Client SDK 參數化查詢，無直接 SQL 拼接

## 11. 已知限制與技術債

| 項目 | 說明 | 影響 |
|------|------|------|
| 無 RBAC | 所有登入使用者皆為管理員，無角色區分 | 多人協作時無法限制操作權限 |
| 球種硬編碼 | 球種列表定義在 `sport-config.ts`，新增球種需改程式碼 | 無法從後台動態新增球種 |
| 刪除無軟刪除 | 來源、頻道、比分設定刪除為硬刪除 | 誤刪無法復原 |
| 自動化設定單一全域 | 全站共用一組自動化參數（id=1） | 無法為不同球種設定不同門檻 |
| 爬蟲來源與球種透過名稱關聯 | `sport_settings.sources` 儲存來源名稱字串而非 ID | 來源重新命名需額外同步邏輯 |
| 分析頁無快取 | 每次進入都重新查詢全部已發布文章 | 文章量大時 API 回應可能變慢 |
| DELETE API 風格不一致 | channels 用 query param，scoreboard 用 body | 維護成本略高 |

## 12. 相關檔案索引

### 前端頁面

| 檔案 | 功能 |
|------|------|
| `src/app/admin/page.tsx` | 儀表板頁面 |
| `src/app/admin/sports/page.tsx` | 球種分類頁面 |
| `src/app/admin/sources/page.tsx` | 爬蟲來源頁面 |
| `src/app/admin/channels/page.tsx` | 發布頻道頁面 |
| `src/app/admin/scoreboard/page.tsx` | 比分設定頁面 |
| `src/app/admin/personas/page.tsx` | 寫手管理頁面 |
| `src/app/admin/analytics/page.tsx` | 數據分析頁面（Server Component 外殼） |
| `src/app/admin/analytics/AnalyticsClient.tsx` | 數據分析頁面（Client Component） |
| `src/app/admin/layout.tsx` | 後台 Layout（Server Component） |
| `src/app/admin/AdminLayoutClient.tsx` | 後台 Layout（Client Component，含側邊欄） |

### API Routes

| 檔案 | 功能 |
|------|------|
| `src/app/api/dashboard/stats/route.ts` | 儀表板統計 API |
| `src/app/api/settings/sports/route.ts` | 球種設定 API |
| `src/app/api/settings/sources/route.ts` | 爬蟲來源 API |
| `src/app/api/settings/channels/route.ts` | 發布頻道 API |
| `src/app/api/settings/scoreboard/route.ts` | 比分設定 API |
| `src/app/api/settings/automation/route.ts` | 自動化設定 API |
| `src/app/api/personas/route.ts` | 寫手 API |
| `src/app/api/admin/analytics/route.ts` | 內容分析 API |
| `src/app/api/admin/visitors/route.ts` | 訪客分析 API |

### 共用模組

| 檔案 | 功能 |
|------|------|
| `src/lib/sport-config.ts` | 球種定義常數（SPORTS） |
| `src/lib/constants.ts` | 共用常數（SPORT_KEY_LABELS 等） |
| `src/components/admin/sports/SportCard.tsx` | 球種卡片元件 |
| `src/components/admin/sports/types.ts` | 球種相關 TypeScript 型別 |
| `src/components/admin/sports/CrawlSourceList.tsx` | 爬蟲來源列表元件 |
| `src/components/admin/channels/ChannelForm.tsx` | 頻道表單元件 |
| `src/components/admin/channels/ChannelCard.tsx` | 頻道卡片元件 |
| `src/components/admin/channels/channel-types.ts` | 頻道類型定義與設定模板 |
| `src/components/admin/personas/PersonaForm.tsx` | 寫手表單元件 |
| `src/components/admin/personas/PersonaCard.tsx` | 寫手卡片元件 |
| `src/components/admin/personas/WritingRulesSection.tsx` | 系統寫作規則元件 |
| `src/components/admin/personas/types.ts` | 寫手相關 TypeScript 型別 |
