/**
 * Public pages E2E tests
 * Tests pages that are accessible without authentication.
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------
test.describe("首頁", () => {
  test("載入成功並顯示導覽列與文章", async ({ page }) => {
    await page.goto("/");

    // Site branding in header
    await expect(page.getByRole("link", { name: /小豪哥體育資訊網/i }).first()).toBeVisible();

    // Navigation links
    const nav = page.locator("header nav").first();
    await expect(nav.getByRole("link", { name: "首頁" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "NBA" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "足球" })).toBeVisible();

    // Main content area renders (either articles or empty state)
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // "最新報導" section heading is present
    await expect(page.getByRole("heading", { name: "最新報導" })).toBeVisible();
  });

  test("Footer 存在", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("footer").getByText("小豪哥體育資訊網")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------
test.describe("登入頁", () => {
  test("載入成功並顯示表單欄位", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("後台登入")).toBeVisible();

    // Username field
    const usernameInput = page.getByLabel("帳號");
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveAttribute("placeholder", "請輸入帳號");

    // Password field
    const passwordInput = page.getByLabel("密碼");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveAttribute("placeholder", "請輸入密碼");

    // Submit button
    await expect(page.getByRole("button", { name: "登入" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// News article page
// ---------------------------------------------------------------------------
test.describe("文章頁", () => {
  test("從公開 API 取得真實 slug 後載入文章頁", async ({ page, request }) => {
    // Fetch a real article slug from the public API
    const resp = await request.get("/api/public/articles?limit=1");
    expect(resp.ok()).toBeTruthy();

    const json = await resp.json();
    const article = json.articles?.[0] ?? json[0];

    if (!article) {
      test.skip(true, "No published articles available — skipping article page test");
      return;
    }

    const slug = article.slug || article.id;
    await page.goto(`/news/${slug}`);

    // Page renders — title is present (h1 or article heading)
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Verify the heading has text (non-empty)
    const headingText = await heading.textContent();
    expect(headingText?.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Scores page (即時比分)
// ---------------------------------------------------------------------------
test.describe("即時比分頁", () => {
  test("Leagues API 回傳正確格式", async ({ request }) => {
    const resp = await request.get("/api/public/scoreboard/leagues");
    expect(resp.ok()).toBeTruthy();
    const json = await resp.json();
    expect(json).toHaveProperty("leagues");
    expect(Array.isArray(json.leagues)).toBeTruthy();
    if (json.leagues.length > 0) {
      expect(json.leagues[0]).toHaveProperty("key");
      expect(json.leagues[0]).toHaveProperty("label");
    }
  });

  test("Scoreboard API 回傳比分資料", async ({ request }) => {
    // First get available leagues
    const leaguesResp = await request.get("/api/public/scoreboard/leagues");
    const leaguesJson = await leaguesResp.json();
    if (leaguesJson.leagues.length === 0) {
      test.skip(true, "No enabled leagues — skipping scoreboard API test");
      return;
    }
    const firstLeague = leaguesJson.leagues[0].key;

    const resp = await request.get(`/api/public/scoreboard?league=${firstLeague}`);
    expect(resp.ok()).toBeTruthy();
    const json = await resp.json();
    expect(json).toHaveProperty("league", firstLeague);
    expect(json).toHaveProperty("label");
    expect(json).toHaveProperty("games");
    expect(Array.isArray(json.games)).toBeTruthy();
  });

  test("頁面載入並顯示即時比分標題或空狀態", async ({ page }) => {
    await page.goto("/scores");

    // Should show either the heading or the "coming soon" state
    const heading = page.getByRole("heading", { name: "即時比分" });
    const comingSoon = page.getByText("即時比分功能即將上線");
    const either = heading.or(comingSoon);
    await expect(either.first()).toBeVisible({ timeout: 15_000 });
  });

  test("導覽列包含即時比分連結", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("header nav").first();
    await expect(nav.getByRole("link", { name: "即時比分" })).toBeVisible();
  });

  test("Scoreboard API 不接受無效聯賽", async ({ request }) => {
    const resp = await request.get("/api/public/scoreboard?league=invalid_xxx");
    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(404);
  });

  test("Scoreboard API 缺少 league 參數回傳 400", async ({ request }) => {
    const resp = await request.get("/api/public/scoreboard");
    expect(resp.ok()).toBeFalsy();
    expect(resp.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// SEO / crawler files
// ---------------------------------------------------------------------------
test.describe("SEO 檔案", () => {
  test("robots.txt 可存取", async ({ request }) => {
    const resp = await request.get("/robots.txt");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.text();
    expect(body.toLowerCase()).toContain("user-agent");
  });

  test("sitemap.xml 可存取", async ({ request }) => {
    const resp = await request.get("/sitemap.xml");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.text();
    // sitemap should be XML
    expect(body).toContain("<?xml");
  });
});
