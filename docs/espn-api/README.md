# ESPN API 文件索引

本專案所有運動數據來自 ESPN 公開 API。此文件記錄各端點的完整欄位結構，避免頻繁實測。

> 最後更新：2026-03-17

## Base URLs

| 用途 | Base URL |
|------|---------|
| 主要 API | `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}` |
| Standings | `https://site.api.espn.com/apis/v2/sports/{sport}/{league}/standings` |

## League 路徑對照表

| Key | ESPN 路徑 | 運動 |
|-----|---------|------|
| `nba` | `basketball/nba` | 籃球 |
| `mlb` | `baseball/mlb` | 棒球 |
| `nfl` | `football/nfl` | 美式足球 |
| `nhl` | `hockey/nhl` | 冰球 |
| `epl` | `soccer/eng.1` | 英超 |
| `laliga` | `soccer/esp.1` | 西甲 |
| `ucl` | `soccer/uefa.champions` | 歐冠 |
| `mls` | `soccer/usa.1` | 美國大聯盟足球 |

## API 端點清單

| 端點 | URL | 文件 | 快取 TTL |
|------|-----|------|---------|
| Scoreboard | `{base}/scoreboard?dates=YYYYMMDD` | [scoreboard.md](./scoreboard.md) | 10s（當天）/ 24h（歷史）|
| Standings | `{standings-base}` | [standings.md](./standings.md) | 5 分鐘 |
| Summary | `{base}/summary?event={eventId}` | [summary.md](./summary.md) | 10s（進行中）/ 1h（已結束）|
| Team | `{base}/teams/{id}` | [team.md](./team.md) | 10 分鐘 |
| Team Roster | `{base}/teams/{id}/roster` | [team.md](./team.md#roster) | 10 分鐘 |
| Player | `{base}/athletes/{id}` | [player.md](./player.md) | 10 分鐘 |

## 快取 TTL 設定

定義在 `src/lib/espn/client.ts`：

| 常數 | TTL | 適用對象 |
|------|-----|---------|
| `LIVE` | 10 秒 | 即時比分、進行中 PBP |
| `ODDS` | 60 秒 | 賠率 |
| `STANDINGS` | 5 分鐘 | 排名 |
| `TEAM` | 10 分鐘 | 球隊、球員資料 |
| `PBP_FINAL` | 1 小時 | 已結束比賽 PBP |
| `HISTORICAL` | 24 小時 | 歷史比分 |

## 圖示說明

文件中使用以下標記：
- ✅ **已使用** — 程式碼已解析並顯示在前端
- ⚠️ **未使用** — API 有回傳但程式碼未解析，可用於未來功能
- 📁 **解析檔案** — 標註在哪個原始碼檔案中解析
