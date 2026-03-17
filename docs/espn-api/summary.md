# Summary API

比賽摘要，包含 Play-by-Play、Box Score、賠率、Leaders 等所有比賽相關資料。

## 端點

```
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/summary?event={eventId}
```

## 📁 解析檔案

- `src/lib/espn/play-by-play.ts` — 解析 plays
- `src/lib/espn/odds.ts` — 解析 odds

## 回傳頂層欄位

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `boxscore` | Boxscore | ⚠️ **可用** | Box Score 數據 |
| `plays` | Play[] | ✅ | Play-by-Play 紀錄 |
| `odds` | Odds[] | ✅ | 賠率資料 |
| `leaders` | Leader[] | ⚠️ | 比賽 Leaders（結構較空）|
| `header` | Header | ✅ | 比賽基本資訊（隊伍、狀態）|
| `winprobability` | WinProb[] | ⚠️ | 勝率變化曲線 |
| `standings` | object | ⚠️ | 當前排名 |
| `seasonseries` | object[] | ⚠️ | 本季對戰紀錄 |
| `againstTheSpread` | ATS[] | ⚠️ | 對盤口紀錄 |
| `injuries` | object | ⚠️ | 傷兵名單 |
| `broadcasts` | object[] | ⚠️ | 轉播資訊 |
| `pickcenter` | object[] | ⚠️ | 專家預測 |
| `news` | object | ⚠️ | 相關新聞 |
| `article` | object | ⚠️ | 相關文章 |
| `videos` | object[] | ⚠️ | 相關影片 |
| `gameInfo` | object | ⚠️ | 場館、天氣等資訊 |
| `format` | object | ⚠️ | 比賽格式 |
| `wallclockAvailable` | boolean | ⚠️ | 是否有即時時鐘 |

---

## Boxscore（⚠️ 未使用，可用於 #16 Box Score 功能）

### 結構

```json
{
  "teams": [TeamBoxscore],
  "players": [PlayerBoxscore]
}
```

### TeamBoxscore

球隊整場統計。

```json
{
  "team": { "id": "1", "displayName": "Atlanta Hawks", ... },
  "statistics": [
    { "name": "fieldGoalsMade-fieldGoalsAttempted", "label": "FG", "displayValue": "40-95" },
    { "name": "fieldGoalPct", "label": "Field Goal %", "displayValue": "42" },
    { "name": "threePointFieldGoalsMade-threePointFieldGoalsAttempted", "label": "3PT", "displayValue": "14-43" },
    { "name": "threePointFieldGoalPct", "label": "Three Point %", "displayValue": "33" },
    { "name": "freeThrowsMade-freeThrowsAttempted", "label": "FT", "displayValue": "18-23" },
    { "name": "freeThrowPct", "label": "Free Throw %", "displayValue": "78" },
    { "name": "totalRebounds", "label": "Rebounds", "displayValue": "40" },
    { "name": "offensiveRebounds", "label": "Offensive Rebounds", "displayValue": "8" },
    { "name": "defensiveRebounds", "label": "Defensive Rebounds", "displayValue": "32" },
    { "name": "assists", "label": "Assists", "displayValue": "20" },
    { "name": "steals", "label": "Steals", "displayValue": "9" },
    { "name": "blocks", "label": "Blocks", "displayValue": "3" },
    { "name": "turnovers", "label": "Turnovers", "displayValue": "11" },
    { "name": "teamTurnovers", "label": "Team Turnovers", "displayValue": "0" },
    { "name": "totalTurnovers", "label": "Total Turnovers", "displayValue": "11" }
  ],
  "displayOrder": 1,
  "homeAway": "home"
}
```

### PlayerBoxscore

每位球員的個人數據。

```json
{
  "team": { "id": "1", ... },
  "statistics": [{
    "names": ["MIN","PTS","FG","3PT","FT","REB","AST","TO","STL","BLK","OREB","DREB","PF","+/-"],
    "keys": ["minutes","points","fieldGoalsMade-fieldGoalsAttempted",...],
    "labels": ["MIN","PTS","FG","3PT","FT","REB","AST","TO","STL","BLK","OREB","DREB","PF","+/-"],
    "descriptions": ["Minutes","Points","Field Goals Made-Field Goals Attempted",...],
    "athletes": [
      {
        "active": true,
        "athlete": {
          "id": "4433218",
          "displayName": "Paolo Banchero",
          "jersey": "5",
          "position": { "abbreviation": "F" },
          "headshot": { "href": "https://..." }
        },
        "starter": true,
        "didNotPlay": false,
        "ejected": false,
        "stats": ["33","18","3-13","1-2","11-16","10","3","2","0","2","0","10","2","-16"]
      }
    ],
    "totals": ["","112","40-95","14-43","18-23","40","20","11","9","3","8","32","19",""]
  }]
}
```

**注意**：`stats` 陣列的順序對應 `labels` 陣列。

---

## Plays（✅ 已使用）

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | Play ID |
| `sequenceNumber` | number | ✅ | 序號 |
| `type.text` | string | ✅ | 類型文字 |
| `type.id` | string | ⚠️ | 類型 ID |
| `text` | string | ✅ | 描述文字 |
| `awayScore` | number | ✅ | 客隊當前得分 |
| `homeScore` | number | ✅ | 主隊當前得分 |
| `period.displayValue` | string | ✅ | 節次顯示（如 "1st Quarter"）|
| `clock.displayValue` | string | ✅ | 時鐘顯示（如 "5:22"）|
| `scoringPlay` | boolean | ✅ | 是否得分 |
| `scoreValue` | number | ⚠️ | 得分值 |
| `team.id` | string | ✅ | 所屬球隊 ID |
| `participants` | object[] | ⚠️ | 參與球員 |
| `wallclock` | string | ⚠️ | 實際時間 |
| `shootingPlay` | boolean | ⚠️ | 是否為投籃 |
| `coordinate` | object | ⚠️ | 場上座標 |
| `shortDescription` | string | ⚠️ | 簡短描述 |

---

## Odds（✅ 已使用）

```json
[{
  "provider": { "id": "45", "name": "Caesars Sportsbook" },
  "details": "LAL -3.5",
  "overUnder": 228.5,
  "spread": -3.5,
  "homeTeamOdds": {
    "moneyLine": -160,
    "spreadOdds": -110,
    "favorite": true
  },
  "awayTeamOdds": {
    "moneyLine": 135,
    "spreadOdds": -110,
    "favorite": false
  },
  "overOdds": -110,
  "underOdds": -110
}]
```

詳細欄位說明見 [scoreboard.md](./scoreboard.md#competition-odds✅-部分使用)。

**訪客 vs 會員差異**（`src/lib/espn/odds.ts`）：
- 訪客（`fetchOddsPreview`）：只取第一個 provider，moneyLine 清零
- 會員（`fetchOdds`）：完整多個 provider，含 ML

---

## Header（✅ 部分使用）

主要用於取得比賽雙方隊伍資訊（team ID → team name 映射）。

```json
{
  "id": "401810838",
  "competitions": [{
    "competitors": [{
      "team": {
        "id": "1",
        "displayName": "Atlanta Hawks",
        ...
      }
    }]
  }],
  "season": { ... },
  "league": { ... }
}
```

---

## Win Probability（⚠️ 未使用）

勝率變化資料，可用於繪製勝率曲線圖。

```json
[
  { "homeWinPercentage": 0.59, "tiePercentage": 0.0, "playId": "4018108384" },
  { "homeWinPercentage": 0.61, "tiePercentage": 0.0, "playId": "4018108385" }
]
```

共數百筆，對應每個 play。

---

## 程式碼中的廢棄型別

以下型別定義在 `src/lib/espn/types.ts` 但未被任何模組使用：

| 型別 | 說明 |
|------|------|
| `ESPNPlayByPlayResponse` | 舊版 PBP 回應（有 `items: ESPNPlay[]`），已改用 summary API |
| `ESPNProbability` / `ESPNProbabilitiesResponse` | 勝率預測 |
| `ESPNFuture` / `ESPNFuturesResponse` | 未來賠率（冠軍賠率等）|
