/**
 * Game Detail E2E tests
 * 測試比賽詳情頁的 tab 切換、球隊連結、專家預測百分比、URL 狀態保持
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Game Detail Page
// ---------------------------------------------------------------------------
test.describe("比賽詳情頁", () => {
  test("從 Scoreboard API 取得 eventId 後載入頁面", async ({
    page,
    request,
  }) => {
    const resp = await request.get("/api/public/scoreboard?league=nba");
    if (!resp.ok()) {
      test.skip(true, "Scoreboard API unavailable");
      return;
    }
    const json = await resp.json();
    const game = json.games?.[0];
    if (!game) {
      test.skip(true, "No NBA games available");
      return;
    }

    await page.goto(`/game/nba/${game.id}`);

    // 頁面載入成功 — 應有返回比分連結
    await expect(
      page.getByRole("link", { name: /返回比分/ })
    ).toBeVisible({ timeout: 15_000 });

    // 應顯示 Tab 列
    await expect(page.getByRole("tab", { name: "摘要" })).toBeVisible();
  });

  test("Tab 切換會更新 URL query parameter", async ({ page, request }) => {
    const resp = await request.get("/api/public/scoreboard?league=nba");
    const json = await resp.json();
    const game = json.games?.[0];
    if (!game) {
      test.skip(true, "No NBA games available");
      return;
    }

    await page.goto(`/game/nba/${game.id}`);
    await expect(page.getByRole("tab", { name: "摘要" })).toBeVisible({
      timeout: 15_000,
    });

    // 點擊「賠率」tab
    await page.getByRole("tab", { name: "賠率" }).click();
    await expect(page).toHaveURL(/[?&]tab=odds/);

    // 點擊「傷兵」tab
    await page.getByRole("tab", { name: "傷兵" }).click();
    await expect(page).toHaveURL(/[?&]tab=injuries/);
  });

  test("切 tab → 離開 → 返回 → tab 狀態保持", async ({ page, request }) => {
    const resp = await request.get("/api/public/scoreboard?league=nba");
    const json = await resp.json();
    const game = json.games?.[0];
    if (!game) {
      test.skip(true, "No NBA games available");
      return;
    }

    // 進入 game detail 並切到賠率 tab
    await page.goto(`/game/nba/${game.id}`);
    await expect(page.getByRole("tab", { name: "摘要" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("tab", { name: "賠率" }).click();
    await expect(page).toHaveURL(/[?&]tab=odds/);

    // 離開到首頁
    await page.goto("/scores");
    await expect(
      page.getByRole("heading", { name: "即時比分" }).or(
        page.getByText("即時比分功能即將上線")
      )
    ).toBeVisible({ timeout: 15_000 });

    // 返回（使用瀏覽器 back）
    await page.goBack();

    // URL 應仍有 tab=odds
    await expect(page).toHaveURL(/[?&]tab=odds/);
    // 賠率 tab 應為 active
    const oddsTab = page.getByRole("tab", { name: "賠率" });
    await expect(oddsTab).toBeVisible({ timeout: 15_000 });
    await expect(oddsTab).toHaveAttribute("data-state", "active");
  });

  test("球隊連結使用數字 ID 而非 abbreviation", async ({
    page,
    request,
  }) => {
    const resp = await request.get("/api/public/scoreboard?league=nba");
    const json = await resp.json();
    const game = json.games?.[0];
    if (!game) {
      test.skip(true, "No NBA games available");
      return;
    }

    await page.goto(`/game/nba/${game.id}`);
    await expect(
      page.getByRole("link", { name: /返回比分/ })
    ).toBeVisible({ timeout: 15_000 });

    // 找到球隊連結（header 中有 2 個球隊連結）
    const teamLinks = page.locator(
      'a[href^="/team/nba/"]'
    );
    const count = await teamLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // 驗證連結 href 使用數字 ID（非 3 字母 abbreviation）
    for (let i = 0; i < Math.min(count, 2); i++) {
      const href = await teamLinks.nth(i).getAttribute("href");
      expect(href).toBeTruthy();
      const idPart = href!.split("/").pop();
      // ESPN team IDs are numeric
      expect(idPart).toMatch(/^\d+$/);
    }
  });

  test("點擊球隊連結可成功載入球隊頁", async ({ page, request }) => {
    const resp = await request.get("/api/public/scoreboard?league=nba");
    const json = await resp.json();
    const game = json.games?.[0];
    if (!game) {
      test.skip(true, "No NBA games available");
      return;
    }

    await page.goto(`/game/nba/${game.id}`);
    await expect(
      page.getByRole("link", { name: /返回比分/ })
    ).toBeVisible({ timeout: 15_000 });

    // 記錄 dialog 錯誤
    const dialogMessages: string[] = [];
    page.on("dialog", async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.dismiss();
    });

    // 點擊第一個球隊連結
    const teamLink = page.locator('a[href^="/team/nba/"]').first();
    await teamLink.click();

    // 等待球隊頁載入 — 應出現球員名單相關文字
    await expect(
      page.getByText("球員名單", { exact: true }).or(page.getByText("近期賽程", { exact: true }))
    ).toBeVisible({ timeout: 15_000 });

    // 不應有 alert 錯誤
    expect(dialogMessages).toHaveLength(0);
  });

  test("專家預測百分比不超過 100%", async ({ page, request }) => {
    const resp = await request.get("/api/public/scoreboard?league=nba");
    const json = await resp.json();
    const games = json.games ?? [];

    // 找一場已結束或進行中的比賽（較可能有 pick center 資料）
    const game =
      games.find(
        (g: { status: string }) =>
          g.status === "final" || g.status === "in_progress"
      ) ?? games[0];

    if (!game) {
      test.skip(true, "No NBA games available");
      return;
    }

    await page.goto(`/game/nba/${game.id}`);
    await expect(page.getByRole("tab", { name: "摘要" })).toBeVisible({
      timeout: 15_000,
    });

    // 等待摘要 tab 內容載入
    await page.waitForTimeout(2000);

    // 檢查所有 pick center 百分比文字
    const pctTexts = await page
      .locator("text=/\\d+%/")
      .allTextContents();

    for (const text of pctTexts) {
      const match = text.match(/(\d+)%/);
      if (match) {
        const pct = parseInt(match[1]);
        expect(pct).toBeLessThanOrEqual(100);
      }
    }
  });

  test("賠率術語包含中文註解", async ({ page, request }) => {
    const resp = await request.get("/api/public/scoreboard?league=nba");
    const json = await resp.json();
    const game = json.games?.[0];
    if (!game) {
      test.skip(true, "No NBA games available");
      return;
    }

    await page.goto(`/game/nba/${game.id}`);
    await expect(page.getByRole("tab", { name: "摘要" })).toBeVisible({
      timeout: 15_000,
    });

    // 如果有賠率區塊，應該包含中文註解
    const spreadLabel = page.getByText("Spread (讓分)");
    const ouLabel = page.getByText("O/U (大小分)");

    // 只有當頁面有賠率資料時才驗證
    const hasOdds = await page.getByText("賽前賠率").isVisible().catch(() => false);
    if (hasOdds) {
      await expect(spreadLabel.first()).toBeVisible();
      await expect(ouLabel.first()).toBeVisible();
    }
  });
});
