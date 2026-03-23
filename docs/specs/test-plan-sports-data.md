# 測試計畫：賽事數據模組（Sports Data Module）

**版本**：1.0  
**日期**：2026-03-23  
**負責人**：QA Expert  

---

## 1. 測試範圍與目標

### 1.1 測試目標

- 驗證 ESPN API 整合層的資料解析正確性
- 確保 API Routes 的請求/回應行為符合規格
- 驗證 `useGameDetail` Hook 的查詢邏輯與 tab 條件
- 確認錯誤處理與 graceful degradation 機制正常運作
- 達成賽事數據模組測試覆蓋率 > 90%

### 1.2 測試範圍

| 模組 | 路徑 | 測試類型 |
|------|------|---------|
| ESPN Client | `src/lib/espn/client.ts` | 單元測試 |
| Scoreboard 解析 | `src/lib/espn/scoreboard.ts` | 單元測試（已有部分） |
| Standings 解析 | `src/lib/espn/standings.ts` | 單元測試 |
| Team 解析 | `src/lib/espn/team.ts` | 單元測試 |
| Player 解析 | `src/lib/espn/player.ts` | 單元測試 |
| Play-by-Play 解析 | `src/lib/espn/play-by-play.ts` | 單元測試（已有） |
| Odds 解析 | `src/lib/espn/odds.ts` | 單元測試（已有） |
| Zod Schemas | `src/lib/espn/schemas.ts` | 單元測試 |
| Public API Routes | `src/app/api/public/*` | 整合測試 |
| useGameDetail Hook | `src/hooks/useGameDetail.ts` | 整合測試 |

### 1.3 不在範圍內

- ESPN API 真實網路請求（全部 mock）
- Supabase 真實資料庫操作（mock）
- 端對端（E2E）瀏覽器自動化測試
- 效能負載測試

---

## 2. 現有覆蓋分析

### 2.1 已覆蓋

| 測試檔案 | 覆蓋函式 | 測試數 |
|---------|---------|-------|
| `scoreboard.test.ts` | 舊版 `fetchScoreboard`（`@/lib/scoreboard`） | 6 |
| `scoreboard-linescores.test.ts` | 舊版 linescores 解析 | 2 |
| `odds.test.ts` | `fetchOdds`, `fetchOddsPreview` | 6 |
| `leaders.test.ts` | `fetchLeaders` | 2 |
| `boxscore.test.ts` | `fetchBoxScore` | 2 |
| `play-by-play-extended.test.ts` | `fetchSeasonSeries`, `fetchPickCenter`, `fetchWinProbability`, `fetchInjuries`, `fetchPlayByPlay`, `fetchPlayByPlayPreview` | 20 |
| `team-slugs.test.ts` | `TEAM_SLUG_MAP`, `getTeamIdBySlug` | 7 |
| `translate-pbp.test.ts` | `translatePbpText` | 多項 |

### 2.2 覆蓋缺口（本計畫重點）

| 模組 | 未覆蓋函式 | 風險等級 |
|------|-----------|---------|
| `espn/client.ts` | `espnFetch`（快取、TTL、錯誤）、`getSportPath`、`ESPNApiError` | 高 |
| `espn/standings.ts` | `fetchStandings`、`parseStandings`（分組、排序、中文化） | 高 |
| `espn/team.ts` | `fetchTeam`、`fetchTeamATS` | 高 |
| `espn/player.ts` | `fetchPlayer`、`fetchPlayerGameLog` | 高 |
| `espn/schemas.ts` | `safeValidate`、四個 schema | 中 |
| `api/public/standings` | GET handler | 中 |
| `api/public/team` | GET handler（roster/ats/default type） | 中 |
| `api/public/player` | GET handler（gamelog/default type） | 中 |
| `api/public/game` | GET handler（全 type 分支） | 中 |
| `hooks/useGameDetail.ts` | Tab 條件查詢、member/guest 分流 | 中 |

---

## 3. 測試策略

### 3.1 測試工具

| 工具 | 用途 |
|------|------|
| Vitest | 測試執行框架 |
| `vi.mock()` | 模組 mock（ESPN client, next-auth, tanstack-query） |
| `vi.stubGlobal("fetch", ...)` | 全域 fetch mock |
| `@testing-library/react` | Hook 測試（renderHook） |

### 3.2 Mock 策略

- **ESPN API 外部呼叫**：`vi.mock("@/lib/espn/client")` 或 `vi.stubGlobal("fetch", ...)`
- **Next.js API Routes**：使用 `NextRequest` 建構請求，直接呼叫 handler 函式
- **Supabase**：mock `@/lib/supabase` createServiceClient
- **next-auth**：mock `next-auth/react` useSession

### 3.3 測試分層

```
Layer 1：純解析函式（parseXxx）
  → 直接呼叫，傳入 mock 資料，驗證輸出格式
  → 重點：正常路徑 + 缺失欄位 graceful fallback

Layer 2：fetch 函式（fetchXxx）
  → mock espnFetch / global fetch
  → 重點：cache TTL 行為、錯誤處理、isCompleted 參數

Layer 3：API Route Handlers
  → 建構 NextRequest，呼叫 handler
  → 重點：參數驗證、正確 status code、回應結構

Layer 4：React Hook（useGameDetail）
  → renderHook + QueryClientProvider
  → 重點：tab 條件控制 enabled、member/guest API 分流
```

---

## 4. 測試案例清單

### 4.1 ESPN Client（`espn/client.test.ts`）

| ID | 測試案例 | 優先級 |
|----|---------|-------|
| C-01 | `espnFetch` 成功回傳並快取 | 高 |
| C-02 | `espnFetch` 快取命中，不重複請求 | 高 |
| C-03 | `espnFetch` TTL 過期後重新請求 | 高 |
| C-04 | `espnFetch` API 回 404/500 時拋出 `ESPNApiError` | 高 |
| C-05 | `ESPNApiError` 包含正確 status 和 endpoint | 中 |
| C-06 | `getSportPath` 已知聯賽回傳正確路徑 | 中 |
| C-07 | `getSportPath` 未知聯賽回傳原始字串 | 中 |
| C-08 | `espnFetch` params 附加至 URL | 中 |

### 4.2 Standings（`standings.test.ts`）

| ID | 測試案例 | 優先級 |
|----|---------|-------|
| S-01 | `fetchStandings` 正確解析分組與球隊資料 | 高 |
| S-02 | 球隊名稱轉為中文 | 高 |
| S-03 | Conference 名稱轉為中文 | 高 |
| S-04 | 同分組球隊按 winPercent 降序排列 | 高 |
| S-05 | `fetchStandings` API 錯誤回傳空陣列 | 高 |
| S-06 | `fetchStandings` 快取命中不重複請求 | 中 |
| S-07 | 缺少 children 欄位回傳空陣列 | 中 |
| S-08 | stats name 映射（Road → Away, Last Ten Games → L10） | 中 |

### 4.3 Team（`team.test.ts`）

| ID | 測試案例 | 優先級 |
|----|---------|-------|
| T-01 | `fetchTeam` 正確解析球隊基本資訊 | 高 |
| T-02 | `fetchTeam` 缺少欄位時使用 fallback 值 | 高 |
| T-03 | `fetchTeamATS` 正確解析 ATS 資料 | 高 |
| T-04 | `fetchTeamATS` 無 teamATS 欄位時回傳 null | 高 |
| T-05 | `fetchTeamATS` espnFetch 拋出例外時回傳 null | 中 |
| T-06 | `fetchTeam` 使用正確的 sportPath | 中 |

### 4.4 Player（`player.test.ts`）

| ID | 測試案例 | 優先級 |
|----|---------|-------|
| P-01 | `fetchPlayer` 正確解析球員基本資訊 | 高 |
| P-02 | `fetchPlayer` statistics 正確展開為多 category | 高 |
| P-03 | `fetchPlayerGameLog` 正確解析 events 和 stats | 高 |
| P-04 | `fetchPlayerGameLog` 無 categories 時回傳空結果 | 高 |
| P-05 | `fetchPlayerGameLog` espnFetch 拋出例外時回傳空結果 | 中 |
| P-06 | `fetchPlayer` 缺少 headshot/team 時使用空字串 fallback | 中 |

### 4.5 Schemas（`schemas.test.ts`）

| ID | 測試案例 | 優先級 |
|----|---------|-------|
| Z-01 | `numericIdSchema` 接受純數字字串 | 中 |
| Z-02 | `numericIdSchema` 拒絕含字母字串 | 中 |
| Z-03 | `pctZeroOneSchema` 接受 0-1 範圍 | 中 |
| Z-04 | `pctZeroOneSchema` 拒絕 > 1 的值 | 中 |
| Z-05 | `pctZeroHundredSchema` 接受 0-100 範圍 | 中 |
| Z-06 | `safeValidate` 驗證成功時回傳值 | 高 |
| Z-07 | `safeValidate` 驗證失敗時 console.warn 並回傳 fallback | 高 |

### 4.6 API Routes（`api-routes-game.test.ts`、`api-routes-standings-team-player.test.ts`）

| ID | 測試案例 | 優先級 |
|----|---------|-------|
| R-01 | `GET /api/public/game` 缺少 eventId 回 400 | 高 |
| R-02 | `GET /api/public/game?type=plays` 回傳 plays 資料 | 高 |
| R-03 | `GET /api/public/game?type=odds` 回傳 odds 資料 | 高 |
| R-04 | `GET /api/public/game?type=boxscore` 回傳 boxscore | 高 |
| R-05 | `GET /api/public/game?type=leaders` 回傳 leaders | 高 |
| R-06 | `GET /api/public/game?type=injuries` 回傳 injuries | 中 |
| R-07 | `GET /api/public/game?type=winprobability` 回傳資料 | 中 |
| R-08 | `GET /api/public/game?type=seasonseries` 回傳資料 | 中 |
| R-09 | `GET /api/public/game?type=pickcenter` 回傳資料 | 中 |
| R-10 | `GET /api/public/game` 無效 type 回 400 | 中 |
| R-11 | `GET /api/public/standings` 正常回傳 standings | 高 |
| R-12 | `GET /api/public/standings` ESPN 錯誤時回 500 | 中 |
| R-13 | `GET /api/public/team` 缺少 id 回 400 | 高 |
| R-14 | `GET /api/public/team?type=roster` 回傳 roster | 高 |
| R-15 | `GET /api/public/team?type=ats` 回傳 ats | 中 |
| R-16 | `GET /api/public/team` 預設回傳球隊資訊 | 高 |
| R-17 | `GET /api/public/player` 缺少 id 回 400 | 高 |
| R-18 | `GET /api/public/player?type=gamelog` 回傳 gamelog | 高 |
| R-19 | `GET /api/public/player` 預設回傳球員資訊 | 高 |
| R-20 | `GET /api/public/player` player not found 回 404 | 中 |

### 4.7 useGameDetail Hook（`useGameDetail.test.ts`）

| ID | 測試案例 | 優先級 |
|----|---------|-------|
| H-01 | 訪客狀態使用 `/api/public/game` | 高 |
| H-02 | 會員狀態使用 `/api/member/game` | 高 |
| H-03 | tab=summary 時 winProb/seasonSeries/pickCenter 查詢啟用 | 高 |
| H-04 | tab=pbp 時 PBP 查詢啟用 | 高 |
| H-05 | tab=boxscore 時 boxScore 查詢啟用 | 高 |
| H-06 | tab=injuries 時 injuries 查詢啟用 | 中 |
| H-07 | 其他 tab 時條件查詢不啟用 | 中 |

---

## 5. 品質門檻

| 指標 | 目標 |
|------|------|
| 賽事數據模組測試覆蓋率 | > 90% |
| 新增測試通過率 | 100% |
| 無 critical path 函式零測試 | 0 件 |
| 錯誤處理路徑覆蓋 | 全部 graceful degradation 有測試 |

---

## 6. 測試檔案對應

| 測試檔案 | 路徑 |
|---------|------|
| `espn-client.test.ts` | `src/__tests__/lib/espn-client.test.ts` |
| `standings.test.ts` | `src/__tests__/lib/standings.test.ts` |
| `team.test.ts` | `src/__tests__/lib/team.test.ts` |
| `player.test.ts` | `src/__tests__/lib/player.test.ts` |
| `schemas.test.ts` | `src/__tests__/lib/schemas.test.ts` |
| `api-routes-game.test.ts` | `src/__tests__/api/api-routes-game.test.ts` |
| `api-routes-standings-team-player.test.ts` | `src/__tests__/api/api-routes-standings-team-player.test.ts` |
| `useGameDetail.test.ts` | `src/__tests__/hooks/useGameDetail.test.ts` |

---

## 7. 執行方式

```bash
# 執行所有測試
npx vitest run

# 只執行賽事數據相關測試
npx vitest run src/__tests__/lib/espn-client.test.ts
npx vitest run src/__tests__/lib/standings.test.ts
npx vitest run src/__tests__/lib/team.test.ts
npx vitest run src/__tests__/lib/player.test.ts
npx vitest run src/__tests__/lib/schemas.test.ts
npx vitest run src/__tests__/api/
npx vitest run src/__tests__/hooks/useGameDetail.test.ts

# 覆蓋率報告
npx vitest run --coverage
```
