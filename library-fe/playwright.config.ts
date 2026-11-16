import { defineConfig, devices } from "@playwright/test";

const BACKEND_PORT = "4100";
const FRONTEND_PORT = "5174";
const TEST_DB = "postgresql://mucilib_test:mucilib_test_password@localhost:55432/mucilib_test";
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_PATH || "";

// Spec halaman publik: /, /katalog, /absensi dibungkus NonAdminRoute yang
// me-redirect admin ke dashboard. Jalan tanpa storageState admin.
const PUBLIC_SPECS =
  /(unauthenticated|bookmark-external|rbac-dynamic-sidebar|responsive-landing-devices|catalog-populate-and-verify)\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: "list",
  timeout: 60000,
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    screenshot: "only-on-failure",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { launchOptions: { ...(CHROMIUM ? { executablePath: CHROMIUM } : {}) } },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
        launchOptions: { ...(CHROMIUM ? { executablePath: CHROMIUM } : {}) },
      },
      dependencies: ["setup"],
      testIgnore: PUBLIC_SPECS,
    },
    {
      name: "unauth",
      testMatch: PUBLIC_SPECS,
      use: { launchOptions: { ...(CHROMIUM ? { executablePath: CHROMIUM } : {}) } },
    },
  ],
  webServer: [
    {
      name: "backend",
      command: "npx tsx src/index.ts",
      cwd: "../library-be",
      env: {
        DATABASE_URL: TEST_DB,
        PORT: BACKEND_PORT,
        NODE_ENV: "test",
        BETTER_AUTH_SECRET: "test-secret",
        BETTER_AUTH_URL: `http://localhost:${BACKEND_PORT}`,
        FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`
      },
      url: `http://localhost:${BACKEND_PORT}/health`,
      timeout: 30000,
      reuseExistingServer: true,
    },
    {
      name: "frontend",
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      env: {
        VITE_API_URL: `http://localhost:${BACKEND_PORT}`,
        VITE_BETTER_AUTH_URL: `http://localhost:${BACKEND_PORT}`,
        VITE_BASE_URL: `http://localhost:${FRONTEND_PORT}`
      },
      url: `http://localhost:${FRONTEND_PORT}`,
      timeout: 30000,
      reuseExistingServer: true,
    },
  ],
});
