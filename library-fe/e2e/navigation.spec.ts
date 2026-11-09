import { test, expect } from "@playwright/test";

test("navigation sidebar and sections", async ({ page }) => {
  await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  const sidebar = page.locator('[data-sidebar="sidebar"]');
  await expect(sidebar.getByText(/Item.*Eksemplar/i).first()).toBeVisible({ timeout: 10000 });
  await expect(sidebar.getByText("Import Data").first()).toBeVisible({ timeout: 10000 });
  await expect(sidebar.getByText("Export Data").first()).toBeVisible({ timeout: 10000 });
  await expect(sidebar.getByText("Collections")).not.toBeVisible();
  await sidebar.getByText("Import Data").first().click();
  await expect(page.getByRole("heading", { name: "Import Data" })).toBeVisible({ timeout: 10000 });
  await sidebar.getByText("Export Data").first().click();
  await expect(page.getByRole("heading", { name: "Export Data" })).toBeVisible({ timeout: 10000 });
});
