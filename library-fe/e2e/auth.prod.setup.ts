import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "../playwright/.auth/admin-prod.json");

setup("authenticate as admin on prod", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@mucilib.ac.id";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || "Admin123456!";

  const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(adminEmail);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: "visible", timeout: 15000 });
  await passwordInput.fill(adminPassword);

  const submitBtn = page.getByRole("button", { name: /masuk ke perpustakaan/i }).first();
  await submitBtn.click();

  await page.waitForFunction(() => window.location.pathname.includes("/dashboard"), { timeout: 30000 });
  await page.waitForTimeout(3000);

  await page.context().storageState({ path: authFile });
});
