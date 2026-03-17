# Player API

球員基本資訊與數據。

## 端點

### 基本資訊 + 統計

```
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/athletes/{id}
```

### Overview（含 Game Log、Rankings）

```
GET https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/athletes/{id}/overview
```

> ⚠️ 目前程式碼中 `src/lib/espn/player.ts` 呼叫的是 `/overview` 端點，但 API route `src/app/api/public/player/route.ts` 呼叫的是基本端點（無 `/overview`）。兩者回傳結構不同。

## 📁 解析檔案

- `src/lib/espn/player.ts`

---

## 基本端點回傳結構

```
GET .../athletes/{id}
```

### Athlete 欄位

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 球員 ID |
| `displayName` | string | ✅ | 全名 |
| `firstName` | string | ⚠️ | 名 |
| `lastName` | string | ⚠️ | 姓 |
| `shortName` | string | ⚠️ | 短名（如 "N. Alexander-Walker"）|
| `jersey` | string | ✅ | 背號 |
| `position` | Position | ✅ | 位置 |
| `position.displayName` | string | ✅ | 位置全名（如 "Guard"）|
| `position.abbreviation` | string | ⚠️ | 位置縮寫（如 "G"）|
| `age` | number | ⚠️ | 年齡 |
| `displayHeight` | string | ⚠️ | 身高 |
| `displayWeight` | string | ⚠️ | 體重 |
| `dateOfBirth` | string | ⚠️ | 生日 |
| `debutYear` | number | ⚠️ | 出道年份 |
| `birthPlace` | object | ⚠️ | 出生地 |
| `college` | object | ⚠️ | 大學 |
| `draft` | Draft | ⚠️ | 選秀資訊 |
| `experience` | object | ⚠️ | 年資 |
| `headshot.href` | string | ✅ | 頭像 URL |
| `team` | Team | ✅ | 所屬球隊 |
| `team.id` | string | ✅ | 球隊 ID |
| `team.displayName` | string | ✅ | 球隊全名 |
| `team.abbreviation` | string | ✅ | 球隊縮寫 |
| `team.logos[0].href` | string | ✅ | 球隊 Logo |
| `statistics` | Statistics[] | ✅ | 球員數據 |
| `status` | object | ⚠️ | 球員狀態 |
| `injuries` | object[] | ⚠️ | 傷勢 |

### Statistics 結構

```json
{
  "statistics": [{
    "name": "2025-26",
    "type": "stats",
    "categories": [{
      "name": "general",
      "displayName": "General",
      "stats": [
        { "name": "GP", "displayName": "Games Played", "value": 68, "displayValue": "68" },
        { "name": "GS", "displayName": "Games Started", "value": 68, "displayValue": "68" },
        { "name": "MIN", "displayName": "Minutes Per Game", "value": 35.2, "displayValue": "35.2" }
      ]
    }, {
      "name": "offensive",
      "displayName": "Offensive",
      "stats": [
        { "name": "PTS", "displayName": "Points Per Game", "value": 24.5, "displayValue": "24.5" },
        { "name": "FGM", "displayName": "Field Goals Made Per Game", ... },
        { "name": "FGA", "displayName": "Field Goals Attempted Per Game", ... },
        { "name": "FG%", "displayName": "Field Goal Percentage", ... },
        { "name": "3PM", "displayName": "Three Point Field Goals Made Per Game", ... }
      ]
    }]
  }]
}
```

程式碼使用 `flatMap` 攤平所有 categories 的 stats，取前 15 筆回傳。

---

## Overview 端點回傳結構

```
GET .../athletes/{id}/overview
```

> ⚠️ 此端點可能對某些球員回傳錯誤（如已觀察到回傳 `{"code": ...}`）

### 額外欄位（基本端點沒有的）

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `rankings` | Rankings | ⚠️ **可用** | 聯盟排名 |
| `gameLog` | GameLog | ⚠️ **可用** | 近期比賽紀錄 |
| `statistics` | Statistics[] | ⚠️ | 更詳細的統計分類 |

### Rankings 結構（⚠️ 未使用）

```json
{
  "rankings": [{
    "name": "points",
    "displayName": "Points Per Game",
    "rank": 1,
    "value": 32.8
  }, {
    "name": "assists",
    "displayName": "Assists Per Game",
    "rank": 3,
    "value": 8.2
  }]
}
```

### GameLog 結構（⚠️ 未使用）

```json
{
  "gameLog": {
    "categories": [{
      "name": "general",
      "labels": ["DATE", "OPP", "SCORE", "MIN", "PTS", "FGM", "FGA", "FG%"],
      "events": [{
        "gameId": "401810838",
        "gameDate": "2026-03-16",
        "opponent": { "id": "1", "abbreviation": "ATL" },
        "result": "W",
        "stats": ["03/16", "vs ATL", "W 124-112", "33", "18", "3", "13", ".231"]
      }]
    }]
  }
}
```

---

## 注意事項

1. **基本端點 vs Overview 端點**：Overview 多了 rankings 和 gameLog，但可能對部分球員不穩定
2. **Statistics 結構差異**：基本端點的 statistics 在 `athlete.statistics`，Overview 的在頂層 `statistics`
3. **前 15 筆限制**：目前程式碼只取前 15 筆 stats 回傳前端
