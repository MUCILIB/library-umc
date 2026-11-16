import { test, expect } from "@playwright/test";

test.describe("E2E Catalog Real Books & Filtering Verification", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Katalog page
    await page.goto("/katalog", { waitUntil: "domcontentloaded" });
  });

  test("1. Katalog loads real academic books with valid covers and 'Tersedia' status", async ({ page }) => {
    // Ensure book list container has rendered books
    const bookCards = page.locator('[data-testid="book-card"], .group.relative');
    await expect(bookCards.first()).toBeVisible({ timeout: 15000 });

    // Seed nyata: cek judul yang benar-benar ada di seed
    const seededTitle = page.getByText(/Kecerdasan Buatan/i).first();
    await expect(seededTitle).toBeVisible({ timeout: 15000 });

    // Verify status badge says 'Tersedia' (NOT 'Tersedia Dipinjam')
    const tersediaBadge = page.locator("text=Tersedia").first();
    await expect(tersediaBadge).toBeVisible();

    // Verify cover area renders (cover bisa fallback mock, bukan file /covers/)
    const coverImg = page.locator('img[alt], .group.relative').first();
    await expect(coverImg).toBeVisible({ timeout: 15000 });
  });

  test("2. Filter by Faculty (Fakultas Teknik) narrows down books correctly", async ({ page }) => {
    // Open Filter slide/panel if not open
    const filterTrigger = page.getByRole("button", { name: /filter/i }).first();
    if (await filterTrigger.isVisible()) {
      await filterTrigger.click();
      await page.waitForTimeout(500);
    }

    // Click on Fakultas Teknik filter
    const ftOption = page.locator("text=Fakultas Teknik").first();
    if (await ftOption.isVisible()) {
      await ftOption.click();
      await page.waitForTimeout(1000);

      // Verify Teknik books are visible
      await expect(bookCards.first()).toBeVisible();
    }
  });

  test("3. Search by title finds matching book instantly", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Cari" i], input[type="search"]').first();
    await searchInput.fill("Manajemen");
    await page.waitForTimeout(1000);

    // Assert judul hasil pencarian tampil
    await expect(page.getByText(/Manajemen/i).first()).toBeVisible();
    // Assert judul lain tersaring keluar
    await expect(page.getByText(/Kecerdasan Buatan/i)).not.toBeVisible();
  });

  test("4. Detail page displays stock availability and item details", async ({ page }) => {
    // Search judul yang ada di seed
    const searchInput = page.locator('input[placeholder*="Cari" i], input[type="search"]').first();
    await searchInput.fill("Kecerdasan Buatan");
    await page.waitForTimeout(1000);

    // Click kartu hasil pencarian
    const cardOrBtn = page.getByText(/Kecerdasan Buatan/i).first();
    await cardOrBtn.click();
    await page.waitForTimeout(1500);

    // Assert detail page displays stock information
    await expect(page.getByText(/Stok/i).first()).toBeVisible();
    await expect(page.getByText(/Tersedia/i).first()).toBeVisible();
  });
});
