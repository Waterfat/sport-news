# Team API

球隊基本資訊、球員名單。

## 端點

### 球隊資訊

```
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{id}
```

### 球員名單

```
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{id}/roster
```

### ATS（Against The Spread）

```
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{id}/ats
```

## 📁 解析檔案

- `src/lib/espn/team.ts`

---

## Team 回傳結構

```json
{
  "team": { ... }
}
```

### Team 欄位

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 隊伍 ID |
| `slug` | string | ⚠️ | URL slug |
| `location` | string | ⚠️ | 城市名 |
| `name` | string | ⚠️ | 隊名（不含城市）|
| `displayName` | string | ✅ | 完整隊名（如 "Los Angeles Lakers"）|
| `shortDisplayName` | string | ⚠️ | 短隊名 |
| `abbreviation` | string | ✅ | 縮寫（如 "LAL"）|
| `color` | string | ✅（解析但前端未用）| 主色 hex（如 "552583"）|
| `alternateColor` | string | ⚠️ | 副色 hex |
| `isActive` | boolean | ⚠️ | 是否活躍 |
| `logos` | Logo[] | ✅ | Logo 圖片（取 `[0].href`）|
| `record` | Record | ✅ | 戰績 |
| `groups` | object | ⚠️ | 所屬分組 |
| `links` | Link[] | ⚠️ | ESPN 網頁連結 |
| `franchise` | Franchise | ⚠️ | 球隊歷史/特許經營權 |
| `nextEvent` | NextEvent[] | ⚠️ **可用** | 下一場比賽 |
| `standingSummary` | string | ✅ | 排名摘要（如 "3rd in Pacific"）|

### Record

```json
{
  "items": [
    {
      "description": "Overall Record",
      "type": "total",
      "summary": "43-25",
      "stats": [
        { "name": "OTLosses", "value": 0.0 },
        { "name": "OTWins", "value": 0.0 },
        { "name": "avgPointsAgainst", "value": 114.91 },
        { "name": "avgPointsFor", "value": 116.25 },
        { "name": "differential", "value": 1.33 },
        { "name": "gamesPlayed", "value": 68.0 },
        { "name": "losses", "value": 25.0 },
        { "name": "playoffSeed", "value": 4.0 },
        { "name": "streak", "value": -1.0 },
        { "name": "winPercent", "value": 0.632 },
        { "name": "wins", "value": 43.0 }
      ]
    }
  ]
}
```

✅ 已使用：`items[0].summary`（總戰績字串）
⚠️ 未使用：`items[0].stats` 的詳細數據

### NextEvent（⚠️ 未使用）

```json
[{
  "id": "401810844",
  "date": "2026-03-17T01:30Z",
  "name": "Los Angeles Lakers at Houston Rockets",
  "shortName": "LAL @ HOU",
  "competitions": [{
    "id": "401810844",
    "date": "2026-03-17T01:30Z",
    "competitors": [{ "id": "10", "homeAway": "home" }, { "id": "13", "homeAway": "away" }]
  }]
}]
```

---

## Roster 回傳結構

```json
{
  "timestamp": "2026-03-17T...",
  "status": "success",
  "season": { ... },
  "athletes": [Athlete],
  "coach": [Coach],
  "team": { ... }
}
```

### Athlete 欄位

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 球員 ID |
| `displayName` | string | ✅ | 全名 |
| `firstName` | string | ⚠️ | 名 |
| `lastName` | string | ⚠️ | 姓 |
| `shortName` | string | ⚠️ | 短名 |
| `jersey` | string | ✅ | 背號 |
| `position` | Position | ✅ | 位置（含 `name`, `displayName`, `abbreviation`）|
| `age` | number | ✅ | 年齡 |
| `displayHeight` | string | ✅ | 身高顯示（如 "6'10"）|
| `displayWeight` | string | ✅ | 體重顯示（如 "250 lbs"）|
| `height` | number | ⚠️ | 身高（英吋） |
| `weight` | number | ⚠️ | 體重（磅） |
| `dateOfBirth` | string | ⚠️ | 生日 |
| `debutYear` | number | ⚠️ | 出道年份 |
| `birthPlace` | object | ⚠️ | 出生地 |
| `college` | object | ⚠️ | 大學 |
| `experience` | object | ⚠️ | 年資 |
| `headshot` | object | ⚠️ | 頭像（含 `href`）|
| `injuries` | object[] | ⚠️ | 傷勢 |
| `contracts` | object[] | ⚠️ | 合約 |
| `status` | object | ⚠️ | 球員狀態（Active/Injured 等）|
| `slug` | string | ⚠️ | URL slug |

### Coach（⚠️ 未使用）

Roster API 同時回傳教練資訊。

---

## ATS 回傳結構

`fetchTeamATS()` 函式存在於 `src/lib/espn/team.ts` 但**沒有任何 API route 使用它**。

回傳含：
- `records[]`：各類型 ATS 紀錄
- `events[]`：歷史比賽與盤口結果
