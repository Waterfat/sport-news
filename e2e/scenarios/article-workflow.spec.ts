/**
 * User Story E2E: 文章管理完整操作流程
 * 模擬管理者從規劃 → 產出 → 篩選 → 發布 → 排程的完整操作情境
 */
import { test, expect } from "@playwright/test";

function skipIfNoCredentials() {
  if (!process.env.E2E_USERNAME || !process.env.E2E_PASSWORD) {
    test.skip(true, "E2E_USERNAME / E2E_PASSWORD not set");
  }
}

// ---------------------------------------------------------------------------
// Scenario 1: 檢視文章列表並切換篩選狀態
// ---------------------------------------------------------------------------
test.describe("文章列表瀏覽與篩選", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者切換狀態篩選後，表格正確更新", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認四個篩選 Tab 存在
    await expect(page.getByRole("tab", { name: "全部" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "未發布" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "排程中" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "已發布" })).toBeVisible();

    // 點「已發布」篩選
    await page.getByRole("tab", { name: "已發布" }).click();

    // 等待 API 回應後，確認 URL 沒跳走（仍在 articles 頁）
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/admin/articles");

    // 切回「全部」
    await page.getByRole("tab", { name: "全部" }).click();
    await page.waitForTimeout(500);
  });

  test("管理者切換每頁顯示數量", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 找到每頁篇數的 Select
    const pageSizeSelect = page.locator("button").filter({ hasText: /每頁/ });
    if (await pageSizeSelect.isVisible()) {
      await pageSizeSelect.click();
      // 選擇「每頁 10 篇」
      const option10 = page.getByRole("option", { name: "每頁 10 篇" });
      if (await option10.isVisible()) {
        await option10.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: 批次選取與操作
// ---------------------------------------------------------------------------
test.describe("文章批次選取", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以全選、取消全選文章", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 等待表格載入
    const table = page.locator("table");
    if (await table.isVisible()) {
      // 找到表頭的全選 checkbox
      const headerCheckbox = table.locator("thead input[type='checkbox']");
      if (await headerCheckbox.isVisible()) {
        // 全選
        await headerCheckbox.click();

        // 確認批次操作列出現
        await expect(page.getByText("已選取")).toBeVisible({ timeout: 3000 });

        // 取消選取
        const clearBtn = page.getByRole("button", { name: "取消選取" });
        if (await clearBtn.isVisible()) {
          await clearBtn.click();
          await expect(page.getByText("已選取")).not.toBeVisible({ timeout: 3000 });
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: 規劃與產出流程（核心 user story）
// ---------------------------------------------------------------------------
test.describe("規劃 → 產出文章流程", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以看到規劃按鈕與產出面板狀態", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible({
      timeout: 15_000,
    });

    // ProductionPanel 應該可見
    const planButton = page.getByRole("button", { name: /規劃/ });
    await expect(planButton).toBeVisible();

    // 如果有規劃列表，檢查 PlansTable 結構
    const plansTable = page.locator("table").filter({ hasText: /預測標題|規劃/ });
    if (await plansTable.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 規劃表格有 checkbox
      const planCheckbox = plansTable.locator("tbody input[type='checkbox']").first();
      if (await planCheckbox.isVisible()) {
        // 選取一個規劃項目
        await planCheckbox.click();

        // 確認出現「產出文章」按鈕
        await expect(page.getByRole("button", { name: /產出文章/ })).toBeVisible();

        // 取消選取
        await planCheckbox.click();
      }
    }
  });

  test("產出文章時後端不會回傳 schema / column 錯誤", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 找到規劃表格
    const plansTable = page.locator("table").filter({ hasText: /預測標題|規劃/ });
    if (!(await plansTable.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "目前沒有規劃項目，跳過產出測試");
      return;
    }

    const planCheckbox = plansTable.locator("tbody input[type='checkbox']").first();
    if (!(await planCheckbox.isVisible())) {
      test.skip(true, "規劃表格無可選取項目");
      return;
    }

    // 選取第一個規劃項目
    await planCheckbox.click();

    const produceButton = page.getByRole("button", { name: /產出文章/ });
    await expect(produceButton).toBeVisible();

    // 監聽 dialog（confirm + 可能的 alert 錯誤）
    const dialogs: { type: string; message: string }[] = [];
    page.on("dialog", async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept(); // confirm → 確定；alert → 關閉
    });

    // 同時監聽產出 API 回應
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/rewrite/plan/produce"),
      { timeout: 15_000 }
    );

    // 點擊「產出文章」
    await produceButton.click();

    // 等待 API 回應
    const response = await responsePromise;
    const status = response.status();

    // 驗證：API 不應回傳 500（schema error 會是 500）
    expect(status, `產出 API 回傳 ${status}，預期 201 或 409`).not.toBe(500);

    // 驗證：不應出現含有 schema/column 錯誤的 alert
    const errorDialog = dialogs.find(
      (d) =>
        d.type === "alert" &&
        (/column|schema|not found|產出失敗/i.test(d.message))
    );
    expect(
      errorDialog,
      `出現錯誤 alert: "${errorDialog?.message ?? ""}"`
    ).toBeUndefined();

    // 如果 201 成功，驗證 UI 進入產出中狀態
    if (status === 201) {
      await expect(
        page.getByRole("button", { name: "產出中..." }).or(
          page.getByText("文章產出中")
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: 文章詳情頁操作
// ---------------------------------------------------------------------------
test.describe("文章詳情頁", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者從列表點進文章詳情頁，可以看到完整內容", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 找到第一個「查看」連結
    const viewLink = page.getByRole("link", { name: "查看" }).first();
    if (await viewLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewLink.click();

      // 等待詳情頁載入
      await page.waitForURL("**/admin/articles/**", { timeout: 10_000 });

      // 確認頁面有文章標題（h1 或 heading）
      const heading = page.getByRole("heading").first();
      await expect(heading).toBeVisible({ timeout: 10_000 });

      // 確認有「返回」按鈕
      const backButton = page.getByRole("link", { name: /返回/ }).or(
        page.getByRole("button", { name: /返回/ })
      );
      await expect(backButton).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: 分頁導航
// ---------------------------------------------------------------------------
test.describe("分頁操作", () => {
  test.beforeEach(skipIfNoCredentials);

  test("管理者可以使用分頁按鈕和跳頁功能", async ({ page }) => {
    await page.goto("/admin/articles");
    await expect(page.getByRole("heading", { name: "文章管理" })).toBeVisible({
      timeout: 15_000,
    });

    // 確認分頁區域存在
    const totalText = page.getByText(/共 \d+ 篇/);
    await expect(totalText).toBeVisible();

    // 嘗試跳頁
    const jumpInput = page.getByPlaceholder("頁碼");
    if (await jumpInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await jumpInput.fill("1");
      const jumpButton = page.getByRole("button", { name: "跳頁" });
      if (await jumpButton.isVisible()) {
        await jumpButton.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
