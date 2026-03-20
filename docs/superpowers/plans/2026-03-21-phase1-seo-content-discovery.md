# Phase 1: SEO 與內容發現 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 強化 SEO 基礎建設與內容發現機制，讓搜尋引擎（含 AI 搜尋）能更好地索引與引用網站內容。

**Architecture:** 分為 9 個獨立 task：SEO 技術優化（robots/llms.txt）、route helper 擴充、球隊 slug 映射表、球隊 slug 路由（整合到既有 [id] page）、sitemap 完整補全、文章延伸閱讀、首頁快訊區塊、骨架屏載入態、最終驗證。每個 task 可獨立 commit。

**Tech Stack:** Next.js 16 App Router, React 19, Supabase PostgreSQL, Tailwind CSS 4, shadcn/ui, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-ux-visual-seo-optimization-design.md`

---

## File Structure

### 新增檔案
| 檔案 | 職責 |
|------|------|
| `public/llms.txt` | AI 搜尋引擎網站描述 |
| `src/components/public/QuickNews.tsx` | 首頁快訊區塊（標題列表） |
| `src/components/public/ExtendedReading.tsx` | 文章底部延伸閱讀 |
| `src/components/public/ArticleCardSkeleton.tsx` | 文章卡片骨架屏 |
| `src/__tests__/lib/team-slugs.test.ts` | slug 映射表測試 |
| `src/__tests__/lib/routes-extended.test.ts` | 新 route helper 測試 |
| `src/__tests__/components/QuickNews.test.tsx` | 快訊元件測試 |
| `src/__tests__/components/ExtendedReading.test.tsx` | 延伸閱讀元件測試 |
| `src/__tests__/components/ArticleCardSkeleton.test.tsx` | 骨架屏元件測試 |

### 修改檔案
| 檔案 | 修改內容 |
|------|----------|
| `src/app/robots.ts` | 新增 AI bot 明確規則 |
| `src/app/sitemap.ts` | 補入 team/player/game 動態頁面 + slug 頁面 |
| `src/lib/routes.ts` | 新增 `teamSlugUrl()`、`absoluteTeamUrl()`、`absolutePlayerUrl()`、`absoluteGameUrl()` |
| `src/lib/constants.ts` | 新增 `TEAM_SLUG_MAP` 映射表 |
| `src/app/(public)/team/[sport]/[id]/page.tsx` | 整合 slug 解析邏輯（slug → ID redirect） |
| `src/app/(public)/page.tsx` | 插入 QuickNews 元件 |
| `src/app/(public)/news/[slug]/page.tsx` | 加入 ExtendedReading 元件 |
| `smoke-test.config.json` | 新增 llms.txt、slug redirect 檢查 |

### 明確 Defer 的項目
以下 spec 項目複雜度高，獨立開 issue 在後續迭代實作：
- **文章內文自動連結**（spec 2.1 bullet 3）：需要 react-markdown custom renderer、名稱比對、消歧義，獨立 issue
- **分類頁側邊欄**（spec 2.1 bullet 2「本週熱門」「同隊新聞」）：需要分類頁佈局改動，獨立 issue

---

## Task 1: SEO 技術優化 — robots.ts + llms.txt

**Files:**
- Modify: `src/app/robots.ts`
- Create: `public/llms.txt`
- Modify: `smoke-test.config.json`

- [ ] **Step 1: 更新 robots.ts 加入 AI 爬蟲規則**

```typescript
// src/app/robots.ts
import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: 建立 llms.txt**

```text
# 超級運動資訊網 (Howger Sport)

> 台灣繁體中文運動新聞平台，提供 NBA、MLB、足球即時報導與深度分析。

## 網站內容

- 即時運動新聞文章（AI 輔助生成 + 人工審核）
- 即時比分（NBA、MLB、NFL）
- 賠率分析
- 聯盟排名
- 球隊與球員資訊

## 主要頁面

- /: 首頁，最新新聞與即時比分
- /category/nba: NBA 新聞
- /category/mlb: MLB 新聞
- /category/soccer: 足球新聞
- /category/general: 綜合運動新聞
- /scores: 即時比分
- /standings/nba: NBA 排名
- /odds: 賠率分析
- /news/[slug]: 新聞文章
- /team/[sport]/[id]: 球隊頁面
- /player/[sport]/[id]: 球員頁面

## 聯絡

- 網站: https://howger-sport.com
- Telegram: https://t.me/howger_sport_news
```

- [ ] **Step 3: 更新 smoke-test.config.json**

在 `public_apis` 陣列加入：
```json
"/llms.txt"
```

- [ ] **Step 4: 本地驗證**

Run: `npx next build 2>&1 | tail -5` — 確認 build 通過
Run: `curl -s http://localhost:3000/robots.txt` — 確認 AI bot 規則出現
Run: `curl -s http://localhost:3000/llms.txt` — 確認內容正確

- [ ] **Step 5: Commit**

```bash
git add src/app/robots.ts public/llms.txt smoke-test.config.json
git commit -m "feat(seo): add AI bot rules to robots.ts and create llms.txt"
```

---

## Task 2: Route Helper 擴充

**Files:**
- Modify: `src/lib/routes.ts`
- Create: `src/__tests__/lib/routes-extended.test.ts`

- [ ] **Step 1: 寫測試**

```typescript
// src/__tests__/lib/routes-extended.test.ts
import { describe, expect, it } from "vitest";
import {
  teamSlugUrl,
  absoluteTeamUrl,
  absolutePlayerUrl,
  absoluteGameUrl,
} from "@/lib/routes";

describe("extended route helpers", () => {
  it("teamSlugUrl generates /team/:sport/:slug", () => {
    expect(teamSlugUrl("nba", "lakers")).toBe("/team/nba/lakers");
  });

  it("absoluteTeamUrl generates full team URL", () => {
    expect(absoluteTeamUrl("https://example.com", "nba", "13")).toBe(
      "https://example.com/team/nba/13"
    );
  });

  it("absolutePlayerUrl generates full player URL", () => {
    expect(absolutePlayerUrl("https://example.com", "nba", "3112335")).toBe(
      "https://example.com/player/nba/3112335"
    );
  });

  it("absoluteGameUrl generates full game URL", () => {
    expect(absoluteGameUrl("https://example.com", "nba", "401584793")).toBe(
      "https://example.com/game/nba/401584793"
    );
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/__tests__/lib/routes-extended.test.ts`
Expected: FAIL — 函式不存在

- [ ] **Step 3: 實作 route helpers**

在 `src/lib/routes.ts` 末尾新增：

```typescript
/** SEO 友善的球隊 slug URL（如 /team/nba/lakers），會被 redirect 到 canonical /team/nba/13 */
export function teamSlugUrl(sport: string, slug: string) {
  return `/team/${sport}/${slug}`;
}

/** 產生完整球隊 URL（含 domain），用於 sitemap/SEO */
export function absoluteTeamUrl(baseUrl: string, sport: string, teamId: string) {
  return `${baseUrl}/team/${sport}/${teamId}`;
}

/** 產生完整球員 URL（含 domain），用於 sitemap/SEO */
export function absolutePlayerUrl(baseUrl: string, sport: string, playerId: string) {
  return `${baseUrl}/player/${sport}/${playerId}`;
}

/** 產生完整比賽 URL（含 domain），用於 sitemap/SEO */
export function absoluteGameUrl(baseUrl: string, sport: string, gameId: string) {
  return `${baseUrl}/game/${sport}/${gameId}`;
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/__tests__/lib/routes-extended.test.ts`
Expected: PASS

- [ ] **Step 5: 跑全部測試確認無回歸**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/routes.ts src/__tests__/lib/routes-extended.test.ts
git commit -m "feat(routes): add team slug, player, game absolute URL helpers"
```

---

## Task 3: 球隊 Slug 映射表

**Files:**
- Modify: `src/lib/constants.ts`
- Create: `src/__tests__/lib/team-slugs.test.ts`

- [ ] **Step 1: 從 ESPN API 取得正確的 team ID + slug**

先驗證 ESPN API 的 team ID 格式：

Run: `curl -s "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams" | python3 -c "import sys,json; [print(t['team']['id'], t['team']['slug']) for t in json.load(sys.stdin)['sports'][0]['leagues'][0]['teams']]"`

Run: `curl -s "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams" | python3 -c "import sys,json; [print(t['team']['id'], t['team']['slug']) for t in json.load(sys.stdin)['sports'][0]['leagues'][0]['teams']]"`

記錄輸出結果，用於下一步建立映射表。

- [ ] **Step 2: 寫測試**

```typescript
// src/__tests__/lib/team-slugs.test.ts
import { describe, expect, it } from "vitest";
import { TEAM_SLUG_MAP, getTeamIdBySlug } from "@/lib/constants";

describe("TEAM_SLUG_MAP", () => {
  it("contains NBA teams", () => {
    // 使用 Step 1 驗證過的正確 ID
    expect(TEAM_SLUG_MAP["nba:lakers"]).toBeDefined();
    expect(TEAM_SLUG_MAP["nba:celtics"]).toBeDefined();
  });

  it("contains MLB teams", () => {
    expect(TEAM_SLUG_MAP["mlb:yankees"]).toBeDefined();
    expect(TEAM_SLUG_MAP["mlb:dodgers"]).toBeDefined();
  });

  it("has 30 NBA teams", () => {
    const nbaCount = Object.keys(TEAM_SLUG_MAP).filter(k => k.startsWith("nba:")).length;
    expect(nbaCount).toBe(30);
  });

  it("has 30 MLB teams", () => {
    const mlbCount = Object.keys(TEAM_SLUG_MAP).filter(k => k.startsWith("mlb:")).length;
    expect(mlbCount).toBe(30);
  });
});

describe("getTeamIdBySlug", () => {
  it("returns ESPN ID for valid slug", () => {
    const id = getTeamIdBySlug("nba", "lakers");
    expect(id).not.toBeNull();
    expect(typeof id).toBe("string");
  });

  it("returns null for invalid slug", () => {
    expect(getTeamIdBySlug("nba", "nonexistent")).toBeNull();
  });

  it("returns null for invalid sport", () => {
    expect(getTeamIdBySlug("cricket", "lakers")).toBeNull();
  });
});
```

- [ ] **Step 3: 跑測試確認失敗**

Run: `npx vitest run src/__tests__/lib/team-slugs.test.ts`
Expected: FAIL

- [ ] **Step 4: 實作映射表**

在 `src/lib/constants.ts` 末尾新增（使用 Step 1 取得的正確 ID）：

```typescript
/**
 * 球隊 slug → ESPN team ID 映射表
 * 格式: "sport:slug" → "espn_id"
 * 用於 SEO 友善的 URL（如 /team/nba/lakers）解析為 ESPN ID
 * ID 來源：ESPN site API /apis/site/v2/sports/{sport}/{league}/teams
 */
export const TEAM_SLUG_MAP: Record<string, string> = {
  // NBA — 從 ESPN API 驗證的 ID
  // （實作時填入 Step 1 的驗證結果）
};

/** 根據 sport + slug 取得 ESPN team ID，找不到回傳 null */
export function getTeamIdBySlug(sport: string, slug: string): string | null {
  return TEAM_SLUG_MAP[`${sport}:${slug}`] ?? null;
}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npx vitest run src/__tests__/lib/team-slugs.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/__tests__/lib/team-slugs.test.ts
git commit -m "feat(seo): add TEAM_SLUG_MAP for SEO-friendly team URLs"
```

---

## Task 4: 球隊 Slug 路由（整合到既有 [id] page）

**Files:**
- Modify: `src/app/(public)/team/[sport]/[id]/page.tsx`

**依賴**: Task 2 + Task 3

**重要**：不建立新的 `[slug]/page.tsx`，因為 Next.js App Router 不允許同層有兩個動態路由段。改為在既有 `[id]/page.tsx` 內判斷：如果 `id` 不是數字且存在於 slug map 中，做 301 permanent redirect。

- [ ] **Step 1: 修改既有 team page 加入 slug 解析**

```typescript
// src/app/(public)/team/[sport]/[id]/page.tsx
import { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { TeamDetailClient } from "@/components/team/TeamDetailClient";
import { SPORT_KEY_LABELS, SITE_URL, getTeamIdBySlug } from "@/lib/constants";
import { teamUrl } from "@/lib/routes";
import { TeamJsonLd } from "./TeamJsonLd";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, id } = await params;

  // If id is a slug, return minimal metadata — the page will redirect to canonical URL
  const resolvedId = getTeamIdBySlug(sport, id);
  if (resolvedId) {
    return { robots: { index: false } };
  }

  const sportLabel = SPORT_KEY_LABELS[sport] || sport.toUpperCase();
  const title = `${sportLabel} 球隊 #${id}`;
  const ogUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(sportLabel)}&type=team`;

  return {
    title,
    openGraph: {
      title,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [ogUrl],
    },
  };
}

export default async function TeamPage({ params }: Props) {
  const { sport, id } = await params;

  // If id is a slug (not numeric), resolve and permanent redirect to canonical URL
  const resolvedId = getTeamIdBySlug(sport, id);
  if (resolvedId) {
    permanentRedirect(teamUrl(sport, resolvedId));
  }

  return (
    <>
      <TeamJsonLd sport={sport} teamId={id} />
      <TeamDetailClient sport={sport} teamId={id} />
    </>
  );
}
```

- [ ] **Step 2: 本地驗證**

Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/team/nba/lakers` — 預期 308（permanent redirect）
Run: `curl -sL -o /dev/null -w '%{http_code}' http://localhost:3000/team/nba/lakers` — 預期 200（follow redirect 到 /team/nba/13）
Run: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/team/nba/13` — 預期 200（直接訪問不 redirect）

- [ ] **Step 3: Commit**

```bash
git add src/app/\(public\)/team/\[sport\]/\[id\]/page.tsx
git commit -m "feat(seo): integrate slug resolution into team page with permanent redirect"
```

---

## Task 5: Sitemap 完整補全

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `smoke-test.config.json`

**依賴**: Task 2 (route helpers) + Task 3 (slug map)

- [ ] **Step 1: 修改 sitemap.ts 補入所有動態頁面**

```typescript
// src/app/sitemap.ts — 完整版
import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase";
import { SITE_URL, TEAM_SLUG_MAP } from "@/lib/constants";
import {
  absoluteCategoryUrl,
  absoluteNewsUrl,
  absoluteWriterUrl,
  absoluteTeamUrl,
} from "@/lib/routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  // Fetch all published articles
  const { data: articles } = await supabase
    .from("generated_articles")
    .select("id, slug, published_at, category")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Fetch all active writers
  const { data: writers } = await supabase
    .from("writer_personas")
    .select("id")
    .eq("is_active", true);

  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  entries.push({
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 1,
  });

  // Static pages
  const staticPages = [
    { path: "/scores", changeFrequency: "hourly" as const, priority: 0.9 },
    { path: "/odds", changeFrequency: "hourly" as const, priority: 0.8 },
    { path: "/standings/nba", changeFrequency: "daily" as const, priority: 0.7 },
    { path: "/install", changeFrequency: "monthly" as const, priority: 0.3 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.2 },
  ];

  for (const page of staticPages) {
    entries.push({
      url: `${SITE_URL}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  // Category pages
  const categories = ["nba", "mlb", "soccer", "general"];
  for (const cat of categories) {
    entries.push({
      url: absoluteCategoryUrl(SITE_URL, cat),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    });
  }

  // Article pages
  if (articles) {
    for (const article of articles) {
      entries.push({
        url: absoluteNewsUrl(SITE_URL, article.slug || article.id),
        lastModified: article.published_at
          ? new Date(article.published_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  // Writer pages
  if (writers) {
    for (const writer of writers) {
      entries.push({
        url: absoluteWriterUrl(SITE_URL, writer.id),
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  // Team pages (SEO-friendly slug URLs)
  for (const [key, teamId] of Object.entries(TEAM_SLUG_MAP)) {
    const [sport] = key.split(":");
    entries.push({
      url: absoluteTeamUrl(SITE_URL, sport, teamId),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
```

注意：sitemap 使用 canonical URL（`/team/nba/13`）而非 slug URL，因為 slug 會 redirect。Player 和 game 頁面因為 ID 需要從 DB/API 動態取得，數量龐大且變動頻繁，暫不加入 sitemap（Google 可透過文章內連結爬取）。

- [ ] **Step 2: 更新 smoke-test.config.json**

在 `custom_checks` 加入 slug redirect 驗證（不放 `pages_200`，因為 308 不是 200）：
```json
{
  "label": "Team slug redirect /team/nba/lakers → 308",
  "command": "STATUS=$(curl -s -o /dev/null -w '%{http_code}' --max-redirs 0 '{{BASE_URL}}/team/nba/lakers') && [ \"$STATUS\" = \"308\" ]"
}
```

- [ ] **Step 3: 本地驗證**

Run: `curl -s http://localhost:3000/sitemap.xml | grep -c '/team/'` — 預期 60（30 NBA + 30 MLB 球隊）

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts smoke-test.config.json
git commit -m "feat(seo): complete sitemap with team pages"
```

---

## Task 6: 文章延伸閱讀

**Files:**
- Create: `src/components/public/ExtendedReading.tsx`
- Create: `src/__tests__/components/ExtendedReading.test.tsx`
- Modify: `src/app/(public)/news/[slug]/page.tsx`

- [ ] **Step 1: 寫測試**

```typescript
// src/__tests__/components/ExtendedReading.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExtendedReading } from "@/components/public/ExtendedReading";

const mockArticles = {
  sameCategory: [
    { id: "1", title: "NBA 季後賽分析", slug: "nba-playoff", category: "NBA", published_at: "2026-03-20" },
    { id: "2", title: "湖人交易消息", slug: "lakers-trade", category: "NBA", published_at: "2026-03-19" },
  ],
  crossCategory: [
    { id: "3", title: "MLB 開幕戰預測", slug: "mlb-opening", category: "棒球", published_at: "2026-03-18" },
    { id: "4", title: "英超本週焦點", slug: "epl-focus", category: "足球", published_at: "2026-03-17" },
  ],
};

describe("ExtendedReading", () => {
  it("renders both same-category and cross-category articles", () => {
    render(
      <ExtendedReading
        sameCategory={mockArticles.sameCategory}
        crossCategory={mockArticles.crossCategory}
      />
    );
    expect(screen.getByText("延伸閱讀")).toBeInTheDocument();
    expect(screen.getByText("NBA 季後賽分析")).toBeInTheDocument();
    expect(screen.getByText("MLB 開幕戰預測")).toBeInTheDocument();
  });

  it("renders nothing when both arrays are empty", () => {
    const { container } = render(
      <ExtendedReading sameCategory={[]} crossCategory={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses newsUrl route helper for links", () => {
    render(
      <ExtendedReading
        sameCategory={mockArticles.sameCategory}
        crossCategory={[]}
      />
    );
    const link = screen.getByText("NBA 季後賽分析").closest("a");
    expect(link).toHaveAttribute("href", "/news/nba-playoff");
  });

  it("falls back to id when slug is null", () => {
    render(
      <ExtendedReading
        sameCategory={[{ id: "99", title: "No Slug", slug: null, category: "NBA", published_at: null }]}
        crossCategory={[]}
      />
    );
    const link = screen.getByText("No Slug").closest("a");
    expect(link).toHaveAttribute("href", "/news/99");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/__tests__/components/ExtendedReading.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 ExtendedReading 元件**

```tsx
// src/components/public/ExtendedReading.tsx
import Link from "next/link";
import { newsUrl } from "@/lib/routes";
import { formatRelativeTime, CATEGORY_COLORS } from "@/lib/constants";

interface Article {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  published_at: string | null;
}

interface ExtendedReadingProps {
  sameCategory: Article[];
  crossCategory: Article[];
}

export function ExtendedReading({ sameCategory, crossCategory }: ExtendedReadingProps) {
  const all = [...sameCategory, ...crossCategory];
  if (all.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-foreground mb-5 border-l-4 border-emerald-600 pl-3">
        延伸閱讀
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {all.map((article) => (
          <Link
            key={article.id}
            href={newsUrl(article.slug || article.id)}
            className="group block rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-emerald-300 transition-all"
          >
            {article.category && (
              <span
                className={`inline-block text-xs px-2 py-0.5 mb-2 ${CATEGORY_COLORS[article.category] ?? "bg-gray-500 text-white rounded-md"}`}
              >
                {article.category}
              </span>
            )}
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-emerald-600 transition-colors mb-2">
              {article.title}
            </h3>
            <time className="text-xs text-muted-foreground">
              {formatRelativeTime(article.published_at)}
            </time>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

注意：此元件**不需要 `"use client"`**，所有 props 由 server component 傳入，`formatRelativeTime` 是純函式，`Link` 是 Next.js server-compatible 元件。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/__tests__/components/ExtendedReading.test.tsx`
Expected: PASS

- [ ] **Step 5: 在文章頁新增跨分類查詢**

修改 `src/app/(public)/news/[slug]/page.tsx`，在既有 `relatedArticles` 查詢之後新增：

```typescript
const { data: crossCategoryArticles } = await supabase
  .from("generated_articles")
  .select("id, title, slug, category, published_at")
  .eq("status", "published")
  .neq("category", article.category)
  .neq("id", article.id)
  .order("published_at", { ascending: false })
  .limit(3);
```

- [ ] **Step 6: 在文章頁加入 ExtendedReading JSX**

在 `{/* Related Articles */}` section 之後加入：

```tsx
import { ExtendedReading } from "@/components/public/ExtendedReading";

<ExtendedReading
  sameCategory={(relatedArticles ?? []).slice(0, 3).map(a => ({
    ...a,
    slug: a.slug ?? null,
    category: a.category ?? null,
    published_at: a.published_at ?? null,
  }))}
  crossCategory={(crossCategoryArticles ?? []).map(a => ({
    ...a,
    slug: a.slug ?? null,
    category: a.category ?? null,
    published_at: a.published_at ?? null,
  }))}
/>
```

- [ ] **Step 7: 跑全部測試確認無回歸**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add src/components/public/ExtendedReading.tsx src/__tests__/components/ExtendedReading.test.tsx src/app/\(public\)/news/\[slug\]/page.tsx
git commit -m "feat(seo): add ExtendedReading component to article pages"
```

---

## Task 7: 首頁快訊區塊

**Files:**
- Create: `src/components/public/QuickNews.tsx`
- Create: `src/__tests__/components/QuickNews.test.tsx`
- Modify: `src/app/(public)/page.tsx`

- [ ] **Step 1: 寫測試**

```typescript
// src/__tests__/components/QuickNews.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickNews } from "@/components/public/QuickNews";

const mockNews = [
  { id: "1", title: "LeBron James 生涯新高 50 分", slug: "lebron-50pts", published_at: "2026-03-21T10:00:00Z" },
  { id: "2", title: "大谷翔平開幕戰先發", slug: "ohtani-opening", published_at: "2026-03-21T09:00:00Z" },
  { id: "3", title: "曼城 3-1 擊敗利物浦", slug: "mancity-liverpool", published_at: "2026-03-21T08:00:00Z" },
];

describe("QuickNews", () => {
  it("renders all news titles", () => {
    render(<QuickNews articles={mockNews} />);
    expect(screen.getByText("快訊")).toBeInTheDocument();
    expect(screen.getByText("LeBron James 生涯新高 50 分")).toBeInTheDocument();
    expect(screen.getByText("大谷翔平開幕戰先發")).toBeInTheDocument();
    expect(screen.getByText("曼城 3-1 擊敗利物浦")).toBeInTheDocument();
  });

  it("renders nothing when articles is empty", () => {
    const { container } = render(<QuickNews articles={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders article links with correct href", () => {
    render(<QuickNews articles={mockNews} />);
    const link = screen.getByText("LeBron James 生涯新高 50 分").closest("a");
    expect(link).toHaveAttribute("href", "/news/lebron-50pts");
  });

  it("falls back to id when slug is null", () => {
    render(<QuickNews articles={[{ id: "99", title: "No Slug", slug: null, published_at: null }]} />);
    const link = screen.getByText("No Slug").closest("a");
    expect(link).toHaveAttribute("href", "/news/99");
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/__tests__/components/QuickNews.test.tsx`
Expected: FAIL

- [ ] **Step 3: 實作 QuickNews 元件**

```tsx
// src/components/public/QuickNews.tsx
import Link from "next/link";
import { Zap } from "lucide-react";
import { newsUrl } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/constants";

interface QuickNewsArticle {
  id: string;
  title: string;
  slug: string | null;
  published_at: string | null;
}

interface QuickNewsProps {
  articles: QuickNewsArticle[];
}

export function QuickNews({ articles }: QuickNewsProps) {
  if (articles.length === 0) return null;

  return (
    <section className="my-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
        <Zap className="w-5 h-5 text-amber-500" />
        快訊
      </h2>
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={newsUrl(article.slug || article.id)}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors group"
          >
            <span className="text-sm text-foreground line-clamp-1 group-hover:text-blue-600 transition-colors flex-1 mr-3">
              {article.title}
            </span>
            <time className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(article.published_at)}
            </time>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

注意：不需要 `"use client"`，同 ExtendedReading 理由。

- [ ] **Step 4: 跑測試確認通過**

Run: `npx vitest run src/__tests__/components/QuickNews.test.tsx`
Expected: PASS

- [ ] **Step 5: 整合到首頁**

修改 `src/app/(public)/page.tsx`：

在 HeroSection 和主容區之間插入 QuickNews。首頁從 DB 查詢 33 篇文章，重新分配：
- hero: `articles[0]`
- subHeroes: `articles[1:3]`
- quickNews: `articles[3:13]`（10 篇）
- grid: `articles[13:]`（剩餘）

```tsx
import { QuickNews } from "@/components/public/QuickNews";

// 在 <HeroSection> 後面、主容區前面
<QuickNews
  articles={articles.slice(3, 13).map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    published_at: a.published_at,
  }))}
/>
```

同時修改 `HomeArticleSection` 的 articles 來源為 `articles.slice(13)` 以避免重複。

- [ ] **Step 6: 跑全部測試確認無回歸**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/components/public/QuickNews.tsx src/__tests__/components/QuickNews.test.tsx src/app/\(public\)/page.tsx
git commit -m "feat(homepage): add QuickNews section for content density"
```

---

## Task 8: 骨架屏載入態

**Files:**
- Create: `src/components/public/ArticleCardSkeleton.tsx`
- Create: `src/__tests__/components/ArticleCardSkeleton.test.tsx`

- [ ] **Step 1: 寫測試**

```typescript
// src/__tests__/components/ArticleCardSkeleton.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ArticleCardSkeleton, ArticleCardSkeletonGrid, QuickNewsSkeleton } from "@/components/public/ArticleCardSkeleton";

describe("ArticleCardSkeleton", () => {
  it("renders skeleton structure", () => {
    const { container } = render(<ArticleCardSkeleton />);
    expect(container.querySelector(".rounded-lg")).toBeInTheDocument();
  });
});

describe("ArticleCardSkeletonGrid", () => {
  it("renders specified number of skeletons", () => {
    const { container } = render(<ArticleCardSkeletonGrid count={3} />);
    const skeletons = container.querySelectorAll(".rounded-lg.border");
    expect(skeletons.length).toBe(3);
  });

  it("defaults to 6 skeletons", () => {
    const { container } = render(<ArticleCardSkeletonGrid />);
    const skeletons = container.querySelectorAll(".rounded-lg.border");
    expect(skeletons.length).toBe(6);
  });
});

describe("QuickNewsSkeleton", () => {
  it("renders specified number of rows", () => {
    const { container } = render(<QuickNewsSkeleton count={5} />);
    const rows = container.querySelectorAll(".flex.items-center");
    expect(rows.length).toBe(5);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/__tests__/components/ArticleCardSkeleton.test.tsx`
Expected: FAIL

- [ ] **Step 3: 確認 shadcn/ui Skeleton 元件存在**

Run: `ls src/components/ui/skeleton.tsx 2>/dev/null && echo "EXISTS" || echo "MISSING"`

如果 MISSING：
Run: `npx shadcn@latest add skeleton`

- [ ] **Step 4: 實作骨架屏元件**

```tsx
// src/components/public/ArticleCardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export function ArticleCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="w-full h-40" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ArticleCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function QuickNewsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-2.5">
          <Skeleton className="h-4 flex-1 mr-3" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: 跑測試確認通過**

Run: `npx vitest run src/__tests__/components/ArticleCardSkeleton.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/public/ArticleCardSkeleton.tsx src/__tests__/components/ArticleCardSkeleton.test.tsx
git commit -m "feat(ui): add article card and quick news skeleton components"
```

---

## Task 9: 最終驗證與 QA

- [ ] **Step 1: 跑全部測試**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Build 確認**

Run: `npx next build 2>&1 | tail -20`
Expected: Build successful，無 error

- [ ] **Step 3: 跑 QA 腳本**

Run: `./scripts/qa.sh`
Expected: 通過所有檢查

- [ ] **Step 4: 本地手動驗證**

啟動 dev server 後確認：
- `http://localhost:3000/robots.txt` — 包含 GPTBot、ClaudeBot 規則
- `http://localhost:3000/llms.txt` — 內容完整
- `http://localhost:3000/sitemap.xml` — 包含 team 頁面（60 筆球隊）
- `http://localhost:3000/team/nba/lakers` — permanent redirect 到 `/team/nba/{id}`
- `http://localhost:3000` — 快訊區塊出現在 Hero 下方
- 任意文章頁 — 底部有「延伸閱讀」區塊（同分類 + 跨分類）

---

## 注意事項

1. **Live Ticker 條件顯示已實作**：`LiveScoreTicker.tsx` 已在 `games.length === 0` 時 `return null`，無需修改。
2. **NewsArticle schema 已完成**：`news/[slug]/page.tsx` 已使用 `"@type": "NewsArticle"`。
3. **ESPN Team ID 必須從 API 驗證**：Task 3 Step 1 的 API 呼叫結果必須用於建立映射表，不可硬猜 ID。
4. **文章分配調整**：Task 7 將首頁文章分配改為 hero(1) + subHeroes(2) + quickNews(10) + grid(20)，需確認 `HomeArticleSection` 接收的文章數量不影響版面。
5. **Deferred items**（將獨立開 issue 在後續迭代實作）：
   - 文章內文自動連結（spec 2.1 bullet 3）— 需要 react-markdown custom renderer + 名稱消歧義
   - 分類頁側邊欄「本週熱門」「同隊新聞」（spec 2.1 bullet 2）— 需要分類頁佈局改動
   - Player/Game 頁面加入 sitemap（spec 2.3）— 需要從 DB/API 動態取得大量 ID
   - E2E 測試更新（CLAUDE.md 要求「新增/修改頁面 → 更新 E2E 測試」）— 建議在所有 Phase 1 功能上線後統一補寫 E2E 覆蓋
6. **`SPORT_KEY_LABELS` key 不匹配**：既有 constants 使用 `basketball`/`baseball` 作 key，但 URL 用 `nba`/`mlb`。這是既有問題，不在此 plan 修正，但實作時注意 `sport.toUpperCase()` fallback 行為。
