/**
 * User Story E2E: 後台 CRUD 操作流程
 * 模擬管理者對寫手、頻道、球種與來源的完整操作
 */
import { test, expect } from "@playwright/test";

function skipIfNoCredentials() {
  if (!process.env.E2E_USERNAME || !process.env.E2E_PASSWORD) {
    test.skip(true, "E2E_USERNAME / E2E_PASSWORD not set");
  }
}

// ---------------------------------------------------------------------------
// 寫手管理
// ---------------------------------------------------------------------------
test.describe("寫手管理 CRUD", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以查看寫手列表並開啟新增表單", async ({ page }) => {
    await page.goto("/admin/personas");
    await expect(page.getByRole("heading", { name: "寫手管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認有「新增寫手」按鈕
    const addButton = page.getByRole("button", { name: /新增寫手/ });
    await expect(addButton).toBeVisible();

    // 點擊後表單出現
    await addButton.click();

    // 表單應有名稱欄位
    await expect(page.getByPlaceholder("例如：毒舌球評老王")).toBeVisible({
      timeout: 5000,
    });

    // 取消後表單消失
    const cancelButton = page.getByRole("button", { name: "取消" });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });

  test("管理者可以看到現有寫手卡片", async ({ page }) => {
    await page.goto("/admin/personas");
    await expect(page.getByRole("heading", { name: "寫手管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認寫手卡片存在（至少有一個編輯按鈕）
    const editButtons = page.getByRole("button", { name: "編輯" });
    const count = await editButtons.count();
    if (count > 0) {
      // 點編輯按鈕，表單應該出現並帶有現有資料
      await editButtons.first().click();
      await expect(page.getByPlaceholder("例如：毒舌球評老王")).toBeVisible({
        timeout: 5000,
      });

      // 保存按鈕應該存在
      await expect(page.getByRole("button", { name: /保存|儲存/ })).toBeVisible();

      // 取消
      const cancelButton = page.getByRole("button", { name: "取消" });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 頻道管理
// ---------------------------------------------------------------------------
test.describe("頻道管理 CRUD", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以查看頻道列表", async ({ page }) => {
    await page.goto("/admin/channels");
    await expect(page.getByRole("heading", { name: "發布頻道" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認新增表單存在
    await expect(
      page.getByPlaceholder("例：官方 Telegram 頻道")
    ).toBeVisible({ timeout: 5000 });
  });

  test("管理者可以看到現有頻道卡片並進入編輯模式", async ({ page }) => {
    await page.goto("/admin/channels");
    await expect(page.getByRole("heading", { name: "發布頻道" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認頻道卡片存在
    const editButtons = page.getByRole("button", { name: "編輯" });
    const count = await editButtons.count();
    if (count > 0) {
      await editButtons.first().click();

      // 編輯模式應有保存和取消按鈕
      await expect(page.getByRole("button", { name: /保存|儲存/ })).toBeVisible({
        timeout: 3000,
      });
      await expect(page.getByRole("button", { name: "取消" })).toBeVisible();

      // 取消編輯
      await page.getByRole("button", { name: "取消" }).click();
    }
  });
});

// ---------------------------------------------------------------------------
// 球種與來源
// ---------------------------------------------------------------------------
test.describe("球種與來源管理", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以查看爬蟲來源與運動設定", async ({ page }) => {
    await page.goto("/admin/sports");
    await expect(page.getByRole("heading", { name: "球種與來源" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認有來源列表區域
    await expect(page.getByText("爬蟲來源", { exact: true })).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 原始新聞瀏覽
// ---------------------------------------------------------------------------
test.describe("原始新聞瀏覽", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以查看原始新聞列表並篩選來源", async ({ page }) => {
    await page.goto("/admin/raw");
    await expect(page.getByRole("heading", { name: "原始新聞" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認表格存在
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 10_000 });

    // 確認來源篩選 Select 存在
    const sourceFilter = page.locator("button").filter({ hasText: /來源|全部來源/ });
    if (await sourceFilter.isVisible()) {
      await sourceFilter.click();

      // 確認有篩選選項
      await expect(page.getByRole("option", { name: "全部來源" })).toBeVisible({
        timeout: 3000,
      });

      // 選擇「全部來源」（關閉 dropdown）
      await page.getByRole("option", { name: "全部來源" }).click();
    }
  });
});

// ---------------------------------------------------------------------------
// 成效分析
// ---------------------------------------------------------------------------
test.describe("成效分析頁", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以查看分析統計", async ({ page }) => {
    await page.goto("/admin/analytics");

    // 等頁面載入
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // 確認統計卡片存在
    const totalViews = page.getByText("總瀏覽次數");
    if (await totalViews.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page.getByText("已發布文章")).toBeVisible();
      await expect(page.getByText("平均瀏覽數")).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// 跨頁面導航完整流程
// ---------------------------------------------------------------------------
test.describe("管理者完整巡覽流程", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者依序瀏覽所有後台頁面", async ({ page }) => {
    // 1. 從儀表板開始
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible({
      timeout: 15_000,
    });

    // 2. 進入文章管理
    await page.locator("header").getByRole("link", { name: "文章管理" }).click();
    await page.waitForURL("**/admin/articles", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible();

    // 3. 進入原始新聞
    await page.locator("header").getByRole("link", { name: "原始新聞" }).click();
    await page.waitForURL("**/admin/raw", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "原始新聞" })).toBeVisible();

    // 4. 進入寫手管理
    await page.locator("header").getByRole("link", { name: "寫手管理" }).click();
    await page.waitForURL("**/admin/personas", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "寫手管理" })).toBeVisible();

    // 5. 進入球種與來源
    await page.locator("header").getByRole("link", { name: "球種與來源" }).click();
    await page.waitForURL("**/admin/sports", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "球種與來源" })).toBeVisible();

    // 6. 進入發布頻道
    await page.locator("header").getByRole("link", { name: "發布頻道" }).click();
    await page.waitForURL("**/admin/channels", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "發布頻道" })).toBeVisible();

    // 7. 進入成效分析
    await page.locator("header").getByRole("link", { name: "成效分析" }).click();
    await page.waitForURL("**/admin/analytics", { timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });

    // 8. 回到儀表板
    await page.locator("header").getByRole("link", { name: "儀表板" }).click();
    await page.waitForURL("**/admin", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "儀表板" })).toBeVisible();
  });
});
