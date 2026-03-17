# Standings API

戰績排名資料。注意 base URL 與其他端點不同。

## 端點

```
GET https://site.api.espn.com/apis/v2/sports/{sport}/{league}/standings
```

> ⚠️ 注意：是 `/apis/v2/` 不是 `/apis/site/v2/`

## 📁 解析檔案

- `src/lib/espn/standings.ts`

## 回傳結構

```
{
  uid, id, name, abbreviation,
  children: StandingsGroup[]
}
```

### StandingsGroup

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `uid` | string | ⚠️ | ESPN UID |
| `id` | string | ⚠️ | 分組 ID |
| `name` | string | ✅ | 分組名稱（如 "Eastern Conference"）|
| `abbreviation` | string | ⚠️ | 分組縮寫（如 "East"）|
| `isConference` | boolean | ⚠️ | 是否為 Conference 級別 |
| `standings.entries` | Entry[] | ✅ | 該分組的隊伍戰績 |

> MLB 結構更深：`children[0].children[]`（League → Division）

### Entry

| 欄位 | 型別 | 狀態 | 說明 |
|------|------|------|------|
| `team.id` | string | ✅ | 隊伍 ID |
| `team.displayName` | string | ✅ | 隊伍全名 |
| `team.abbreviation` | string | ✅ | 縮寫 |
| `team.location` | string | ⚠️ | 城市 |
| `team.name` | string | ⚠️ | 隊名（不含城市）|
| `team.shortDisplayName` | string | ⚠️ | 短隊名 |
| `team.logos[0].href` | string | ✅ | Logo URL |
| `team.isActive` | boolean | ⚠️ | 是否活躍 |
| `stats` | Stat[] | ✅ | 統計數據（動態 key-value）|

### Stats 欄位

`stats` 是陣列，每個元素結構為：

```json
{
  "name": "wins",
  "displayName": "Wins",
  "shortDisplayName": "W",
  "description": "Wins",
  "abbreviation": "W",
  "type": "wins",
  "value": 15.0,
  "displayValue": "15"
}
```

程式碼將 `stats[]` 轉為 `Record<name, displayValue>` map。

## NBA Standings 所有欄位

| stat name | 簡稱 | 狀態 | 說明 | 範例值 |
|-----------|------|------|------|--------|
| `wins` | W | ✅ | 勝場 | 43 |
| `losses` | L | ✅ | 敗場 | 25 |
| `winPercent` | PCT | ✅ | 勝率 | .632 |
| `gamesBehind` | GB | ✅ | 勝差 | 5.5 |
| `streak` | STRK | ✅ | 連勝/連敗 | W3 |
| `overall` | OVER | ⚠️ | 總戰績 | 43-25 |
| `Home` | HOME | ⚠️ **可用** | 主場戰績 | 25-10 |
| `Road` | AWAY | ⚠️ **可用** | 客場戰績 | 18-15 |
| `Last Ten Games` | L10 | ⚠️ **可用** | 近十場 | 7-3 |
| `vs. Div.` | DIV | ⚠️ | 分區對戰 | 8-4 |
| `vs. Conf.` | CONF | ⚠️ | 聯盟對戰 | 30-15 |
| `avgPointsFor` | PPG | ⚠️ | 場均得分 | 116.3 |
| `avgPointsAgainst` | OPP PPG | ⚠️ | 場均失分 | 114.9 |
| `differential` | DIFF | ⚠️ | 場均分差 | +1.3 |
| `pointDifferential` | DIFF | ⚠️ | 總分差 | +91 |
| `pointsFor` | PF | ⚠️ | 總得分 | 7905 |
| `pointsAgainst` | PA | ⚠️ | 總失分 | 7814 |
| `playoffSeed` | POS | ⚠️ | 季後賽種子 | 3 |
| `clincher` | CLINCH | ⚠️ | 晉級/淘汰標記 | x / e |
| `divisionWinPercent` | DPCT | ⚠️ | 分區勝率 | 0.667 |
| `leagueWinPercent` | LPCT | ⚠️ | 聯盟勝率 | 0.652 |
| `gamesAhead` | GA | ⚠️ | 領先場次 | - |
| `points` | PTS | ⚠️ | 積分（用途不明） | -19.0 |

## MLB Standings 所有欄位

| stat name | 簡稱 | 狀態 | 說明 | 範例值 |
|-----------|------|------|------|--------|
| `wins` | W | ✅ | 勝場 | 16 |
| `losses` | L | ✅ | 敗場 | 7 |
| `winPercent` | PCT | ✅ | 勝率 | .696 |
| `gamesBehind` | GB | ✅ | 勝差 | - |
| `streak` | STRK | ⚠️ | 連勝/連敗 | L1 |
| `ties` | T | ⚠️ | 和局 | 1 |
| `overall` | OVER | ⚠️ | 總戰績 | 16-7-1 |
| `Home` | HOME | ⚠️ | 主場戰績 | 8-4-1 |
| `Road` | AWAY | ⚠️ | 客場戰績 | 8-3 |
| `Last Ten Games` | L10 | ⚠️ | 近十場 | 4-5-1 |
| `gamesPlayed` | GP | ⚠️ | 已打場次 | 23 |
| `avgPointsFor` | ARS | ⚠️ | 場均得分 | 6.1 |
| `avgPointsAgainst` | ARA | ⚠️ | 場均失分 | 4.2 |
| `differential` | ADIFF | ⚠️ | 場均分差 | +1.9 |
| `pointDifferential` | DIFF | ⚠️ | 總分差 | +44 |
| `pointsFor` | RS | ⚠️ | 總得分 | 141 |
| `pointsAgainst` | RA | ⚠️ | 總失分 | 97 |
| `homeLosses` | HL | ⚠️ | 主場敗 | 4 |
| `homeWins` | HW | ⚠️ | 主場勝 | 8 |
| `homeTies` | HD | ⚠️ | 主場和 | 1 |
| `roadLosses` | AL | ⚠️ | 客場敗 | 3 |
| `roadWins` | AW | ⚠️ | 客場勝 | 8 |
| `roadTies` | AD | ⚠️ | 客場和 | 0 |
| `divisionGamesBehind` | DGB | ⚠️ | 分區勝差 | - |
| `divisionPercent` | DIV | ⚠️ | 分區勝率 | 0.0% |
| `playoffPercent` | POFF | ⚠️ | 季後賽機率 | <0.1% |
| `wildCardPercent` | WC | ⚠️ | 外卡機率 | 0.0% |
| `magicNumberDivision` | MDIV | ⚠️ | 分區魔術數字 | 0 |
| `magicNumberWildcard` | MWC | ⚠️ | 外卡魔術數字 | 0 |
