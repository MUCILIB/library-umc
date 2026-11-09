import { test, expect } from "@playwright/test";

test("session persists after reload", async ({ page }) => {
  await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-sidebar="sidebar"]').getByText(/Item.*Eksemplar/i).first()).toBeVisible({ timeout: 10000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await expect(page.locator('[data-sidebar="sidebar"]').getByText(/Item.*Eksemplar/i).first()).toBeVisible({ timeout: 10000 });
});
