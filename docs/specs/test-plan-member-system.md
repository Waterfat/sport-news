# 測試計畫：會員系統（Member System）

> 對應 PRD: `docs/specs/prd-member-system.md`

## TC-1: src/lib/member.ts — findOrCreateMember

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| MEM-001 | P0 | DB 中 provider + account_id 已存在 | 呼叫 findOrCreateMember(provider, profile) | 呼叫 update token 並返回 member |
| MEM-002 | P0 | account_id 不存在，但 email 已有其他帳號 | 呼叫 findOrCreateMember(provider, profile) | 呼叫 upsert member_accounts（帳號合併），返回 existingMember |
| MEM-003 | P0 | 全新會員（無帳號、無 email 匹配） | 呼叫 findOrCreateMember(provider, profile) | insert members + insert member_preferences，返回 newMember |
| MEM-004 | P0 | 建立 member 時 DB 失敗 | 呼叫 findOrCreateMember(provider, profile) | throw Error("Failed to create member") |
| MEM-005 | P1 | DB 有 preferences 資料 | 呼叫 getMemberPreferences(memberId) | 呼叫 select + eq("member_id")，返回 preferences 物件 |
| MEM-006 | P1 | — | 呼叫 updateMemberPreferences(memberId, data) | 呼叫 upsert with member_id，返回更新結果 |
| MEM-007 | P1 | DB 有 member + accounts | 呼叫 getMemberById(id) | 返回 member 物件含 accounts 陣列 |

## TC-2: src/auth.ts — callbacks

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| AUTH-001 | P0 | provider = credentials | jwt callback 觸發 | token.role = "admin"，不呼叫 findOrCreateMember |
| AUTH-002 | P0 | provider = google | jwt callback 觸發 | token.role = "member"，token.memberId = member.id |
| AUTH-003 | P0 | provider = line | jwt callback 觸發 | token.role = "member"，token.memberId = member.id |
| AUTH-004 | P1 | provider = google；findOrCreateMember 拋錯 | jwt callback 觸發 | 降級：token.role = "member"，無 memberId，不中斷 |
| AUTH-005 | P0 | token 含 role + memberId | session callback 觸發 | session.user.role / memberId 正確注入 |
| AUTH-006 | P1 | 請求路徑 /api/cron/* | authorized callback | return true（不需登入） |
| AUTH-007 | P1 | 請求路徑 /api/public/* | authorized callback | return true（不需登入） |
| AUTH-008 | P0 | 請求路徑 /api/member/*；已登入 | authorized callback | return true |
| AUTH-009 | P0 | 請求路徑 /api/member/*；未登入 | authorized callback | return false |
| AUTH-010 | P1 | 請求路徑 /（前台頁面） | authorized callback | return true（全部公開） |

## TC-3: bookmarks/route.ts

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| BKM-001 | P0 | session = null | GET /api/member/bookmarks | 401 { error: "Unauthorized" } |
| BKM-002 | P0 | 已登入；文章已收藏 | GET ?article_id=1 | { bookmarked: true } |
| BKM-003 | P0 | 已登入；文章未收藏 | GET ?article_id=1 | { bookmarked: false }（maybeSingle 回 null） |
| BKM-004 | P0 | 已登入；有多筆收藏 | GET /api/member/bookmarks（列表） | { bookmarks: [...] }，包含 article 欄位 |
| BKM-005 | P0 | session = null | POST /api/member/bookmarks | 401 |
| BKM-006 | P0 | 已登入 | POST body: {}（缺少 article_id） | 400 { error: "Missing article_id" } |
| BKM-007 | P0 | 已登入 | POST body: { article_id: 1 } | { bookmarked: true }，呼叫 upsert |
| BKM-008 | P0 | session = null | DELETE /api/member/bookmarks | 401 |
| BKM-009 | P0 | 已登入 | DELETE /api/member/bookmarks?article_id=1 | { bookmarked: false }，呼叫 delete |

## TC-4: preferences/route.ts

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| PRF-001 | P0 | session = null | GET /api/member/preferences | 401 |
| PRF-002 | P0 | 已登入 | GET /api/member/preferences | { preferences: {...} }，呼叫 getMemberPreferences |
| PRF-003 | P0 | session = null | PUT /api/member/preferences | 401 |
| PRF-004 | P0 | 已登入 | PUT body: { theme: "dark" } | { preferences: {...} }，呼叫 updateMemberPreferences |

## TC-5: favorites/route.ts

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| FAV-001 | P0 | session = null | GET /api/member/favorites | 401 |
| FAV-002 | P0 | 已登入；有 favorite_teams | GET /api/member/favorites | 回傳 prefs.favorite_teams |
| FAV-003 | P0 | 已登入 | POST body: {}（缺少必要欄位） | 400 { error: "Missing fields" } |
| FAV-004 | P0 | 已登入 | POST body: { sport: "NBA", teamId: "LAL" } | 追加到陣列，回傳含新球隊的 favorites |
| FAV-005 | P1 | 已登入；球隊已存在 | POST body: { sport: "NBA", teamId: "LAL" } | 不重複加入，回傳原有陣列 |
| FAV-006 | P0 | 已登入 | DELETE body: { sport: "NBA", teamId: "LAL" } | 過濾後陣列（正確過濾 sport + teamId） |

## TC-6: MemberGateList 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| MGL-001 | P1 | useSession 回傳 loading | 渲染 MemberGateList | container 空（回傳 null） |
| MGL-002 | P0 | 已登入 member | 渲染 MemberGateList with items | 所有 item 顯示 |
| MGL-003 | P0 | 未登入；items > previewCount | 渲染 MemberGateList | 前 N 筆可見，其餘隱藏 |
| MGL-004 | P1 | 未登入；items <= previewCount | 渲染 MemberGateList | 無 blur 遮罩元素 |

## TC-7: LoginButton 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| LB-001 | P0 | 渲染 LoginButton | 點擊按鈕 | LoginModal 開啟（dialog 出現） |
| LB-002 | P1 | 渲染 LoginButton with children="自訂文字" | 檢查按鈕文字 | 顯示「自訂文字」 |

## TC-8: LoginModal 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| LM-001 | P0 | open=true | 渲染 LoginModal | 顯示 Google 和 LINE 按鈕 |
| LM-002 | P0 | open=true | 點擊 Google 按鈕 | signIn("google") 被呼叫 |
| LM-003 | P0 | open=true | 點擊 LINE 按鈕 | signIn("line") 被呼叫 |
| LM-004 | P1 | open=true | 檢查隱私權連結 | href="/privacy" 存在 |

## TC-9: UserMenu 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| UM-001 | P1 | useSession 回傳 loading | 渲染 UserMenu | 顯示骨架（animate-pulse div），無登入按鈕 |
| UM-002 | P0 | 未登入 | 渲染 UserMenu | 顯示「登入」按鈕 |
| UM-003 | P0 | 未登入 | 點擊「登入」按鈕 | LoginModal 開啟（dialog 出現） |
| UM-004 | P1 | Admin 登入 | 渲染 UserMenu（前台） | 顯示「登入」按鈕（不是頭像） |
| UM-005 | P0 | 會員登入 | 渲染 UserMenu | 顯示頭像（initials fallback） |
| UM-006 | P0 | 會員登入 | 展開選單 | 包含「我的關注」和「設定」連結（/settings） |
| UM-007 | P0 | 會員登入 | 點擊「登出」 | signOut({ callbackUrl: "/" }) 被呼叫 |

## TC-10: BookmarkButton 元件

| ID | P | 前置條件 | 操作步驟 | 預期結果 |
|----|---|---------|---------|---------|
| BKB-001 | P1 | 未登入 | 渲染 BookmarkButton | query 不執行（enabled=false），fetch 未呼叫 |
| BKB-002 | P0 | 未登入 | 點擊收藏按鈕 | LoginModal 開啟（dialog 出現） |
| BKB-003 | P0 | 已登入；未收藏 | 渲染 BookmarkButton | 顯示「收藏」（button title "收藏文章"） |
| BKB-004 | P0 | 已登入；已收藏 | 渲染 BookmarkButton | 顯示「已收藏」（button title "取消收藏"） |
| BKB-005 | P0 | 已登入；未收藏 | 點擊 toggle | POST /api/member/bookmarks 被呼叫 |
| BKB-006 | P0 | 已登入；已收藏 | 點擊 toggle | DELETE /api/member/bookmarks 被呼叫 |
