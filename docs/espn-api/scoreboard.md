# Scoreboard API

即時比分資料。

## 端點

```
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard?dates=YYYYMMDD
```

## 📁 解析檔案

- `src/lib/espn/scoreboard.ts`（新版，使用統一 client）
- `src/lib/scoreboard.ts`（舊版，仍被 API route 使用）

## 回傳結構

```
{
  leagues: [{ id, name, abbreviation, season, ... }],
  events: Event[]
}
```

### Event

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 比賽 ID（用於 summary API） |
| `uid` | string | ⚠️ | ESPN UID |
| `date` | string | ✅ | ISO 日期 |
| `name` | string | ⚠️ | 完整比賽名稱（如 "Atlanta Hawks at Orlando Magic"）|
| `shortName` | string | ⚠️ | 簡短名稱（如 "ATL @ ORL"）|
| `season` | object | ⚠️ | 賽季資訊 |
| `status` | Status | ✅ | 比賽狀態 |
| `competitions` | Competition[] | ✅ | 比賽詳情（通常只有 1 個）|
| `links` | Link[] | ⚠️ | ESPN 網頁連結 |

### Status

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `clock` | number | ⚠️ | 比賽時鐘秒數 |
| `displayClock` | string | ⚠️ | 顯示用時鐘 |
| `period` | number | ⚠️ | 目前節數 |
| `type.id` | string | ⚠️ | 狀態 ID |
| `type.name` | string | ✅ | 狀態名稱：`STATUS_IN_PROGRESS` / `STATUS_FINAL` / `STATUS_SCHEDULED` |
| `type.state` | string | ⚠️ | `in` / `post` / `pre` |
| `type.completed` | boolean | ⚠️ | 是否已結束 |
| `type.shortDetail` | string | ✅ | 簡短狀態描述（如 "Final", "Q3 5:22"）|

### Competition

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `id` | string | ⚠️ | 比賽 ID |
| `date` | string | ⚠️ | 日期 |
| `attendance` | number | ⚠️ | 入場人數 |
| `venue` | object | ⚠️ | 場館資訊 |
| `competitors` | Competitor[] | ✅ | 參賽隊伍（2 隊）|
| `odds` | Odds[] | ✅ | 賠率（只取第一個 provider）|
| `broadcasts` | Broadcast[] | ⚠️ | 轉播資訊 |
| `headlines` | object[] | ⚠️ | 頭條 |
| `highlights` | object[] | ⚠️ | 精華影片 |
| `notes` | object[] | ⚠️ | 備註 |
| `status` | Status | ⚠️ | 比賽狀態（同上層） |

### Competitor

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `id` | string | ⚠️ | 隊伍 ID |
| `homeAway` | string | ✅ | `"home"` 或 `"away"` |
| `winner` | boolean | ⚠️ | 是否獲勝 |
| `score` | string | ✅ | 總分 |
| `linescores` | LineScore[] | ⚠️ **可用** | 逐節分數 |
| `statistics` | Statistic[] | ⚠️ | 球隊整場統計 |
| `leaders` | Leader[] | ⚠️ **可用** | 該隊本場最佳球員 |
| `records` | Record[] | ✅ | 戰績記錄（只取 `[0].summary`）|
| `team.id` | string | ⚠️ | 隊伍 ID |
| `team.displayName` | string | ✅ | 隊伍全名 |
| `team.abbreviation` | string | ✅ | 縮寫 |
| `team.logo` | string | ✅ | Logo URL |
| `team.color` | string | ⚠️ | 主色 hex |
| `team.alternateColor` | string | ⚠️ | 副色 hex |
| `team.location` | string | ⚠️ | 城市名 |
| `team.name` | string | ⚠️ | 隊名（不含城市）|
| `team.shortDisplayName` | string | ⚠️ | 短隊名 |

### LineScore（⚠️ 未使用，可用於 #16 逐節分數功能）

```json
[
  { "value": 34.0, "displayValue": "34", "period": 1 },
  { "value": 33.0, "displayValue": "33", "period": 2 },
  { "value": 37.0, "displayValue": "37", "period": 3 },
  { "value": 20.0, "displayValue": "20", "period": 4 }
]
```

- NBA：通常 4 節，加時會多出 period 5, 6...
- MLB：通常 9 局，延長局會多出

### Competitor Leaders（⚠️ 未使用，可用於 #16 本場最佳功能）

每隊有 4 類 leaders：Points、Rebounds、Assists、Rating。

```json
{
  "name": "points",
  "displayName": "Points",
  "leaders": [{
    "displayValue": "41",
    "value": 41.0,
    "athlete": {
      "id": "4278039",
      "displayName": "Nickeil Alexander-Walker",
      "shortName": "N. Alexander-Walker",
      "headshot": "https://a.espncdn.com/i/headshots/nba/players/full/4278039.png",
      "jersey": "7",
      "position": { "abbreviation": "G" },
      "team": { "id": "1" }
    }
  }]
}
```

### Competitor Statistics（⚠️ 未使用）

球隊整場統計數據。

NBA 範例：
```json
[
  { "name": "rebounds", "abbreviation": "REB", "displayValue": "54" },
  { "name": "avgRebounds", "abbreviation": "REB", "displayValue": "54.0" },
  { "name": "assists", "abbreviation": "AST", "displayValue": "33" },
  { "name": "fieldGoalsAttempted", "abbreviation": "FGA", "displayValue": "93" },
  { "name": "fieldGoalsMade", "abbreviation": "FGM", "displayValue": "43" }
]
```

### Competition Odds（✅ 部分使用）

```json
{
  "provider": { "id": "45", "name": "Caesars Sportsbook" },
  "details": "LAL -3.5",
  "overUnder": 228.5,
  "spread": -3.5,
  "homeTeamOdds": { "moneyLine": -160, "spreadOdds": -110, "favorite": true },
  "awayTeamOdds": { "moneyLine": 135, "spreadOdds": -110, "favorite": false },
  "overOdds": -110,
  "underOdds": -110
}
```

| 欄位 | 狀態 | 說明 |
|------|------|------|
| `provider.name` | ✅ | 賠率提供商名稱 |
| `details` | ✅ | 盤口描述 |
| `overUnder` | ✅ | 大小分 |
| `spread` | ✅ | 讓分 |
| `homeTeamOdds.moneyLine` | ✅ | 主隊美式賠率 |
| `awayTeamOdds.moneyLine` | ✅ | 客隊美式賠率 |
| `homeTeamOdds.spreadOdds` | ⚠️ | 主隊讓分賠率 |
| `awayTeamOdds.spreadOdds` | ⚠️ | 客隊讓分賠率 |
| `homeTeamOdds.favorite` | ⚠️ | 是否為熱門 |
| `overOdds` | ⚠️ | 大分賠率 |
| `underOdds` | ⚠️ | 小分賠率 |

### Broadcasts（⚠️ 未使用）

```json
[{ "market": "national", "names": ["Peacock", "NBCSN"] }]
```

## 聯賽差異

### MLB Scoreboard

- `linescores`：9 局（可能延長），結構相同
- `statistics`：MLB 專有欄位

```json
[
  { "name": "hits", "abbreviation": "H", "displayValue": "3" },
  { "name": "runs", "abbreviation": "R", "displayValue": "2" },
  { "name": "avg", "abbreviation": "AVG", "displayValue": ".115" },
  { "name": "saves", "abbreviation": "SV", "displayValue": "1" },
  { "name": "ERA", "abbreviation": "ERA", "displayValue": "0.00" }
]
```

- `leaders`：MLB 使用 `MLBRating`，格式為 `"5.0 IP, 0 ER, H, 4 K, 2 BB"`
