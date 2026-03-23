# 測試計畫：會員系統（Member System）

## 1. 範圍與目標

本測試計畫涵蓋 PRD `prd-member-system.md` 定義的會員系統所有功能，目標是在整合層確保各模組正確協作。

**品質目標**
- 所有 API 端點 → 100% 認證邊界覆蓋
- `findOrCreateMember` 三條路徑 → 100% 覆蓋
- MemberGate / MemberGateList → 所有 session 狀態覆蓋
- 關鍵 UI 元件（LoginButton / LoginModal / UserMenu / BookmarkButton）→ 互動流程覆蓋

---

## 2. 現有測試狀況

### 已有（勿重複）

| 測試檔 | 覆蓋範圍 | 狀態 |
|--------|---------|------|
| `src/__tests__/components/MemberGate.test.tsx` | MemberGate 的 4 個 session 狀態 | 通過 |

### 缺口（本計畫補齊）

| 模組 | 缺口描述 |
|------|---------|
| `src/lib/member.ts` | `findOrCreateMember` 三條路徑無測試；`getMemberPreferences`、`updateMemberPreferences`、`getMemberById` 無測試 |
| `src/auth.ts` | jwt callback（credentials / google / line）無測試；session callback 無測試；authorized 路由規則無測試 |
| `src/app/api/member/bookmarks/route.ts` | 未登入 401、GET 列表、GET 單篇、POST 新增、DELETE 取消 全無測試 |
| `src/app/api/member/preferences/route.ts` | 未登入 401、GET、PUT 全無測試 |
| `src/app/api/member/favorites/route.ts` | 未登入 401、GET、POST 新增/防重複、DELETE 全無測試 |
| `MemberGate.tsx` | MemberGateList 元件（列表分級）無測試 |
| `LoginButton.tsx` | 點擊開啟 Modal、自定義 children 無測試 |
| `LoginModal.tsx` | 渲染 providers、Google/LINE 點擊觸發 signIn 無測試 |
| `UserMenu.tsx` | loading 骨架、未登入按鈕、已登入頭像 + 下拉選單、登出、Admin 後台入口 無測試 |
| `BookmarkButton.tsx` | 未登入引導 LoginModal、已收藏狀態渲染、toggle 呼叫正確 method 無測試 |

---

## 3. 測試策略

### 3.1 層次

```
整合測試（本計畫）
├── lib/member.ts   → mock Supabase client，驗證查詢邏輯
├── auth.ts         → mock findOrCreateMember + NextRequest，驗證 callbacks
├── API routes      → mock auth() + Supabase client，驗證 HTTP 行為
└── UI 元件         → mock next-auth/react + fetch，驗證渲染與互動
```

### 3.2 Mock 策略

| 依賴 | Mock 方式 |
|------|---------|
| `@/lib/supabase` | `vi.mock` 返回 chainable builder |
| `@/auth` | `vi.mock` → `auth` 回傳 session stub |
| `next-auth/react` | `vi.mock` → `useSession` / `signIn` / `signOut` |
| `fetch` | `vi.stubGlobal("fetch", mockFetch)` |

### 3.3 測試工具

- Vitest + `@testing-library/react`
- `vi.mock()` / `vi.fn()`
- `renderHook` (hooks)、`render` + `userEvent` (元件)

---

## 4. 測試案例清單

### 4.1 `src/lib/member.ts` — findOrCreateMember

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| MEM-001 | provider + account_id 已存在 → 更新 token 並返回 member | 呼叫 update、返回 member |
| MEM-002 | account_id 不存在 + email 存在 → 帳號合併（linkAccount） | 呼叫 upsert member_accounts、返回 existingMember |
| MEM-003 | 全新會員（無帳號、無 email 匹配）→ 建立 member + account + preferences | 呼叫 insert(members)、insert(member_preferences)、返回 newMember |
| MEM-004 | 建立 member DB 失敗 → 拋出 Error | throw Error("Failed to create member") |
| MEM-005 | `getMemberPreferences` → 返回 preferences 物件 | 呼叫 select + eq("member_id") |
| MEM-006 | `updateMemberPreferences` → upsert 並返回更新結果 | 呼叫 upsert with member_id |
| MEM-007 | `getMemberById` → 返回 member + accounts 陣列 | 包含 accounts 欄位 |

### 4.2 `src/auth.ts` — callbacks

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| AUTH-001 | jwt callback + credentials provider → token.role = "admin" | token.role === "admin"，不呼叫 findOrCreateMember |
| AUTH-002 | jwt callback + google provider → 呼叫 findOrCreateMember，設 token.role/memberId | token.role === "member"，token.memberId = member.id |
| AUTH-003 | jwt callback + line provider → 同上 | token.role === "member" |
| AUTH-004 | jwt callback + google，findOrCreateMember 拋錯 → 降級設定 role=member，不中斷 | token.role === "member"，無 memberId |
| AUTH-005 | session callback → 注入 role + memberId 到 session.user | session.user.role / memberId 正確 |
| AUTH-006 | authorized + /api/cron/* → 不需登入（return true） | true |
| AUTH-007 | authorized + /api/public/* → 不需登入 | true |
| AUTH-008 | authorized + /api/member/* + 已登入 → 允許 | true |
| AUTH-009 | authorized + /api/member/* + 未登入 → 拒絕 | false |
| AUTH-010 | authorized + 前台頁面 → 全部公開 | true |

### 4.3 `bookmarks/route.ts`

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| BKM-001 | GET 未登入 → 401 | { error: "Unauthorized" } |
| BKM-002 | GET 查詢單篇（已收藏） → { bookmarked: true } | 正確查詢 article_id |
| BKM-003 | GET 查詢單篇（未收藏） → { bookmarked: false } | maybeSingle 回 null |
| BKM-004 | GET 列表 → { bookmarks: [...] } | 包含 article 欄位 |
| BKM-005 | POST 未登入 → 401 | { error: "Unauthorized" } |
| BKM-006 | POST 缺少 article_id → 400 | { error: "Missing article_id" } |
| BKM-007 | POST 成功 → { bookmarked: true } | 呼叫 upsert |
| BKM-008 | DELETE 未登入 → 401 | { error: "Unauthorized" } |
| BKM-009 | DELETE 成功 → { bookmarked: false } | 呼叫 delete |

### 4.4 `preferences/route.ts`

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| PRF-001 | GET 未登入 → 401 | { error: "Unauthorized" } |
| PRF-002 | GET 已登入 → { preferences: {...} } | 呼叫 getMemberPreferences |
| PRF-003 | PUT 未登入 → 401 | { error: "Unauthorized" } |
| PRF-004 | PUT 已登入 → { preferences: {...} } | 呼叫 updateMemberPreferences |

### 4.5 `favorites/route.ts`

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| FAV-001 | GET 未登入 → 401 | { error: "Unauthorized" } |
| FAV-002 | GET 已登入，回傳 favorite_teams | prefs.favorite_teams |
| FAV-003 | POST 缺少欄位 → 400 | { error: "Missing fields" } |
| FAV-004 | POST 新增球隊 → 包含新球隊的 favorites | 追加到陣列 |
| FAV-005 | POST 重複球隊 → 不重複加入 | 回傳原有陣列 |
| FAV-006 | DELETE 移除球隊 → 過濾後陣列 | 正確過濾 sport + teamId |

### 4.6 MemberGateList 元件

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| MGL-001 | loading → 回傳 null | container 空 |
| MGL-002 | 已登入 member → 渲染全部 items | 所有 item 顯示 |
| MGL-003 | 未登入，items > previewCount → 渲染預覽筆數 | 前 N 筆可見 |
| MGL-004 | 未登入，items <= previewCount → 不顯示模糊遮罩 | 無 blur 元素 |

### 4.7 LoginButton 元件

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| LB-001 | 點擊按鈕 → LoginModal 開啟 | dialog 出現 |
| LB-002 | 自定義 children → 顯示自定義文字 | 文字正確 |

### 4.8 LoginModal 元件

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| LM-001 | open=true → 渲染 Google / LINE 按鈕 | 兩個按鈕存在 |
| LM-002 | 點擊 Google → signIn("google") 被呼叫 | signIn 呼叫正確 |
| LM-003 | 點擊 LINE → signIn("line") 被呼叫 | signIn 呼叫正確 |
| LM-004 | 顯示隱私權政策連結 | href="/privacy" |

### 4.9 UserMenu 元件

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| UM-001 | loading → 顯示骨架（animate-pulse div） | 無登入按鈕 |
| UM-002 | 未登入 → 顯示「登入」按鈕 | 按鈕文字 |
| UM-003 | 未登入點「登入」→ LoginModal 開啟 | dialog 出現 |
| UM-004 | Admin 登入 → 前台顯示「登入」按鈕（不是頭像） | 按鈕存在 |
| UM-005 | 會員登入 → 顯示頭像（initials fallback） | 首字母顯示 |
| UM-006 | 會員登入 → 選單包含「我的關注」和「設定」連結 | /settings 連結 |
| UM-007 | 點擊「登出」→ signOut 被呼叫 | signOut({ callbackUrl: "/" }) |

### 4.10 BookmarkButton 元件

| TC-ID | 場景 | 預期結果 |
|-------|------|---------|
| BKB-001 | 未登入 → query 不執行（enabled=false） | fetch 未呼叫 |
| BKB-002 | 未登入點收藏 → LoginModal 開啟 | dialog 出現 |
| BKB-003 | 已登入，未收藏 → 顯示「收藏」 | button title "收藏文章" |
| BKB-004 | 已登入，已收藏 → 顯示「已收藏」 | button title "取消收藏" |
| BKB-005 | 點擊 toggle（未收藏）→ POST /api/member/bookmarks | 呼叫 POST |
| BKB-006 | 點擊 toggle（已收藏）→ DELETE /api/member/bookmarks | 呼叫 DELETE |

---

## 5. 測試檔案清單

| 測試檔 | 對應模組 |
|--------|---------|
| `src/__tests__/lib/member.test.ts` | `src/lib/member.ts` |
| `src/__tests__/lib/auth-callbacks.test.ts` | `src/auth.ts` callbacks |
| `src/__tests__/api/bookmarks.test.ts` | bookmarks API route |
| `src/__tests__/api/preferences.test.ts` | preferences API route |
| `src/__tests__/api/favorites.test.ts` | favorites API route |
| `src/__tests__/components/MemberGateList.test.tsx` | MemberGateList 元件 |
| `src/__tests__/components/LoginButton.test.tsx` | LoginButton 元件 |
| `src/__tests__/components/LoginModal.test.tsx` | LoginModal 元件 |
| `src/__tests__/components/UserMenu.test.tsx` | UserMenu 元件 |
| `src/__tests__/components/BookmarkButton.test.tsx` | BookmarkButton 元件 |

---

## 6. 退出條件

- 所有測試案例通過（0 failures）
- `npx vitest run` 無紅燈
- 新增測試不得影響既有測試
