#!/bin/bash
# 專案 smoke test — 委派給全域 runner，讀取本專案的 smoke-test.config.json
# 用法: ./scripts/smoke-test.sh [BASE_URL]

GLOBAL_RUNNER="$HOME/.claude/scripts/smoke-test.sh"

if [ -f "$GLOBAL_RUNNER" ]; then
  exec "$GLOBAL_RUNNER" "$@"
else
  echo "Error: 全域 smoke test runner 不存在: $GLOBAL_RUNNER"
  echo "請執行: cp <template> $GLOBAL_RUNNER && chmod +x $GLOBAL_RUNNER"
  exit 1
fi
