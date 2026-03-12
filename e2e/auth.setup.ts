/**
 * Auth Setup — runs before admin tests.
 * Logs in with E2E_USERNAME / E2E_PASSWORD and saves session state to
 * e2e/.auth/user.json so admin tests can reuse the authenticated session.
 *
 * If credentials are not provided the setup is skipped and admin tests
 * will be skipped as a consequence (they depend on this project).
 */
import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("authenticate", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    console.log(
      "Skipping auth setup — E2E_USERNAME / E2E_PASSWORD not set. Admin tests will be skipped."
    );
    // Write an empty state file so dependent tests don't crash on missing file
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  await page.goto("/login");
  await expect(page.getByText("SportNews 後台登入")).toBeVisible();

  await page.getByLabel("帳號").fill(username);
  await page.getByLabel("密碼").fill(password);

  // Submit via form (Enter key), matching UX convention
  await page.getByLabel("密碼").press("Enter");

  // Wait for redirect to /admin
  await page.waitForURL("**/admin", { timeout: 15_000 });
  await expect(page.getByText("儀表板")).toBeVisible();

  // Persist session to file
  await page.context().storageState({ path: AUTH_FILE });
});
