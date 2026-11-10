import { defineConfig, devices } from "@playwright/test";

const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || "";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 60000,
  use: {
    baseURL: "https://library-fe-one.vercel.app",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "setup-prod",
      testMatch: /auth\.prod\.setup\.ts/,
      use: {
        launchOptions: { ...(CHROMIUM ? { executablePath: CHROMIUM } : {}) },
      },
    },
    {
      name: "chromium-prod",
      testMatch: /all-submenus-prod\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin-prod.json",
        launchOptions: { ...(CHROMIUM ? { executablePath: CHROMIUM } : {}) },
      },
      dependencies: ["setup-prod"],
    },
  ],
});
