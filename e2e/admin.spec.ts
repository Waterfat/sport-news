/**
 * Admin pages E2E tests
 * Requires authenticated session (set up by auth.setup.ts).
 * Requires E2E_USERNAME and E2E_PASSWORD env vars.
 * If credentials were not provided during setup, these tests are skipped.
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helper — skip if credentials were not provided
// ---------------------------------------------------------------------------
function skipIfNoCredentials() {
  if (!process.env.E2E_USERNAME || !process.env.E2E_PASSWORD) {
    test.skip(true, "E2E_USERNAME / E2E_PASSWORD not set — skipping admin tests");
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
test.describe("儀表板", () => {
  test.beforeEach(skipIfNoCredentials);

  test("載入成功並顯示統計卡片與中文標籤", async ({ page }) => {
    await page.goto("/admin");

    // Page heading
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible({
      timeout: 15_000,
    });

    // Stats card labels (Chinese text, not raw field names)
    await expect(page.getByText("原始新聞總數")).toBeVisible();
    await expect(page.getByText("今日爬取")).toBeVisible();
    await expect(page.getByText("今日產出")).toBeVisible();
    await expect(page.getByText("已發布")).toBeVisible();
    await expect(page.getByText("總瀏覽數")).toBeVisible();
  });

  test("顯示寫手陣容與發布頻道區塊", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText("寫手陣容")).toBeVisible();
    await expect(page.locator("main").getByText("發布頻道")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Navigation bar
// ---------------------------------------------------------------------------
test.describe("後台導覽列", () => {
  test.beforeEach(skipIfNoCredentials);

  test("顯示所有導覽項目", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible({
      timeout: 15_000,
    });

    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "儀表板" })).toBeVisible();
    await expect(header.getByRole("link", { name: "文章管理" })).toBeVisible();
    await expect(header.getByRole("link", { name: "原始新聞" })).toBeVisible();
    await expect(header.getByRole("link", { name: "寫手管理" })).toBeVisible();
    await expect(header.getByRole("link", { name: "球種與來源" })).toBeVisible();
    await expect(header.getByRole("link", { name: "發布頻道" })).toBeVisible();
    await expect(header.getByRole("link", { name: "成效分析" })).toBeVisible();

    // Logout button
    await expect(header.getByRole("button", { name: "登出" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Articles page
// ---------------------------------------------------------------------------
test.describe("文章管理頁", () => {
  test.beforeEach(skipIfNoCredentials);

  test("載入成功並顯示內容", async ({ page }) => {
    await page.goto("/admin/articles");

    // Wait for main content — either a table or an empty state
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });

    // Verify we are on the right page (not redirected to login)
    expect(page.url()).toContain("/admin/articles");
  });
});

// ---------------------------------------------------------------------------
// Raw articles page
// ---------------------------------------------------------------------------
test.describe("原始新聞頁", () => {
  test.beforeEach(skipIfNoCredentials);

  test("載入成功", async ({ page }) => {
    await page.goto("/admin/raw");

    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
    expect(page.url()).toContain("/admin/raw");
  });
});

// ---------------------------------------------------------------------------
// Navigation between pages
// ---------------------------------------------------------------------------
test.describe("頁面切換", () => {
  test.beforeEach(skipIfNoCredentials);

  test("從儀表板點擊文章管理後成功切換頁面", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible({
      timeout: 15_000,
    });

    // Click navigation link
    await page.locator("header").getByRole("link", { name: "文章管理" }).click();

    await page.waitForURL("**/admin/articles", { timeout: 10_000 });
    expect(page.url()).toContain("/admin/articles");
    await expect(page.locator("main")).toBeVisible();
  });

  test("從文章管理點擊儀表板後回到儀表板", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });

    await page.locator("header").getByRole("link", { name: "儀表板" }).click();

    await page.waitForURL("**/admin", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible();
  });
});
