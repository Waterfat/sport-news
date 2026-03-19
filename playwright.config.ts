import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.BASE_URL ?? "https://howger-sport.com";
const ADMIN_BASE_URL =
  process.env.ADMIN_BASE_URL ??
  (BASE_URL.includes("localhost")
    ? BASE_URL
    : BASE_URL.replace("://", "://admin."));

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    locale: "zh-TW",
  },

  projects: [
    // Auth setup runs first, saves storage state for admin tests
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: ADMIN_BASE_URL },
    },

    // Public tests — no auth required
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Game detail tests — no auth required
    {
      name: "game-detail",
      testMatch: /game-detail\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Auth flow tests — no stored state (we're testing the flow itself)
    {
      name: "auth",
      testMatch: /auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Admin tests — depend on auth-setup
    {
      name: "admin",
      testMatch: /admin\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: ADMIN_BASE_URL,
        storageState: "e2e/.auth/user.json",
      },
    },

    // User story scenario tests — depend on auth-setup
    {
      name: "scenarios",
      testDir: "./e2e/scenarios",
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: ADMIN_BASE_URL,
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
});
