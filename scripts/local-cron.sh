#!/bin/bash
# 本地爬蟲排程腳本
# 每小時爬一次新聞，每小時 15 分改寫一次
# 使用方式：nohup bash scripts/local-cron.sh &
# 停止方式：kill $(cat /tmp/sport-news-cron.pid)

echo $$ > /tmp/sport-news-cron.pid
CRON_SECRET="sport-news-cron-secret-2024"
BASE_URL="http://localhost:3000"

echo "[$(date)] 本地爬蟲排程啟動"

while true; do
  MINUTE=$(date +%M)

  # 每小時整點爬蟲
  if [ "$MINUTE" = "00" ]; then
    echo "[$(date)] 開始爬蟲..."
    RESULT=$(curl -s "$BASE_URL/api/cron/crawl" \
      -H "Authorization: Bearer $CRON_SECRET" 2>&1)
    echo "[$(date)] 爬蟲結果: $RESULT"
  fi

  # 每小時 15 分改寫（使用本地 Claude Code）
  if [ "$MINUTE" = "15" ]; then
    echo "[$(date)] 開始本地改寫..."
    cd "$(dirname "$0")/.."
    npx tsx scripts/local-rewriter.ts 2>&1
    echo "[$(date)] 改寫完成"
  fi

  # 每 60 秒檢查一次
  sleep 60
done
