/**
 * Authentication flow E2E tests
 * Tests login behaviour without relying on stored auth state.
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Wrong credentials
// ---------------------------------------------------------------------------
test("錯誤帳密顯示錯誤訊息", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("後台登入")).toBeVisible();

  await page.getByLabel("帳號").fill("wrong_user");
  await page.getByLabel("密碼").fill("wrong_password");

  await page.getByRole("button", { name: "登入" }).click();

  // Error message in Traditional Chinese
  await expect(page.getByText("帳號或密碼錯誤")).toBeVisible({ timeout: 10_000 });

  // Should still be on login page
  expect(page.url()).toContain("/login");
});

// ---------------------------------------------------------------------------
// Enter-to-submit
// ---------------------------------------------------------------------------
test("按下 Enter 即可送出表單", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("帳號").fill("wrong_user");
  await page.getByLabel("密碼").fill("wrong_password");

  // Press Enter on the password field — should trigger form submit
  await page.getByLabel("密碼").press("Enter");

  // Either error message (wrong creds) or redirect to /admin (correct creds)
  // For this test we expect the error path since we used bad credentials
  await expect(page.getByText("帳號或密碼錯誤")).toBeVisible({ timeout: 10_000 });
});

// ---------------------------------------------------------------------------
// Protected route redirect
// ---------------------------------------------------------------------------
test("未登入存取 /admin 會重導向至 /login", async ({ page }) => {
  await page.goto("/admin");

  // Should end up on the login page
  await page.waitForURL(/\/login/, { timeout: 10_000 });
  await expect(page.getByText("後台登入")).toBeVisible();
});
