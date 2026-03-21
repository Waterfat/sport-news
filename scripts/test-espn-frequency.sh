#!/bin/bash
# 測試 ESPN API 更新頻率
# 每 5 秒打一次 NBA + MLB scoreboard，記錄 2 分鐘（24 次）

LOG_DIR="/Users/waterfat/Documents/sport_news/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/espn-frequency-$(date '+%Y%m%d-%H%M').log"

echo "=== ESPN API 更新頻率測試 ===" | tee "$LOG_FILE"
echo "開始時間: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "---" | tee -a "$LOG_FILE"

for i in $(seq 1 24); do
  TS=$(date '+%H:%M:%S')

  NBA=$(curl -s "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard" | python3 -c "
import sys, json
data = json.load(sys.stdin)
live = []
for e in data.get('events', []):
    status = e.get('status', {}).get('type', {}).get('name', '')
    if status == 'STATUS_IN_PROGRESS':
        teams = e.get('competitions', [{}])[0].get('competitors', [])
        scores = {t.get('team',{}).get('abbreviation',''): t.get('score','0') for t in teams}
        detail = e.get('status', {}).get('type', {}).get('shortDetail', '')
        parts = [f\"{k} {v}\" for k,v in scores.items()]
        live.append(f\"{'  vs '.join(parts)} | {detail}\")
if live:
    print(' ;; '.join(live))
else:
    print('(無進行中比賽)')
" 2>/dev/null)

  MLB=$(curl -s "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard" | python3 -c "
import sys, json
data = json.load(sys.stdin)
live = []
for e in data.get('events', []):
    status = e.get('status', {}).get('type', {}).get('name', '')
    if status == 'STATUS_IN_PROGRESS':
        teams = e.get('competitions', [{}])[0].get('competitors', [])
        scores = {t.get('team',{}).get('abbreviation',''): t.get('score','0') for t in teams}
        detail = e.get('status', {}).get('type', {}).get('shortDetail', '')
        parts = [f\"{k} {v}\" for k,v in scores.items()]
        live.append(f\"{'  vs '.join(parts)} | {detail}\")
if live:
    print(' ;; '.join(live))
else:
    print('(無進行中比賽)')
" 2>/dev/null)

  echo "$TS | NBA: $NBA | MLB: $MLB" | tee -a "$LOG_FILE"
  sleep 5
done

echo "---" | tee -a "$LOG_FILE"
echo "結束時間: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "Log 已存至: $LOG_FILE" | tee -a "$LOG_FILE"

# 發送 Telegram 通知
tg-notify "ESPN 頻率測試完成，log: $LOG_FILE" 2>/dev/null || true
