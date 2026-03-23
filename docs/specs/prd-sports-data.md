# PRD: 賽事數據模組（Sports Data Module）

## 1. 產品願景

提供一站式的體育賽事數據中心，整合 ESPN 公開 API 的即時比分、戰績排名、比賽詳情、球隊球員資料與賠率分析，讓台灣運動迷能以繁體中文介面快速掌握 NBA、MLB 等聯賽的完整數據。透過訪客/會員分級策略，在免費提供基本資訊的同時，以進階數據驅動會員註冊。

### 解決的核心問題

- **語言障礙**：台灣用戶需要繁體中文的運動數據，而 ESPN 僅提供英文內容
- **資料分散**：比分、排名、賠率、球員數據散佈在不同平台，缺乏整合入口
- **即時性需求**：比賽進行中需要即時更新的比分與逐球紀錄
- **數據深度**：一般新聞網站只有表面比分，缺乏 Box Score、勝率走勢等進階分析

## 2. 目標用戶

### 主要受眾

| 角色 | 使用頻率 | 需求 |
|------|---------|------|
| **一般球迷**（訪客） | 每日 | 查看即時比分、排名、基本賠率 |
| **進階球迷**（會員） | 每日多次 | 完整 Box Score、逐球紀錄、多家賠率比較、球員 Game Log |
| **運彩玩家**（會員） | 賽前/賽中 | 賠率分析、ATS 紀錄、專家預測、歷史交手 |

### Persona

**阿凱 -- 一般球迷**
- 每天睡前想快速看 NBA 今日比分和排名
- 習慣中文介面，不想切到英文網站
- 有時會想看特定球員的本季表現

**小陳 -- 運彩玩家**
- 需要多家賠率比較做決策
- 關注 ATS 紀錄、勝率走勢、專家預測
- 願意註冊會員換取更深度的數據

### 設計策略傾向

免費吸引流量 + 進階數據驅動會員轉換。基本比分與排名完全公開，深度分析資料需登入。

## 3. 核心使用場景

| # | 場景 | 使用者行為 | 期望結果 |
|---|------|-----------|---------|
| 1 | 查看今日比分 | 訪客進入比分頁，選擇聯賽 | 看到當日所有比賽的即時比分，每 60 秒自動更新 |
| 2 | 查看歷史比分 | 訪客透過日期選擇器切換日期 | 看到該日所有比賽的最終比分 |
| 3 | 查看聯賽排名 | 訪客進入排名頁，切換聯賽 Tab | 看到按分區分組的完整戰績表 |
| 4 | 瀏覽比賽詳情 | 訪客從比分頁點進特定比賽 | 看到摘要（Leaders/交手紀錄/專家預測）、Box Score、逐球紀錄、賠率、傷兵名單 |
| 5 | 查看球隊資訊 | 從排名頁點進特定球隊 | 看到球隊基本資訊、ATS 紀錄、球員名單 |
| 6 | 查看球員數據 | 從球隊頁點進特定球員 | 看到球員基本資料、本季數據、比賽紀錄（Game Log） |
| 7 | 賠率比較 | 會員進入賠率中心 | 看到今日所有比賽的多家賠率比較（Spread/O&U/ML） |
| 8 | 關注球隊 | 會員在球隊頁點「關注」 | 球隊加入收藏，首頁優先顯示相關新聞 |

## 4. 功能範圍

### 做什麼（In Scope）

#### 4.1 即時比分（Scoreboard）

- **聯賽切換**：支援多聯賽 Tab 切換（由 `scoreboard_configs` DB 表動態設定）
- **日期選擇**：DatePicker 切換歷史日期，「今天」快捷按鈕回到當日
- **即時輪詢**：當日比分每 60 秒自動刷新（`SCOREBOARD_POLLING_MS`），歷史日期不輪詢
- **比分卡片**：每場比賽顯示雙方隊伍 Logo、名稱、比分、戰績、賽事狀態
- **基本賠率**：比分卡片內嵌 Spread + O/U（來自 Scoreboard API 的 odds 欄位）
- **連結導航**：點擊比分卡片進入比賽詳情頁

**資料來源**：`/api/public/scoreboard` -> `fetchScoreboard()` -> ESPN Scoreboard API

**快取策略**：當日 10 秒 TTL，歷史 24 小時 TTL

#### 4.2 戰績排名（Standings）

- **聯賽切換**：NBA / MLB Tab 切換（使用 `LEAGUE_OPTIONS` 常數）
- **分組顯示**：按 Conference/Division 分組呈現
- **排名資料**：
  - NBA：勝、負、勝率、勝差、主場、客場、近 10 場、連續、場均得分、場均失分、分差
  - MLB：勝、負、勝率、勝差、主場、客場、近 10 場、得分、失分、分差
- **視覺強化**：前三名排名徽章（金/銀/銅）、勝率欄位背景色漸變
- **連結導航**：點擊球隊名稱進入球隊詳情頁

**資料來源**：`/api/public/standings` -> `fetchStandings()` -> ESPN Standings API（注意：使用 `/apis/v2/` 而非 `/apis/site/v2/`）

**快取策略**：5 分鐘 TTL

#### 4.3 比賽詳情（Game Detail）

五個 Tab 頁面，透過 URL query `?tab=` 管理狀態：

**4.3.1 摘要 Tab（Summary）**
- 比賽頭部：雙方隊伍 Logo、名稱、比分、戰績、狀態 Badge
- Leaders：雙方本場最佳球員（得分/籃板/助攻）
- 勝率走勢：Win Probability 資料（已結束比賽）
- 歷史交手：Season Series 本季對戰紀錄
- 專家預測：Pick Center 各家勝率預測

**4.3.2 數據 Tab（Box Score）**
- 球隊整場統計對比（FG/3PT/FT/REB/AST/TO/STL/BLK 等）
- 每位球員個人數據表格（按先發/替補分組）
- 僅比賽開始後（非 scheduled）才顯示此 Tab

**4.3.3 逐球紀錄 Tab（Play-by-Play）**
- 訪客：前 5 筆 PBP + 「登入查看完整紀錄」提示
- 會員：完整逐球紀錄
- PBP 文字自動中文化（`translate-pbp.ts`，涵蓋籃球、棒球、足球術語）

**4.3.4 賠率 Tab（Odds）**
- 顯示 Spread、O/U、MoneyLine

**4.3.5 傷兵 Tab（Injuries）**
- 雙方傷兵名單（球員名、狀態、傷勢描述）

**資料來源**：`/api/public/game` -> 各 `fetch*()` 函式 -> ESPN Summary API（統一端點，不同 `type` 參數取不同資料切片）

**快取策略**：進行中 10 秒 TTL，已結束 1 小時 TTL

#### 4.4 球隊詳情（Team Detail）

- **基本資訊**：隊名、縮寫、Logo、戰績、排名摘要
- **ATS 紀錄**：Against the Spread 本季勝/負/平
- **球員名單**（Roster）：
  - 訪客：前 5 名球員（背號、名稱、位置、年齡），第 6-8 名模糊顯示
  - 會員：完整名單 + 身高、體重欄位
- **關注功能**：會員可關注/取消關注球隊
- **SEO 優化**：支援 slug URL（如 `/team/nba/lakers`）自動 308 redirect 到 canonical URL

**資料來源**：`/api/public/team` -> `fetchTeam()` + Roster API + ATS API -> ESPN Team API

**快取策略**：10 分鐘 TTL

#### 4.5 球員詳情（Player Detail）

- **基本資訊**：照片、姓名、背號、位置、所屬球隊、身高、體重、年齡、大學
- **本季數據**：
  - 訪客：前 3 項數據，第 4-5 項模糊顯示 + 「登入查看完整數據」提示
  - 會員：完整數據列表
- **比賽紀錄**（Game Log）：
  - 延遲載入（點擊按鈕才 fetch）
  - 顯示日期、對手、結果、詳細數據欄位

**資料來源**：`/api/public/player` -> `fetchPlayer()` + `fetchPlayerGameLog()` -> ESPN Player API

**快取策略**：10 分鐘 TTL

#### 4.6 賠率中心（Odds Center）

- **聯賽切換**：NBA / MLB Tab 切換
- **今日全部賽事**：列出當日所有比賽及其賠率
- **訪客版**：僅顯示 Spread + O/U，MoneyLine 隱藏 + 鎖頭圖示提示登入
- **會員版**：完整多 Provider 賠率表格（Spread / O/U / ML 客 / ML 主）
- **連結導航**：點擊比賽進入比賽詳情頁

**資料來源**：Scoreboard API（取比賽列表）+ Member Game API（會員多 Provider 賠率）

#### 4.7 中文化支援

- **球隊名稱**：`TEAM_NAME_ZH` 常數表對照翻譯（涵蓋 NBA 30 隊 + MLB 30 隊）
- **分區名稱**：`getConferenceNameZh()` 函式翻譯 Conference/Division 名稱
- **PBP 文字**：`translatePbpText()` 正規表達式批次翻譯（80+ 術語，涵蓋籃球得分/犯規/籃板、棒球投打、足球動作）
- **時間轉換**：EDT/EST 自動轉為台灣時間（UTC+8）

#### 4.8 跨頁面導航架構

```
/scores（比分頁）
  -> /game/{league}/{eventId}（比賽詳情）
      -> /team/{sport}/{teamId}（球隊詳情）

/standings/{sport}（排名頁）
  -> /team/{sport}/{teamId}（球隊詳情）
      -> /player/{sport}/{playerId}（球員詳情）
          -> /team/...（返回球隊）

/odds（賠率中心）
  -> /game/{league}/{eventId}（比賽詳情）
```

所有頁面間導航使用 `src/lib/routes.ts` 的 type-safe route helper，禁止手動字串拼接。

### 不做什麼（Out of Scope）

- 即時串流推播（WebSocket / SSE）-- 目前使用輪詢方案
- 歷史賽季數據查詢
- 球員交易/轉會追蹤
- 自建數據計算（進階數據分析如 PER、WS 等）
- 賽事預測模型
- 多語言切換（目前僅繁體中文）

## 5. 技術架構

### 5.1 系統架構概覽

```
┌─────────────────────┐     ┌───────────────────────┐
│   前端（Next.js）     │     │    ESPN Public API     │
│                      │     │                       │
│  ┌────────────────┐  │     │  Scoreboard API       │
│  │ ScoreboardClient│◄─┼──┐  │  Standings API        │
│  │ StandingsClient │  │  │  │  Summary API          │
│  │ GameDetailClient│  │  │  │  Team API + Roster    │
│  │ TeamDetailClient│  │  │  │  Player API + Overview│
│  │ PlayerDetailClient│ │  │  └───────────────────────┘
│  │ OddsClient      │  │  │            ▲
│  └────────┬────────┘  │  │            │
│           │ useQuery   │  │  ┌─────────┴────────────┐
│           ▼            │  │  │  ESPN Client Layer    │
│  ┌────────────────┐   │  │  │  (src/lib/espn/)      │
│  │ API Routes     │   │  └──┤                       │
│  │ /api/public/*  │◄──┼─────┤  - In-memory cache    │
│  │ /api/member/*  │   │     │  - TTL-based expiry   │
│  └────────────────┘   │     │  - Zod validation     │
│                       │     │  - Error handling     │
└───────────┬───────────┘     └───────────────────────┘
            │
            ▼
    ┌───────────────┐
    │   Supabase    │
    │               │
    │ scoreboard_   │
    │ configs       │
    │ (啟用聯賽設定) │
    └───────────────┘
```

### 5.2 前端架構

| 層級 | 技術 | 說明 |
|------|------|------|
| 頁面路由 | Next.js App Router | Server Component 做 metadata + 初始資料，Client Component 做互動 |
| 狀態管理 | TanStack Query | Server state 全部透過 `useQuery` / `useMutation` 管理 |
| URL 狀態 | nuqs | Tab 切換、聯賽選擇、日期選擇用 URL search params |
| UI 元件 | shadcn/ui + Tailwind | Card、Tabs、Badge、Button 等統一元件庫 |
| 認證 | NextAuth.js | `useSession()` 判斷會員身份，控制資料分級 |

### 5.3 ESPN API 整合層

**模組結構**：`src/lib/espn/`

| 檔案 | 職責 |
|------|------|
| `client.ts` | 統一 HTTP client、in-memory cache、TTL 設定、錯誤處理 |
| `types.ts` | ESPN API 原始回傳型別定義 |
| `schemas.ts` | Zod runtime 驗證（ID 格式、百分比 0-1/0-100 scale） |
| `scoreboard.ts` | Scoreboard 解析（比分、狀態、隊伍、賠率） |
| `standings.ts` | Standings 解析（分組、排名、統計數據） |
| `play-by-play.ts` | Summary API 解析（PBP、Box Score、Leaders、傷兵、勝率、Season Series、Pick Center） |
| `odds.ts` | 賠率解析（多 Provider、訪客/會員分級） |
| `team.ts` | 球隊資訊 + ATS 解析 |
| `player.ts` | 球員資訊 + Game Log 解析 |
| `translate-pbp.ts` | PBP 文字中文化（80+ 正規表達式規則） |
| `index.ts` | 統一出口 |

**快取機制**：

| 常數 | TTL | 適用對象 |
|------|-----|---------|
| `LIVE` | 10 秒 | 即時比分、進行中比賽 PBP |
| `ODDS` | 60 秒 | 賠率資料 |
| `STANDINGS` | 5 分鐘 | 排名資料 |
| `TEAM` | 10 分鐘 | 球隊/球員基本資料 |
| `PBP_FINAL` | 1 小時 | 已結束比賽的所有 Summary 資料 |
| `HISTORICAL` | 24 小時 | 歷史日期的 Scoreboard 資料 |

**數值契約**：
- ESPN API 百分比回傳為 0-1 scale（如 `winPercentage: 0.65`），前端顯示時才乘以 100
- 關鍵數值欄位使用 Zod schema 做 runtime 驗證，失敗時 console.warn 並回傳 fallback 值

### 5.4 API Routes

| 端點 | 方法 | 參數 | 說明 |
|------|------|------|------|
| `/api/public/scoreboard` | GET | `league`, `date?` | 即時比分（需先查 DB 確認聯賽已啟用） |
| `/api/public/standings` | GET | `league` | 戰績排名 |
| `/api/public/game` | GET | `eventId`, `league`, `type` | 比賽詳情（type: plays/odds/boxscore/leaders/injuries/winprobability/seasonseries/pickcenter） |
| `/api/public/team` | GET | `sport`, `id`, `type?` | 球隊資訊（type: roster/ats） |
| `/api/public/player` | GET | `sport`, `id`, `type?` | 球員資訊（type: gamelog） |
| `/api/member/game` | GET | `eventId`, `league`, `type` | 會員版比賽詳情（完整 PBP、完整賠率） |

### 5.5 資料庫表

| 表名 | 用途 | 關鍵欄位 |
|------|------|---------|
| `scoreboard_configs` | 控制前端顯示哪些聯賽的比分 | `league_key`, `label`, `espn_endpoint`, `enabled`, `sort_order` |

### 5.6 SEO 優化

- 每個頁面都有 `generateMetadata()` 產生動態 title + OG Image
- Game、Player、Team 頁面有 JSON-LD 結構化資料（`GameJsonLd`, `PlayerJsonLd`, `TeamJsonLd`）
- 球隊支援 slug URL（如 `/team/nba/lakers`）並 308 redirect 到 canonical URL
- `src/lib/routes.ts` 提供 `absolute*Url()` helper 產生完整 URL 供 sitemap/SEO 使用

## 6. 訪客/會員分級策略

| 功能 | 訪客 | 會員 |
|------|------|------|
| 即時比分 | 完整 | 完整 |
| 戰績排名 | 完整 | 完整 |
| 比賽摘要（Leaders/交手/預測） | 完整 | 完整 |
| Box Score | 完整 | 完整 |
| 逐球紀錄 | 前 5 筆 + 總筆數提示 | 完整 |
| 賠率 | Spread + O/U（單一 Provider） | 多 Provider + MoneyLine |
| 球隊球員名單 | 前 5 名 + 模糊 | 完整 + 身高體重 |
| 球員本季數據 | 前 3 項 + 模糊 | 完整 |
| 球員 Game Log | 完整 | 完整 |
| 關注球隊 | 不可 | 可 |

**分級實作方式**：
- `fetchPlayByPlayPreview()` / `fetchOddsPreview()` 回傳裁剪版資料
- 前端 `MemberGate` 元件控制 UI 顯示/模糊效果
- 會員版 API 走 `/api/member/*` 路由（需 session 驗證）

## 7. 支援的聯賽

| 聯賽 | Key | ESPN 路徑 | 目前狀態 |
|------|-----|----------|---------|
| NBA | `nba` | `basketball/nba` | 已啟用 |
| MLB | `mlb` | `baseball/mlb` | 已啟用 |
| NFL | `nfl` | `football/nfl` | 已設定路徑，可啟用 |
| NHL | `nhl` | `hockey/nhl` | 已設定路徑，可啟用 |
| 英超 | `epl` | `soccer/eng.1` | 已設定路徑，可啟用 |
| 西甲 | `laliga` | `soccer/esp.1` | 已設定路徑，可啟用 |
| 歐冠 | `ucl` | `soccer/uefa.champions` | 已設定路徑，可啟用 |
| MLS | `mls` | `soccer/usa.1` | 已設定路徑，可啟用 |

新增聯賽只需在 `SPORT_PATHS` 加路徑 + DB `scoreboard_configs` 加設定即可。

## 8. 已知限制與技術債

### 8.1 架構層面

| 項目 | 現狀 | 影響 |
|------|------|------|
| In-memory cache | 各 Node.js instance 獨立快取 | Serverless 環境下快取命中率低 |
| Standings 獨立快取 | `standings.ts` 有自己的 cache Map，未使用統一 `espnFetch` | 維護兩套快取邏輯 |
| Scoreboard API route 引用舊模組 | `/api/public/scoreboard` 引用 `@/lib/scoreboard` 而非 `@/lib/espn/scoreboard` | 新舊模組共存 |

### 8.2 資料層面

| 項目 | 現狀 | 影響 |
|------|------|------|
| ESPN API 為非官方公開 API | 無 SLA 保證，隨時可能變更結構 | 需要 Zod runtime 驗證做防禦 |
| PBP 翻譯為正規表達式 | 無法處理複合語句、球員名與術語混合 | 部分翻譯結果不自然 |
| Summary API 多用途 | Box Score/Leaders/Injuries/WinProb/SeasonSeries/PickCenter 全部從同一 endpoint 取 | 每個 Tab 切換都會請求完整 Summary（雖有快取） |
| `play-by-play.ts` 使用大量 `any` 型別 | 為配合 ESPN 不穩定的回傳結構 | 型別安全性較低 |
| Player Overview 端點不穩定 | 部分球員呼叫 `/overview` 會回傳錯誤 | 需要 fallback 處理 |

### 8.3 前端層面

| 項目 | 現狀 | 影響 |
|------|------|------|
| 球隊中文名硬編碼 | `TEAM_NAME_ZH` 常數表，新增隊伍需手動維護 | 擴充新聯賽需大量翻譯 |
| MLB Standings 結構差異 | MLB 多一層 Division，目前用同一解析邏輯 | 可能遺漏 Division 層級 |
| 缺少錯誤邊界 | API 失敗時部分頁面只顯示空白或 spinner | 用戶體驗不佳 |

## 9. 非功能性需求

### 9.1 效能

| 指標 | 目標 | 現況 |
|------|------|------|
| 比分頁首次載入 | < 2 秒 | 透過 SSR 取聯賽設定 + CSR 取比分資料 |
| 比分輪詢間隔 | 60 秒 | `SCOREBOARD_POLLING_MS = 60_000` |
| API 回應時間 | < 500ms（快取命中） | 快取命中接近 0ms |

### 9.2 可靠性

- ESPN API 不可用時：返回空陣列/null，不 throw（graceful degradation）
- Zod 驗證失敗時：console.warn + 回傳 fallback 值，不中斷流程
- 前端 API 錯誤：TanStack Query 內建 retry 機制

### 9.3 可擴展性

- 新增聯賽：加 `SPORT_PATHS` 映射 + DB 設定，無需改動架構
- 新增 Summary 資料類型：在 `play-by-play.ts` 加 parse 函式 + API route 加 type 分支

## 10. 相關文件

| 文件 | 路徑 |
|------|------|
| ESPN API 完整欄位文件 | `docs/espn-api/` |
| ESPN API 索引 | `docs/espn-api/README.md` |
| 路由 Helper | `src/lib/routes.ts` |
| 共用常數 | `src/lib/constants.ts` |
| ESPN Client 層 | `src/lib/espn/` |
