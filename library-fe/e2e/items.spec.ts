import { test, expect } from "@playwright/test";

test("items section and bulk form", async ({ page }) => {
  await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await page.locator('[data-sidebar="sidebar"]').getByText(/Item.*Eksemplar/i).first().click();
  await page.waitForTimeout(3000);
  await expect(page.getByRole("heading", { name: /item/i }).first()).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Bulk" }).click();
  await expect(page.getByText("Bulk Create Item")).toBeVisible({ timeout: 10000 });
});
