#!/bin/bash
# E2E test runner for sport_news
# Usage:
#   ./scripts/e2e-test.sh [BASE_URL]
#   E2E_USERNAME=admin E2E_PASSWORD=secret ./scripts/e2e-test.sh https://sportnews-ashen.vercel.app

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ── Base URL ──────────────────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  export BASE_URL="$1"
fi
BASE_URL="${BASE_URL:-https://sportnews-ashen.vercel.app}"

# ── Check Playwright is installed ─────────────────────────────────────────────
if ! npx playwright --version &>/dev/null; then
  echo "Playwright not found. Installing..."
  npm install --save-dev @playwright/test
  npx playwright install chromium
fi

# ── Run tests ─────────────────────────────────────────────────────────────────
echo ""
echo "Running Playwright E2E tests"
echo "  BASE_URL : $BASE_URL"
echo "  Auth     : ${E2E_USERNAME:+credentials set (username=${E2E_USERNAME})}${E2E_USERNAME:-no credentials — admin tests will be skipped}"
echo ""

BASE_URL="$BASE_URL" npx playwright test "$@"

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "All E2E tests passed."
else
  echo "Some E2E tests failed. See e2e-results/ for details."
fi

exit $EXIT_CODE
