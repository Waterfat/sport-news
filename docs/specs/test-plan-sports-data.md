# 測試計畫：賽事數據模組（Sports Data Module）

> 對應 PRD: `docs/specs/prd-sports-data.md`

## TC-1: ESPN Client（espn/client.ts）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| C-01 | P0 | fetch mock 回傳正常 JSON | 呼叫 espnFetch(endpoint) | 成功回傳並快取結果 |
| C-02 | P0 | 同 endpoint 已快取 | 再次呼叫 espnFetch(endpoint) | 命中快取，不重複發送 HTTP 請求 |
| C-03 | P0 | 快取 TTL 已過期 | 呼叫 espnFetch(endpoint) | 重新發送 HTTP 請求 |
| C-04 | P0 | ESPN API 回 404 或 500 | 呼叫 espnFetch(endpoint) | 拋出 ESPNApiError |
| C-05 | P1 | ESPNApiError 實例 | 檢查錯誤物件屬性 | 包含正確 status 和 endpoint |
| C-06 | P1 | league = "nba" | 呼叫 getSportPath("nba") | 回傳正確路徑（如 "basketball/nba"） |
| C-07 | P1 | league = "unknown_league" | 呼叫 getSportPath("unknown_league") | 回傳原始字串 |
| C-08 | P1 | params = { season: "2026" } | 呼叫 espnFetch(endpoint, { params }) | params 附加至請求 URL |

## TC-2: Standings（espn/standings.ts）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| S-01 | P0 | ESPN 回傳完整 standings JSON | 呼叫 fetchStandings(league) | 正確解析分組與球隊資料 |
| S-02 | P0 | 球隊有英文名稱 | 呼叫 fetchStandings | 球隊名稱轉為中文 |
| S-03 | P0 | Conference 有英文名稱 | 呼叫 fetchStandings | Conference 名稱轉為中文 |
| S-04 | P0 | 同分組有多支球隊 | 呼叫 fetchStandings | 按 winPercent 降序排列 |
| S-05 | P0 | espnFetch 拋出錯誤 | 呼叫 fetchStandings | 回傳空陣列（graceful degradation） |
| S-06 | P1 | 同 league 已快取 | 再次呼叫 fetchStandings | 命中快取，不重複請求 |
| S-07 | P1 | ESPN 回傳缺少 children 欄位 | 呼叫 fetchStandings | 回傳空陣列 |
| S-08 | P1 | stats 含 "Road"、"Last Ten Games" | 呼叫 fetchStandings | 映射為 "Away"、"L10" |

## TC-3: Team（espn/team.ts）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| T-01 | P0 | ESPN 回傳完整 team JSON | 呼叫 fetchTeam(league, teamId) | 正確解析球隊基本資訊 |
| T-02 | P0 | ESPN 回傳缺少部分欄位 | 呼叫 fetchTeam | 使用 fallback 值填補 |
| T-03 | P0 | ESPN 回傳含 teamATS | 呼叫 fetchTeamATS(league, teamId) | 正確解析 ATS 資料 |
| T-04 | P0 | ESPN 回傳無 teamATS 欄位 | 呼叫 fetchTeamATS | 回傳 null |
| T-05 | P1 | espnFetch 拋出例外 | 呼叫 fetchTeamATS | 回傳 null |
| T-06 | P1 | league = "nba" | 呼叫 fetchTeam | 使用正確的 sportPath |

## TC-4: Player（espn/player.ts）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| P-01 | P0 | ESPN 回傳完整 player JSON | 呼叫 fetchPlayer(league, playerId) | 正確解析球員基本資訊 |
| P-02 | P0 | player 有 statistics 多 category | 呼叫 fetchPlayer | statistics 正確展開為多 category |
| P-03 | P0 | ESPN 回傳完整 gamelog | 呼叫 fetchPlayerGameLog(league, playerId) | 正確解析 events 和 stats |
| P-04 | P0 | ESPN 回傳無 categories | 呼叫 fetchPlayerGameLog | 回傳空結果 |
| P-05 | P1 | espnFetch 拋出例外 | 呼叫 fetchPlayerGameLog | 回傳空結果 |
| P-06 | P1 | player 缺少 headshot/team | 呼叫 fetchPlayer | 使用空字串 fallback |

## TC-5: Schemas（espn/schemas.ts）

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| Z-01 | P1 | value = "123" | numericIdSchema.parse(value) | 通過驗證 |
| Z-02 | P1 | value = "abc" | numericIdSchema.parse(value) | 驗證失敗 |
| Z-03 | P1 | value = 0.65 | pctZeroOneSchema.parse(value) | 通過（0-1 範圍） |
| Z-04 | P1 | value = 1.5 | pctZeroOneSchema.parse(value) | 驗證失敗（> 1） |
| Z-05 | P1 | value = 65 | pctZeroHundredSchema.parse(value) | 通過（0-100 範圍） |
| Z-06 | P0 | 傳入合法資料 + schema | 呼叫 safeValidate(schema, data) | 回傳驗證後的值 |
| Z-07 | P0 | 傳入不合法資料 + fallback | 呼叫 safeValidate(schema, data, fallback) | console.warn 並回傳 fallback |

## TC-6: API Routes — Game

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| R-01 | P0 | — | GET /api/public/game（缺少 eventId） | 400 |
| R-02 | P0 | mock fetchPlayByPlay | GET ?eventId=1&league=nba&type=plays | 回傳 plays 資料 |
| R-03 | P0 | mock fetchOdds | GET ?eventId=1&league=nba&type=odds | 回傳 odds 資料 |
| R-04 | P0 | mock fetchBoxScore | GET ?eventId=1&league=nba&type=boxscore | 回傳 boxscore |
| R-05 | P0 | mock fetchLeaders | GET ?eventId=1&league=nba&type=leaders | 回傳 leaders |
| R-06 | P1 | mock fetchInjuries | GET ?eventId=1&league=nba&type=injuries | 回傳 injuries |
| R-07 | P1 | mock fetchWinProbability | GET ?eventId=1&league=nba&type=winprobability | 回傳資料 |
| R-08 | P1 | mock fetchSeasonSeries | GET ?eventId=1&league=nba&type=seasonseries | 回傳資料 |
| R-09 | P1 | mock fetchPickCenter | GET ?eventId=1&league=nba&type=pickcenter | 回傳資料 |
| R-10 | P1 | — | GET ?eventId=1&league=nba&type=invalid | 400（無效 type） |

## TC-7: API Routes — Standings / Team / Player

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| R-11 | P0 | mock fetchStandings | GET /api/public/standings?league=nba | 回傳 standings |
| R-12 | P1 | fetchStandings 拋錯 | GET /api/public/standings?league=nba | 500 |
| R-13 | P0 | — | GET /api/public/team（缺少 id） | 400 |
| R-14 | P0 | mock fetchTeam（含 roster） | GET ?id=1&league=nba&type=roster | 回傳 roster |
| R-15 | P1 | mock fetchTeamATS | GET ?id=1&league=nba&type=ats | 回傳 ats |
| R-16 | P0 | mock fetchTeam | GET ?id=1&league=nba | 預設回傳球隊資訊 |
| R-17 | P0 | — | GET /api/public/player（缺少 id） | 400 |
| R-18 | P0 | mock fetchPlayerGameLog | GET ?id=1&league=nba&type=gamelog | 回傳 gamelog |
| R-19 | P0 | mock fetchPlayer | GET ?id=1&league=nba | 預設回傳球員資訊 |
| R-20 | P1 | fetchPlayer 回傳 null | GET ?id=1&league=nba | 404 |

## TC-8: useGameDetail Hook

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| H-01 | P0 | useSession 回傳未登入 | renderHook useGameDetail | 使用 /api/public/game 端點 |
| H-02 | P0 | useSession 回傳已登入 member | renderHook useGameDetail | 使用 /api/member/game 端點 |
| H-03 | P0 | tab = "summary" | renderHook useGameDetail | winProb/seasonSeries/pickCenter 查詢 enabled=true |
| H-04 | P0 | tab = "pbp" | renderHook useGameDetail | PBP 查詢 enabled=true |
| H-05 | P0 | tab = "boxscore" | renderHook useGameDetail | boxScore 查詢 enabled=true |
| H-06 | P1 | tab = "injuries" | renderHook useGameDetail | injuries 查詢 enabled=true |
| H-07 | P1 | tab = "other" | renderHook useGameDetail | 條件查詢 enabled=false |
