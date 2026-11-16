import { test, expect } from "@playwright/test";

test("bibliography section", async ({ page }) => {
  await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  await page.locator('[data-sidebar="sidebar"]').getByText("Bibliografi").last().click();
  await page.waitForTimeout(3000);
  await expect(page.getByText("Kelola data bibliografi")).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await expect(page.getByRole("heading", { name: /tambah bibliografi/i })).toBeVisible({ timeout: 10000 });
});
