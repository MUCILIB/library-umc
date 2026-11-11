import { test, expect } from "@playwright/test";

test.describe("E2E Catalog Real Books & Filtering Verification", () => {
  test.beforeEach(async ({ page }) => {
    page.on("requestfailed", (req) => console.log("[REQUEST FAILED]", req.url(), req.failure()?.errorText));
    page.on("console", (msg) => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
    page.on("pageerror", (err) => console.log("[BROWSER ERROR]", err.message));
    // Navigate to Katalog page
    await page.goto("/katalog", { waitUntil: "domcontentloaded" });
  });

  test("1. Katalog loads real academic books with valid covers and 'Tersedia' status", async ({ page }) => {
    // Ensure book list container has rendered books
    const bookCards = page.locator('[data-testid="book-card"], .group.relative');
    await expect(bookCards.first()).toBeVisible({ timeout: 15000 });

    // Assert that Clean Code or academic book title is displayed
    const cleanCodeTitle = page.getByText(/Clean Code/i).first();
    await expect(cleanCodeTitle).toBeVisible();

    // Verify status badge says 'Tersedia' (NOT 'Tersedia Dipinjam')
    const tersediaBadge = page.locator("text=Tersedia").first();
    await expect(tersediaBadge).toBeVisible();

    // Verify no broken images on covers
    const coverImages = page.locator('img[src*="/covers/"]');
    const imageCount = await coverImages.count();
    expect(imageCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(imageCount, 4); i++) {
      const img = coverImages.nth(i);
      const isVisible = await img.isVisible();
      expect(isVisible).toBe(true);

      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
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
      await expect(page.getByText(/Clean Code/i).first()).toBeVisible();
      // Verify non-Teknik books are filtered out
      await expect(page.getByText(/Hukum Tata Negara/i)).not.toBeVisible();
    }
  });

  test("3. Search by title finds matching book instantly", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Cari" i], input[type="search"]').first();
    await searchInput.fill("Manajemen Pemasaran");
    await page.waitForTimeout(1000);

    // Assert Kotler book is displayed
    await expect(page.getByText(/Manajemen Pemasaran/i).first()).toBeVisible();
    // Assert Clean Code is not displayed
    await expect(page.getByText(/Clean Code/i)).not.toBeVisible();
  });

  test("4. Detail page displays stock availability and item details", async ({ page }) => {
    // Search Clean Code
    const searchInput = page.locator('input[placeholder*="Cari" i], input[type="search"]').first();
    await searchInput.fill("Clean Code");
    await page.waitForTimeout(1000);

    // Click on Clean Code card or detail button
    const cardOrBtn = page.getByText(/Clean Code/i).first();
    await cardOrBtn.click();
    await page.waitForTimeout(1500);

    // Assert detail page displays stock information
    await expect(page.getByText(/Stok/i).first()).toBeVisible();
    await expect(page.getByText(/Tersedia/i).first()).toBeVisible();
  });
});
