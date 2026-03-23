# PRD: 會員系統（Member System）

## 1. 產品願景

為好球研究所（Howger Sport）前台使用者提供免註冊、社群帳號一鍵登入的會員系統，透過內容分級（免費/會員限定）驅動註冊轉換，並提供個人化功能（關注球隊、收藏文章、偏好設定）提升用戶留存率與回訪率。

### 解決的核心問題

- **轉換門檻過高**：傳統表單註冊流失率高，需要零摩擦的社群登入
- **內容缺乏差異化**：所有內容完全公開，沒有動機驅動用戶註冊
- **用戶無法個人化**：訪客無法追蹤喜愛的球隊或收藏文章，每次都要重新找內容
- **缺乏用戶行為數據**：匿名流量無法追蹤個體行為，難以優化內容策略

## 2. 目標用戶

### 主要受眾

| 角色 | 使用頻率 | 需求 |
|------|---------|------|
| **一般訪客**（未登入） | 隨機 | 瀏覽公開新聞與賽事資訊，遇到會員限定內容決定是否登入 |
| **前台會員**（已登入） | 每日多次 | 查看完整賽事數據（賠率/逐球/勝率曲線）、關注球隊、收藏文章 |
| **後台管理員**（Admin） | 每日 | 透過帳密登入後台管理內容，與前台會員系統完全隔離 |

### Persona

**小張 -- 運動迷會員**
- 每天早上通勤時瀏覽 NBA/MLB 新聞與賽事速報
- 關注 3-5 支球隊，希望快速看到相關資訊
- 習慣用 Google 帳號登入各種網站，不想記新密碼
- 痛點：每次都要手動搜尋喜歡的球隊，沒有收藏功能很不方便

### 設計策略傾向

漸進式引導 -- 訪客可瀏覽大部分內容，僅在高價值數據（賠率、逐球紀錄、勝率曲線）設置分級門檻，用「模糊預覽 + 一鍵登入」降低轉換摩擦。

## 3. 核心使用場景

| # | 場景 | 使用者行為 | 期望結果 |
|---|------|-----------|---------|
| 1 | 社群帳號登入 | 點擊「登入」按鈕，選擇 Google 或 LINE | 一鍵完成登入/自動註冊，無需填寫任何表單 |
| 2 | 會員限定內容分級 | 訪客瀏覽賽事頁面，看到模糊遮罩的賠率數據 | 點擊「免費登入」後立即看到完整內容 |
| 3 | 列表型內容分級 | 訪客瀏覽逐球紀錄，只能看到前 N 筆 | 登入後顯示完整列表 |
| 4 | 關注球隊 | 會員在球隊頁面點擊「關注」 | 球隊加入「我的關注」清單，可在設定頁管理 |
| 5 | 收藏文章 | 會員在文章頁點擊「收藏」按鈕 | 文章加入書籤列表，可隨時取消 |
| 6 | 管理個人設定 | 會員進入「設定」頁面 | 查看帳號資訊、管理關注球隊（移除/瀏覽） |
| 7 | 多帳號合併 | 用戶先用 Google 登入，之後用相同 email 的 LINE 登入 | 自動合併為同一會員，兩個 provider 都可登入 |
| 8 | 登出 | 會員點擊 UserMenu 中的「登出」 | 清除 session 並回到首頁 |
| 9 | 後台管理員登入 | 管理員進入 /login 頁面輸入帳號密碼 | 登入後導向 /admin 後台 |

## 4. 功能範圍

### 做什麼（In Scope）

#### 4.1 認證子系統

- **Google OAuth 登入**：透過 NextAuth.js 整合 Google OAuth 2.0，取得 email、姓名、頭像
- **LINE OAuth 登入**：自訂 OAuth provider，取得 LINE profile（userId、displayName、pictureUrl）
- **後台 Credentials 登入**：帳號密碼登入，僅限 Admin 角色，與前台會員完全隔離
- **Session 管理**：使用 NextAuth.js JWT 策略，session 內含 role（admin/member）和 memberId
- **自訂登入頁**：`/login` 為後台登入頁；前台會員透過 LoginModal 彈窗登入

#### 4.2 會員管理

- **自動註冊**：首次 OAuth 登入自動建立 member 記錄 + member_account 關聯 + 預設偏好
- **帳號合併**：同一 email 的不同 OAuth provider 自動關聯到同一 member（以 email 為唯一鍵）
- **Token 更新**：每次 OAuth 登入自動更新 access_token / refresh_token / expires_at
- **Profile 同步**：每次登入時同步更新姓名與頭像（以最新 OAuth profile 為準）

#### 4.3 內容分級（MemberGate）

- **區塊型分級**（`MemberGate` 元件）：包裝任意內容區塊，訪客看到毛玻璃遮罩 + 登入引導卡片，會員看到完整內容
- **列表型分級**（`MemberGateList` 元件）：顯示前 N 筆（預設 5 筆），超過部分加模糊效果，登入後顯示全部
- **Admin 不算前台會員**：Admin 角色在前台被視為訪客，不會觸發會員內容解鎖
- **分級應用場景**：
  - 賽事頁 Money Line 賠率（`GameSummaryTab`）
  - 完整賠率表（`GameOddsTab`）
  - 逐球紀錄 Play-by-Play（`GamePlayByPlayTab`）

#### 4.4 關注球隊（Favorites）

- **新增關注**：在球隊詳情頁點擊「關注」按鈕，記錄 sport + teamId + name
- **移除關注**：在設定頁或球隊頁取消關注
- **防重複**：同一 sport + teamId 不會重複新增
- **儲存方式**：存在 `member_preferences.favorite_teams` JSONB 欄位

#### 4.5 文章收藏（Bookmarks）

- **收藏/取消收藏**：Toggle 式操作，點一次收藏、再點取消
- **收藏狀態查詢**：每篇文章獨立查詢是否已收藏（`?article_id=xxx`）
- **收藏列表**：取得所有已收藏文章（含文章標題、slug、分類、發布時間）
- **未登入引導**：未登入時點擊收藏按鈕，彈出 LoginModal 引導登入

#### 4.6 會員偏好（Preferences）

- **偏好項目**：
  - `favorite_teams`：關注球隊列表（JSONB array）
  - `favorite_leagues`：關注聯盟列表（text array）
  - `notification_line`：LINE 通知開關（boolean）
  - `notification_telegram`：Telegram 通知開關（boolean）
- **漸進式蒐集**：註冊時建立預設空白偏好，用戶自行逐步設定

#### 4.7 前台 UI 元件

- **SessionProvider**：包裝 NextAuth SessionProvider，提供全域 session context
- **LoginModal**：彈窗式登入介面，提供 Google / LINE 兩種登入選項，底部顯示會員功能列表與隱私權政策連結
- **LoginButton**：獨立登入按鈕，點擊打開 LoginModal，可在任意位置使用
- **UserMenu**：Header 右上角的使用者選單，未登入顯示「登入」按鈕，已登入顯示頭像 + 下拉選單（我的關注、設定、登出）
- **BookmarkButton**：文章收藏按鈕，顯示收藏狀態（實心/空心），使用 TanStack Query 管理狀態

#### 4.8 設定頁面

- **路由**：`/settings`
- **帳號資訊**：顯示姓名、Email（唯讀）
- **關注球隊管理**：顯示已關注球隊 Badge 列表，每個可點 X 移除
- **未登入引導**：顯示「登入後即可管理」提示 + LoginButton

### 不做什麼（Out of Scope）

- 會員個人主頁 / 公開 Profile
- 會員間互動（留言、按讚、分享）
- Email / 密碼註冊
- 會員等級 / 付費訂閱
- 會員資料匯出
- 通知推播實際發送（目前僅有偏好開關，尚未實作推播邏輯）
- 書籤列表頁面（目前僅有 API，無獨立的「我的收藏」頁面）

## 5. 技術架構

### 5.1 技術棧

| 層級 | 技術 | 用途 |
|------|------|------|
| 認證框架 | NextAuth.js v5 (Auth.js) | OAuth 整合、JWT session、route 保護 |
| OAuth Provider | Google OAuth 2.0, LINE Login v2.1 | 社群帳號登入 |
| 資料庫 | Supabase (PostgreSQL) | 會員資料、帳號關聯、偏好、書籤 |
| Server State | TanStack Query | 前端資料快取與同步 |
| UI | shadcn/ui + Tailwind CSS | 登入彈窗、使用者選單、設定頁面 |

### 5.2 資料庫 Schema

#### members 表

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 自動產生 |
| email | TEXT (UNIQUE) | Google 提供，LINE 可能為 null |
| name | TEXT | 顯示名稱 |
| avatar_url | TEXT | 頭像 URL |
| role | TEXT | 'member' 或 'admin' |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間 |

#### member_accounts 表

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 自動產生 |
| member_id | UUID (FK -> members) | 關聯會員 |
| provider | TEXT | 'google' 或 'line' |
| provider_account_id | TEXT | OAuth provider 的 user ID |
| access_token | TEXT | OAuth access token |
| refresh_token | TEXT | OAuth refresh token |
| expires_at | BIGINT | Token 過期時間 |
| created_at | TIMESTAMPTZ | 建立時間 |
| UNIQUE | (provider, provider_account_id) | 防止重複關聯 |

#### member_preferences 表

| 欄位 | 型別 | 說明 |
|------|------|------|
| member_id | UUID (PK, FK -> members) | 一對一關聯 |
| favorite_teams | JSONB | [{sport, teamId, name}] |
| favorite_leagues | TEXT[] | ["nba", "mlb"] |
| notification_line | BOOLEAN | LINE 通知開關（預設 false） |
| notification_telegram | BOOLEAN | Telegram 通知開關（預設 false） |
| created_at | TIMESTAMPTZ | 建立時間 |
| updated_at | TIMESTAMPTZ | 更新時間 |

#### article_bookmarks 表

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID (PK) | 自動產生 |
| member_id | UUID (FK -> members) | 關聯會員 |
| article_id | UUID (FK -> generated_articles) | 關聯文章 |
| created_at | TIMESTAMPTZ | 建立時間 |
| UNIQUE | (member_id, article_id) | 防止重複收藏 |

#### page_views 表（擴充）

| 欄位 | 型別 | 說明 |
|------|------|------|
| member_id | UUID (FK -> members, nullable) | 已登入用戶的瀏覽追蹤 |

### 5.3 API 端點

| 方法 | 路徑 | 功能 | 認證 |
|------|------|------|------|
| GET | `/api/member/bookmarks` | 取得收藏列表 / 查詢單篇收藏狀態 | 需登入 |
| POST | `/api/member/bookmarks` | 新增收藏 | 需登入 |
| DELETE | `/api/member/bookmarks` | 取消收藏 | 需登入 |
| GET | `/api/member/favorites` | 取得關注球隊列表 | 需登入 |
| POST | `/api/member/favorites` | 新增關注球隊 | 需登入 |
| DELETE | `/api/member/favorites` | 移除關注球隊 | 需登入 |
| GET | `/api/member/preferences` | 取得會員偏好 | 需登入 |
| PUT | `/api/member/preferences` | 更新會員偏好 | 需登入 |
| POST/GET | `/api/auth/*` | NextAuth 認證端點 | 公開 |

### 5.4 路由保護策略

| 路徑模式 | 策略 |
|----------|------|
| `/api/auth/*` | 公開（NextAuth 內部） |
| `/api/cron/*` | 公開（排程任務） |
| `/api/public/*` | 公開 |
| `/api/member/*` | 需登入（任何角色） |
| `/api/*`（其餘） | 需登入 |
| `/admin/*` | 由 middleware 處理（含 subdomain redirect） |
| `/*`（前台頁面） | 全部公開（內容分級由 MemberGate 元件處理） |

### 5.5 關鍵檔案清單

| 檔案 | 職責 |
|------|------|
| `src/auth.ts` | NextAuth 設定：providers、callbacks（jwt/session/authorized） |
| `src/lib/member.ts` | 會員 CRUD：findOrCreateMember、偏好讀寫、帳號關聯 |
| `src/components/auth/SessionProvider.tsx` | NextAuth SessionProvider 包裝 |
| `src/components/auth/LoginModal.tsx` | 前台登入彈窗（Google / LINE） |
| `src/components/auth/LoginButton.tsx` | 獨立登入按鈕，觸發 LoginModal |
| `src/components/auth/UserMenu.tsx` | Header 使用者選單（登入/頭像/下拉） |
| `src/components/auth/MemberGate.tsx` | 內容分級元件（MemberGate + MemberGateList） |
| `src/components/public/BookmarkButton.tsx` | 文章收藏按鈕（含 TanStack Query 狀態管理） |
| `src/app/api/member/bookmarks/route.ts` | 書籤 API（GET/POST/DELETE） |
| `src/app/api/member/favorites/route.ts` | 關注球隊 API（GET/POST/DELETE） |
| `src/app/api/member/preferences/route.ts` | 偏好 API（GET/PUT） |
| `src/app/(public)/settings/page.tsx` | 會員設定頁面 |
| `src/app/login/page.tsx` | 後台管理員登入頁面 |
| `supabase/migrations/011_member_system.sql` | 會員相關資料表建立 |
| `supabase/migrations/013_article_bookmarks.sql` | 書籤資料表建立 |
| `supabase/migrations/015_page_views_member.sql` | page_views 新增 member_id 欄位 |

## 6. 認證流程

### 6.1 前台會員 OAuth 登入流程

```
使用者點擊「登入」
  -> LoginModal 彈出（Google / LINE 兩個按鈕）
  -> 選擇 provider，呼叫 signIn("google"|"line")
  -> 跳轉到 OAuth 授權頁面
  -> 授權後回調到 NextAuth callback
  -> jwt callback 觸發：
     1. 以 provider + provider_account_id 查詢 member_accounts
     2. 若有 -> 更新 token，返回 member
     3. 若無 -> 以 email 查詢 members（帳號合併）
     4. 若有 -> linkAccount 建立新 provider 關聯
     5. 若無 -> 建立新 member + member_account + member_preferences
     6. token.role = "member", token.memberId = member.id
  -> session callback：將 role + memberId 注入 session.user
  -> 前端 SessionProvider 更新，UI 刷新
```

### 6.2 後台管理員登入流程

```
管理員訪問 /login
  -> 輸入帳號密碼，送出表單
  -> signIn("credentials", { username, password, redirect: false })
  -> Credentials authorize：比對環境變數 ADMIN_USERNAME / ADMIN_PASSWORD
  -> 成功 -> token.role = "admin"
  -> router.push("/admin")
```

### 6.3 帳號合併邏輯

```
findOrCreateMember 的三層查找策略：
  1. provider + provider_account_id 精確匹配 -> 已有帳號，更新 token
  2. email 匹配 -> 自動合併，為既有 member 新增 provider 關聯
  3. 都找不到 -> 全新會員，建立完整記錄
```

## 7. 非功能性需求

### 安全性

- OAuth token 儲存在資料庫，不暴露給前端
- JWT session 不含敏感資訊（僅 role + memberId）
- `/api/member/*` 路由需要有效 session 才能存取
- 所有資料表啟用 RLS（Row Level Security）
- Admin 帳密透過環境變數管理，不寫入程式碼
- 登入彈窗底部顯示隱私權政策連結

### 效能

- BookmarkButton 使用 TanStack Query 管理狀態，避免重複請求
- 設定頁使用 `useQuery` + `enabled` 條件，僅在登入時才發出請求
- MemberGate 在 session 載入中時不渲染任何內容，避免閃爍
- Bookmarks API 使用 `upsert` 避免重複插入的 race condition

### 可用性

- 登入流程最多 2 次點擊（點按鈕 -> 選 provider）
- 未登入用戶看到的分級遮罩提供模糊預覽，讓用戶知道「有內容值得看」
- 收藏按鈕即時反饋（樂觀更新 via TanStack Query `setQueryData`）

## 8. 已知限制與技術債

| # | 項目 | 說明 | 影響 |
|---|------|------|------|
| 1 | LINE 無 email | LINE OAuth 不一定回傳 email，此時無法進行帳號合併 | 同一用戶用 Google 和 LINE 登入可能產生兩個帳號 |
| 2 | 通知開關無實作 | `notification_line` / `notification_telegram` 偏好欄位存在但無對應推播邏輯 | 設定頁尚未暴露這些開關 |
| 3 | 書籤無列表頁 | Bookmarks API 支援列表查詢，但前端無「我的收藏」頁面 | 用戶收藏文章後無法統一瀏覽 |
| 4 | Preferences API 無驗證 | PUT `/api/member/preferences` 直接接受 body 寫入，無 schema 驗證 | 可能寫入非預期欄位 |
| 5 | UserMenu 中「我的關注」和「設定」指向同一頁面 | 兩個選單項都導向 `/settings` | 用戶體驗稍有混淆 |
| 6 | Admin 前台被視為訪客 | Admin 角色在前台無法享受會員功能 | 管理員若要體驗會員功能需另建會員帳號 |
| 7 | 關注球隊無上限 | favorite_teams 沒有數量限制 | JSONB 欄位可能無限增長 |
| 8 | favorite_leagues 未使用 | 偏好中的 `favorite_leagues` 欄位已建立但前端未使用 | 資料表有冗餘欄位 |

## 9. 環境變數

| 變數 | 用途 |
|------|------|
| `GOOGLE_ID` | Google OAuth Client ID |
| `GOOGLE_SECRET` | Google OAuth Client Secret |
| `LINE_CHANNEL_ID` | LINE Login Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Login Channel Secret |
| `ADMIN_USERNAME` | 後台管理員帳號 |
| `ADMIN_PASSWORD` | 後台管理員密碼 |
| `AUTH_SECRET` | NextAuth JWT 加密密鑰 |

## 10. Migration 紀錄

| 檔案 | 內容 |
|------|------|
| `011_member_system.sql` | 建立 members、member_accounts、member_preferences 表 + RLS + 索引 |
| `013_article_bookmarks.sql` | 建立 article_bookmarks 表 + 索引 |
| `015_page_views_member.sql` | page_views 新增 member_id 欄位 + 條件索引 |
