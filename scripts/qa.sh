#!/bin/bash
# 統一 QA 流程 — /dev 和 /deploy 共用
# 用法:
#   ./scripts/qa.sh [BASE_URL]
#   E2E_USERNAME=admin E2E_PASSWORD=secret ./scripts/qa.sh http://localhost:3000
#
# 預設 BASE_URL: https://howger-sport.com（正式環境）
# 本地開發時傳入: ./scripts/qa.sh http://localhost:3000

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BASE_URL="${1:-https://howger-sport.com}"
TOTAL=0
PASSED=0
FAILED=0

print_header() {
  echo ""
  echo "========================================"
  echo "$1"
  echo "  Target: $BASE_URL"
  echo "========================================"
  echo ""
}

print_result() {
  TOTAL=$((TOTAL + 1))
  if [ "$1" -eq 0 ]; then
    PASSED=$((PASSED + 1))
    printf "\033[32m✓ %s\033[0m\n" "$2"
  else
    FAILED=$((FAILED + 1))
    printf "\033[31m✗ %s\033[0m\n" "$2"
  fi
}

# ── 1. Unit Test (Vitest) ────────────────────────────────────
print_header "Step 1/3: Unit Tests (Vitest)"

npx vitest run 2>&1
VITEST_EXIT=$?
print_result $VITEST_EXIT "Vitest unit tests"

if [ $VITEST_EXIT -ne 0 ]; then
  printf "\n\033[31mUnit tests failed. Aborting QA.\033[0m\n"
  exit 1
fi

# ── 2. Smoke Test ────────────────────────────────────────────
print_header "Step 2/3: Smoke Test"

./scripts/smoke-test.sh "$BASE_URL" 2>&1
SMOKE_EXIT=$?
print_result $SMOKE_EXIT "Smoke test"

if [ $SMOKE_EXIT -ne 0 ]; then
  printf "\n\033[31mSmoke test failed. Aborting QA.\033[0m\n"
  exit 1
fi

# ── 3. E2E Test (Playwright) ─────────────────────────────────
print_header "Step 3/3: E2E Tests (Playwright)"

# 從 .env.local 讀取帳密（如果環境變數未設定）
if [ -z "${E2E_USERNAME:-}" ] && [ -f "$REPO_ROOT/.env.local" ]; then
  E2E_USERNAME=$(grep -E "^ADMIN_USERNAME=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '"' || true)
  E2E_PASSWORD=$(grep -E "^ADMIN_PASSWORD=" "$REPO_ROOT/.env.local" | cut -d= -f2- | tr -d '"' || true)
  export E2E_USERNAME E2E_PASSWORD
fi

E2E_USERNAME="${E2E_USERNAME:-}" E2E_PASSWORD="${E2E_PASSWORD:-}" ./scripts/e2e-test.sh "$BASE_URL" 2>&1
E2E_EXIT=$?
print_result $E2E_EXIT "E2E tests"

# ── Summary ──────────────────────────────────────────────────
echo ""
echo "========================================"
if [ $FAILED -eq 0 ]; then
  printf "\033[32mQA Complete: %d/%d passed\033[0m\n" "$PASSED" "$TOTAL"
else
  printf "\033[31mQA Failed: %d/%d passed, %d failed\033[0m\n" "$PASSED" "$TOTAL" "$FAILED"
fi
echo "========================================"

exit $FAILED
