# 體育新聞自動化專案規劃

## 一、專案架構總覽

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────────┐
│  新聞爬蟲    │───▶│  資料儲存    │───▶│  AI 審稿     │───▶│   規劃列表     │
│  (每2小時)   │    │  (DB+圖片)   │    │  (篩選值得寫) │    │ (人工/自動挑選) │
└─────────────┘    └─────────────┘    └─────────────┘    └───────┬───────┘
                                                                │ 挑選或自動全選
                                                                ▼
                                                         ┌─────────────┐
                                                         │  AI 改寫     │
                                                         │  (1對1改寫)  │
                                                         └──────┬──────┘
                                                                │ 自動發布
                                                       ┌───────┴───────┐
                                                       ▼               ▼
                                                ┌─────────────┐ ┌─────────────┐
                                                │  前台網站    │ │  社群頻道    │
                                                │  (SEO+閱讀)  │ │  (Telegram)  │
                                                └─────────────┘ └─────────────┘
```

### 核心流程

1. **爬蟲** — 排程爬取多來源體育新聞，含圖片一併下載儲存
2. **AI 審稿** — AI 寫手 review **自上次規劃以來新增的文章**，篩選出值得改寫的清單
3. **規劃列表** — 後台顯示 AI 推薦的文章列表
   - **人工模式**：管理者可勾選 / 移除要產出的項目
   - **自動模式**：勾選「自動挑選」後，規劃完成即自動全選並進入改寫，跳過人工挑選
4. **AI 改寫** — 選定的文章 1 對 1 改寫，原文有圖片則沿用
5. **自動發布** — 改寫完成後同時：
   - 發布到**前台網站**（含 SEO 優化的文章頁面）
   - 推送到**社群頻道**（目前：Telegram）

### 雙通道發布策略

| 通道 | 用途 | 內容形式 |
|------|------|----------|
| **前台網站** | SEO 流量入口、完整閱讀體驗、未來功能擴充（即時比分等） | 完整文章頁面、圖片、結構化資料 |
| **社群頻道** | 即時觸及訂閱者、導流回網站 | 完整內文 + 圖片 + 網站連結 |

---

## 二、技術規劃

### 技術棧

| 層級 | 技術 | 說明 |
|------|------|------|
| **前台網站** | Next.js 16 (App Router) + Tailwind CSS v4 | SEO 優化的新聞閱讀網站 |
| **後台管理** | Next.js 16 (App Router) + Tailwind CSS v4 + shadcn/ui | 管理介面（同一專案，路由分離） |
| **後端 API** | Next.js API Routes | RESTful API |
| **資料庫** | PostgreSQL (Supabase) | Tokyo region，免費額度 |
| **圖片儲存** | Supabase Storage | 爬蟲抓取的圖片存放 |
| **爬蟲** | Node.js + Cheerio | 靜態頁面解析 |
| **排程** | GitHub Actions Cron | 每 2 小時觸發爬蟲與改寫（Vercel Hobby 限制每日一次，改用 GitHub Actions） |
| **AI 改寫** | Claude Code CLI (`claude -p --model sonnet`) | 使用 CLI 訂閱額度，非 API 計費 |
| **即時通訊** | Supabase Realtime | 後台觸發 → Mac Mini 執行改寫 |
| **社群發布** | Telegram Bot API | 自動推播到頻道（架構支援擴充其他平台） |
| **認證** | NextAuth v5 (Credentials) | 後台登入 |
| **SEO** | Next.js Metadata API + sitemap + robots.txt + JSON-LD | 搜尋引擎優化 |
| **部署** | Vercel (前台+後台) + Mac Mini (改寫腳本) + Supabase (DB) | |

### 執行架構

```
Vercel                    Supabase                 Mac Mini
┌──────────┐             ┌──────────┐             ┌──────────┐
│ Next.js  │──API──────▶│PostgreSQL│◀──Realtime──│ Listener │
│ 前台網站  │             │ Storage  │             │ 改寫腳本  │
│ 後台管理  │             └──────────┘             │ Claude CLI│
│ API       │                  ▲                   └──────────┘
└──────────┘                  │                        │
     ▲                        │                        ▼
     │ Cron 觸發         ┌──────────┐            ┌──────────┐
     └───────────────────│ GitHub   │            │ Telegram  │
     │ ISR (60s)         │ Actions  │            │ Bot API   │
     ▼                   │ 每2小時   │            └──────────┘
┌──────────┐             └──────────┘
│ 讀者瀏覽  │
│ Google    │
│ 搜尋引擎  │
└──────────┘
```

### 資料庫設計

```sql
-- 爬取的原始新聞
raw_articles (
  id UUID PRIMARY KEY,
  source VARCHAR NOT NULL,            -- 來源網站 (ESPN, Yahoo, ETtoday...)
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',         -- 圖片 URL 陣列（含已下載到 Storage 的路徑）
  url VARCHAR UNIQUE NOT NULL,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  category VARCHAR                    -- 分類 (籃球/棒球/足球...)
)

-- AI 產出的文章
generated_articles (
  id UUID PRIMARY KEY,
  raw_article_ids UUID[],             -- 引用的原始文章 ID（1對1 改寫通常只有一個）
  writer_persona_id UUID REFERENCES writer_personas(id),
  title VARCHAR NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',         -- 沿用原文圖片
  status VARCHAR DEFAULT 'draft',     -- draft | published
  slug VARCHAR UNIQUE,
  category VARCHAR,
  meta_description VARCHAR(160),      -- SEO meta description
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0
)

-- 寫手人設
writer_personas (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  style_prompt TEXT NOT NULL,         -- AI 寫作風格 prompt
  writer_type VARCHAR DEFAULT 'official',  -- official | columnist
  specialties JSONB DEFAULT '{}',    -- { sports: [], leagues: [], teams: [] }
  max_articles INTEGER DEFAULT 5,    -- 每次規劃產出上限
  avatar VARCHAR,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE
)

-- 改寫任務佇列（後台 → Mac Mini 通訊）
rewrite_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR DEFAULT 'pending',   -- pending | running | completed | failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  articles_generated INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- 規劃列表（AI 推薦 + 人工/自動挑選）
rewrite_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_persona_id UUID REFERENCES writer_personas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                -- AI 建議的改寫標題
  raw_article_ids UUID[] DEFAULT '{}', -- 對應的原始文章（1對1）
  league VARCHAR,
  plan_type VARCHAR DEFAULT 'official',
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- 社群發布頻道（支援多平台擴充）
publish_channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,              -- telegram | facebook | x_twitter | line | ...
  config JSONB NOT NULL,              -- { bot_token, chat_id, ... } 各平台所需欄位不同
  is_active BOOLEAN DEFAULT TRUE
)

-- 發布紀錄
publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES generated_articles(id),
  channel_id INTEGER REFERENCES publish_channels(id),
  platform VARCHAR NOT NULL,
  status VARCHAR NOT NULL,            -- success | failed
  message_id VARCHAR,
  published_at TIMESTAMPTZ DEFAULT NOW()
)

-- 運動設定
sport_settings (
  sport_key VARCHAR PRIMARY KEY,
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- 全域寫手共用規則
shared_writing_rules (
  id SERIAL PRIMARY KEY,
  rule TEXT NOT NULL,                 -- 規則內容
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,       -- 排序，數字越小越前面
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

### AI 寫手設定

| 寫手名稱 | 類型 | 風格 | 擅長 |
|----------|------|------|------|
| **SportNews 編輯室** | 官方 | 正式新聞編輯風格，客觀專業 | 依後台設定（目前：籃球/NBA） |

> 寫手可在後台自由新增、停用、調整風格與專長。

#### 共用寫作規則

所有寫手在改寫時都會套用的規則，存放在 `shared_writing_rules` 表中，可於後台管理。
寫手管理頁面可查看目前所有啟用中的共用規則。

**目前預設規則：**
1. 人名保留英文原文不翻譯成中文
2. 繁體中文撰寫
3. 不使用「根據報導」「據悉」等轉述用語

> 營運過程中可隨時在後台新增、編輯、停用共用規則，所有寫手自動套用。

### 球種匹配機制

使用**加權計數**判斷文章所屬球種，避免單一關鍵字誤判：

- 統計文章中各球種關鍵字出現次數
- 取出現最多次的球種作為文章主分類
- 寫手只會收到符合其擅長球種的文章
- 官方寫手額外受 `leagues` 設定限制（例如只產 NBA）

---

## 三、核心功能規格

### 3.1 爬蟲系統

**已實作來源：**
- ESPN（英文）
- Yahoo Sports（英文）
- ETtoday 體育（中文）
- NBA 官網（英文）

**觸發方式：**

| 方式 | 行為 | 球種過濾 |
|------|------|----------|
| **手動觸發**（後台爬蟲設定頁「立即爬取」按鈕） | 直接爬取該來源、直接儲存所有文章 | 不過濾 |
| **排程自動**（GitHub Actions Cron 每 2 小時） | 根據球種設定決定要跑哪些來源，爬完後依球種過濾 | 過濾 |

**球種設定的作用（僅影響排程自動爬蟲）：**
- 決定排程時要跑哪些來源（來源需被至少一個啟用球種勾選才會跑）
- 爬完後依球種 + 來源過濾，只存入符合設定的文章
- **不影響手動觸發**，手動觸發一律全部爬取全部儲存

**圖片處理：**
- 爬蟲解析文章時一併抓取內嵌圖片 URL
- 下載圖片至 Supabase Storage，記錄 Storage 路徑到 `raw_articles.images`
- 改寫文章時沿用原文圖片

**去重機制：**
- 以文章 URL 為唯一鍵，重複文章不會重複儲存
- 手動觸發結果顯示新增、重複、過濾各幾篇

### 3.2 AI 審稿與規劃

**流程：**

1. 管理者點擊「規劃」按鈕
2. 系統取得**上次點擊規劃到目前為止新增的原始文章**（非固定取前一天）
3. AI 寫手依據專長篩選匹配的文章
4. 對每篇符合條件的文章，AI 產生建議的改寫標題
5. 規劃列表顯示在後台，包含：
   - 建議標題
   - 對應寫手
   - 引用原文標題與來源
6. **人工模式**：管理者可勾選要產出的項目、移除不要的項目
7. **自動模式**：後台可勾選「自動挑選」開關，啟用後規劃完成即自動全選並觸發改寫，無需人工介入
8. 已有規劃時再次點擊「規劃」，會詢問是否清除重新產生

**去重機制：**
- 跨寫手去重：如果一篇原文已被其他規劃使用，不會重複出現
- 同一寫手內依 `max_articles` 限制產出數量

### 3.3 AI 改寫

**觸發方式：**
- **人工模式**：後台勾選規劃項目 → 點擊「產出文章」
- **自動模式**：規劃完成後自動觸發，無需手動操作

**改寫邏輯：**
- **1 對 1 改寫** — 一篇原文改寫成一篇新文章
- 改寫由 Mac Mini 上的 `local-rewriter.ts` 執行
- 透過 Supabase Realtime 接收後台指令（`rewrite_tasks` 表）
- 改寫完成後文章存入 `generated_articles`，狀態為 `draft`

**改寫規則（寫入 prompt）：**
- 套用 `shared_writing_rules` 中所有啟用的共用規則
- 套用該寫手個人的 `style_prompt` 風格設定
- 原文有圖片則沿用相同圖片
- AI 同時產生 `meta_description`（供前台 SEO 使用）

### 3.4 審核與自動發布

**流程：**
1. 改寫完成 → 文章進入「待審核」(draft) 狀態
2. 管理者在後台可批次通過 / 退回 / 刪除
3. **批次通過審核時，同時：**
   - 文章在前台網站上線（透過 slug 可直接存取）
   - 自動發布到所有啟用的社群頻道
4. 發布成功 → 文章狀態變為 `published`
5. 每次發布結果寫入 `publish_logs` 紀錄

**目前啟用的頻道：**

| 頻道 | 類型 | 帳號 |
|------|------|------|
| 跟著小豪哥一起看球 | Telegram Channel | @howger_sport_news |

**發布格式（Telegram）：**
- 每篇新聞獨立發送一則訊息
- 粗體標題
- **完整內文**（不截斷，給全部文字內容）
- 附帶圖片（如有，隨訊息一併發送）
- 附帶前台網站文章連結（供讀者在網站上閱讀完整版）

**發布管道擴充：**
- `publish_channels` 表與 `publishToChannel()` 函式已設計為多平台架構
- 新增平台只需：(1) 在 `publish_channels` 加入頻道設定 (2) 實作對應的 publisher 模組
- 目前保留 facebook、x_twitter、line 等 type，未來視需求實作

### 3.5 前台新聞網站

**定位：** SEO 優化的體育新聞閱讀網站，未來可擴充即時比分等互動功能。

**頁面規劃：**

| 頁面 | 功能 | SEO |
|------|------|-----|
| `/` | 首頁：最新新聞列表、分類導覽、TG 訂閱推廣 | 動態 sitemap、meta tags |
| `/news/[slug]` | 文章詳情頁：完整內文、圖片、寫手資訊、TG 訂閱引導 | JSON-LD Article、OG tags |
| `/category/[sport]` | 分類頁：依球種瀏覽 | 分類 meta、canonical |
| `/writer/[id]` | 寫手頁：寫手資料、該寫手所有文章 | |

**Telegram 訂閱推廣（站內導流）：**

前台網站需在適當位置放置 Telegram 頻道訂閱引導，將網站流量導向社群：

- **首頁**：顯眼的 CTA 區塊（如 banner 或卡片），引導訂閱 TG 頻道，文案如「即時體育新聞直送手機，立即加入 Telegram 頻道」
- **文章頁底部**：文章讀完後顯示訂閱引導，文案如「喜歡這篇報導？加入我們的 Telegram 頻道，第一時間收到最新體育新聞」
- **側邊欄 / 浮動元件**：（可選）固定位置的小型訂閱提示
- 所有引導連結指向 `https://t.me/howger_sport_news`
- 設計風格需融入網站整體視覺，不突兀但足夠醒目

**SEO 策略：**
- `robots.txt` + `sitemap.xml` 動態產生
- 每篇文章含 `meta_description`（AI 改寫時自動產生）
- JSON-LD 結構化資料（Article schema）
- Open Graph / Twitter Card meta tags（社群分享預覽）
- Next.js ISR（`revalidate = 60`）確保搜尋引擎可抓取，新文章最慢 60 秒內出現在前台

**擴充預留：**
- 路由結構預留 `/scores`、`/live` 等路徑，未來可加入即時比分功能
- 資料庫可擴充賽事、比分相關表（目前不實作）
- 前台元件架構保持模組化，便於新增功能區塊

### 3.6 後台管理介面

**頁面：**

| 頁面 | 功能 |
|------|------|
| `/admin` | 儀表板：文章統計、爬蟲狀態 |
| `/admin/articles` | 文章管理：規劃、產出、批次審核、發布、自動挑選開關 |
| `/admin/articles/[id]` | 文章詳情：編輯、預覽、對照原文 |
| `/admin/personas` | 寫手管理：風格、專長、上限設定、查看共用規則 |
| `/admin/raw` | 原始文章瀏覽 |
| `/admin/analytics` | 分析報表 |
| `/admin/channels` | 社群頻道設定 |
| `/admin/sports` | 爬蟲設定：爬蟲來源管理（新增/編輯/刪除）、手動觸發單一來源爬蟲、球種開關與來源綁定 |
| `/admin/settings` | 全域設定：共用寫作規則管理 |
| `/login` | 後台登入 |

---

## 四、開發進度

### Phase 1：爬蟲 + AI 改寫基礎 ✅

- [x] 專案初始化（Next.js 16 + Supabase）
- [x] 資料庫 schema 設計與建立
- [x] 爬蟲模組（ESPN、Yahoo Sports、ETtoday）
- [x] GitHub Actions Cron 排程（每 2 小時爬蟲 + 改寫）
- [x] AI 改寫引擎（Claude Code CLI）
- [x] 寫手人設 prompt engineering
- [x] 加權計數球種匹配
- [x] 聯盟篩選（只產擅長聯盟的文章）
- [x] 圖片爬取與儲存（爬蟲下載圖片至 Supabase Storage）

### Phase 2：後台管理 + 規劃工作流 ✅

- [x] NextAuth 後台登入
- [x] 文章管理頁（狀態篩選、批次操作）
- [x] 文章詳情頁（編輯、預覽）
- [x] 寫手管理頁（風格、專長、max_articles）
- [x] 儀表板與分析報表
- [x] 規劃工作流（規劃 → 挑選 → 產出）
- [x] 跨寫手去重機制
- [x] Mac Mini 監聽器（Supabase Realtime）

### Phase 3：社群自動發布 🔧 進行中

- [x] Telegram Bot 建立與頻道綁定
- [x] 批次通過審核 → 自動發布到 Telegram
- [x] 發布頻道後台管理
- [x] Telegram 發布完整內文 + 附帶圖片
- [x] Telegram 訊息附帶前台文章連結
- [ ] **發布紀錄寫入 publish_logs**
- [ ] **發布失敗重試機制**

### Phase 4：前台新聞網站 ✅

- [x] 首頁（最新文章 hero + 列表）
- [x] 文章詳情頁（`/news/[slug]`，含留言、相關文章）
- [x] 分類頁（`/category/[slug]`，分頁列表）
- [x] 寫手頁面（`/writer/[id]`）
- [x] SEO 基礎（metadata、動態 sitemap、robots.txt）
- [x] 首頁 Telegram 訂閱推廣區塊（CTA banner）
- [x] 文章頁底部 Telegram 訂閱引導
- [x] SEO 強化（JSON-LD NewsArticle schema、OG tags、canonical）
- [x] Footer 改為 Telegram 頻道訂閱

### Phase 5：規劃增強 + 共用規則 📋 待開發

- [ ] 規劃改為取「上次規劃後新增的文章」而非固定前一天
- [ ] 自動挑選模式（規劃完成自動全選 + 觸發改寫）
- [ ] 共用寫作規則表（shared_writing_rules）建立
- [ ] 共用規則後台管理頁（新增 / 編輯 / 停用 / 排序）
- [ ] 寫手管理頁顯示目前啟用的共用規則
- [ ] 改寫 prompt 動態載入共用規則

### Phase 6：圖片與內容優化 🔧 進行中

- [x] 爬蟲圖片下載至 Supabase Storage
- [x] Telegram 訊息附帶圖片發送
- [ ] **改寫文章沿用原文圖片**

### Phase 7：擴充與優化 📋 待開發

- [ ] 爬蟲來源擴充（更多體育網站）
- [ ] AI 品質回饋（退回原因回饋到 prompt）
- [ ] 更多社群平台串接（Facebook、X、LINE）
- [ ] 即時性：重大賽事加密排程
- [ ] 前台即時比分功能（預留路由 `/scores`、`/live`）

---

## 五、預算規劃

### 目前成本

| 項目 | 服務 | 月費 (USD) |
|------|------|-----------|
| 前台+後台部署 | Vercel Free | $0 |
| 資料庫 | Supabase Free (500MB) | $0 |
| 圖片儲存 | Supabase Storage Free (1GB) | $0 |
| AI 改寫 | Claude Code CLI 訂閱 | 含在訂閱內 |
| 排程 | GitHub Actions Cron | $0（公開 repo 免費） |
| Telegram | Bot API | $0 |
| **小計** | | **$0（僅 Claude 訂閱費）** |

### 成長期（加更多頻道 + 流量成長）

| 項目 | 服務 | 月費 (USD) |
|------|------|-----------|
| 前台+後台部署 | Vercel Free/Pro | $0-20 |
| 資料庫 | Supabase Pro | $25 |
| X API | Basic Plan | $100 |
| **小計** | | **~$125-145/月** |

---

## 六、社群頻道資訊

### Telegram

```
頻道名稱：跟著小豪哥一起看球
頻道連結：https://t.me/howger_sport_news
Bot：@SportNewsNBAbot
```

---

## 七、法律與合規注意事項

1. **著作權**：AI 改寫需達到「實質轉化」程度，不能只是同義詞替換。建議改寫率 > 70%
2. **圖片使用**：引用原始來源圖片需標註出處
3. **AI 生成標示**：建議在頻道說明中標註內容為 AI 輔助產出
4. **robots.txt 遵守**：爬蟲應遵守目標網站的 robots.txt 規範
