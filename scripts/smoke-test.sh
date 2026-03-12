#!/bin/bash
# =============================================================
# Sport News - 部署後 Smoke Test
# 用法: ./scripts/smoke-test.sh [BASE_URL]
# 預設: https://sportnews-ashen.vercel.app
# =============================================================

set -euo pipefail

BASE_URL="${1:-https://sportnews-ashen.vercel.app}"
PASS=0
FAIL=0
COOKIE_JAR=$(mktemp)

trap "rm -f $COOKIE_JAR" EXIT

green() { printf "\033[32m✓ %s\033[0m\n" "$1"; }
red()   { printf "\033[31m✗ %s\033[0m\n" "$1"; }

check() {
  local label="$1"
  if eval "$2"; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo "Smoke Test: $BASE_URL"
echo "========================================"
echo ""

# ----- 1. 前台頁面 -----
echo "--- 前台頁面 ---"

check "首頁回應 200" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")" = "200" ]'

check "登入頁回應 200" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login")" = "200" ]'

# ----- 2. 認證 API -----
echo ""
echo "--- 認證 API ---"

check "NextAuth CSRF 端點回應 csrfToken" \
  'curl -s -c "$COOKIE_JAR" "$BASE_URL/api/auth/csrf" | grep -q "csrfToken"'

check "NextAuth Providers 端點列出 credentials" \
  'curl -s "$BASE_URL/api/auth/providers" | grep -q "credentials"'

# 取得 CSRF token 並測試錯誤登入
CSRF=$(curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])" 2>/dev/null || echo "")

if [ -n "$CSRF" ]; then
  REDIRECT=$(curl -s -X POST -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    "$BASE_URL/api/auth/callback/credentials" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "csrfToken=${CSRF}&username=wrong&password=wrong" \
    -o /dev/null -w "%{redirect_url}")

  check "錯誤帳密登入 → CredentialsSignin 錯誤" \
    'echo "$REDIRECT" | grep -q "CredentialsSignin"'
else
  red "無法取得 CSRF token，跳過登入測試"
  FAIL=$((FAIL + 1))
fi

# ----- 3. 後台 API 需要認證 -----
echo ""
echo "--- 後台 API 認證保護 ---"

check "Dashboard Stats API 回應 401" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/dashboard/stats")" = "401" ]'

check "Generated Articles API 回應 401" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/articles/generated?page=1&limit=1")" = "401" ]'

check "Raw Articles API 回應 401" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/articles/raw?page=1&limit=1")" = "401" ]'

# ----- 4. 公開 API + DB 連通 -----
echo ""
echo "--- 公開 API / DB 連通 ---"

PUBLIC_RESP=$(curl -s "$BASE_URL/api/public/articles?limit=1")

check "Public Articles API 回應 200 且含 articles" \
  'echo "$PUBLIC_RESP" | grep -q "\"articles\""'

check "DB 回傳文章含必要欄位 (id, title, category)" \
  'echo "$PUBLIC_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
a = data.get(\"articles\", [{}])[0]
assert a.get(\"id\"), \"missing id\"
assert a.get(\"title\"), \"missing title\"
assert \"category\" in a, \"missing category\"
assert \"view_count\" in a, \"missing view_count\"
" 2>/dev/null'

check "Public Articles API 含 total 欄位" \
  'echo "$PUBLIC_RESP" | python3 -c "
import sys, json
data = json.load(sys.stdin)
assert isinstance(data.get(\"total\"), int), \"missing total\"
" 2>/dev/null'

# ----- 5. 靜態資源 -----
echo ""
echo "--- 其他 ---"

check "robots.txt 回應 200" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/robots.txt")" = "200" ]'

check "sitemap.xml 回應 200" \
  '[ "$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/sitemap.xml")" = "200" ]'

# ----- 結果 -----
echo ""
echo "========================================"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  printf "\033[32m全部通過: %d/%d\033[0m\n" "$PASS" "$TOTAL"
  exit 0
else
  printf "\033[31m失敗: %d/%d\033[0m\n" "$FAIL" "$TOTAL"
  exit 1
fi
