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
    await expect(page.getByRole("link", { name: /SportNews/i }).first()).toBeVisible();

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
    await expect(page.locator("footer").getByText("SportNews")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------
test.describe("登入頁", () => {
  test("載入成功並顯示表單欄位", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("SportNews 後台登入")).toBeVisible();

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
