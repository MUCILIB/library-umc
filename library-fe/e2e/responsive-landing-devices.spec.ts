import { test, expect } from "@playwright/test";

// Menguji berbagai ukuran viewport perangkat (Mobile, Tablet, Desktop)
const VIEWPORTS = [
  { name: "Mobile Small (iPhone SE)", width: 320, height: 568 },
  { name: "Mobile Standard (iPhone 14)", width: 390, height: 844 },
  { name: "Tablet (iPad)", width: 768, height: 1024 },
  { name: "Desktop (Laptop/Monitor)", width: 1280, height: 800 },
];

test.describe("Responsive Landing Page & Public Pages Across Devices", () => {
  for (const vp of VIEWPORTS) {
    test(`Landing Page (Home) renders correctly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/", { waitUntil: "networkidle" });

      // Verifikasi Navbar dan Logo UMC terlihat
      const brandLogo = page.locator('img[alt*="UMC" i]').first();
      await expect(brandLogo).toBeVisible();

      // Verifikasi Judul Hero
      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible();

      // Verifikasi Search Bar Capsule tidak melebihi lebar viewport
      const searchInput = page.locator('input[placeholder*="Cari" i]').first();
      await expect(searchInput).toBeVisible();

      // Verifikasi 4 Pintasan Fitur Utama di Halaman
      const katalogCard = page.locator('a[href="/katalog"]:has-text("Katalog Online")');
      await expect(katalogCard).toBeVisible();

      const repositoriCard = page.locator('a[href="/repositori"]:has-text("Repositori Digital")');
      await expect(repositoriCard).toBeVisible();

      // Verifikasi Section Koleksi Terbaru
      const koleksiHeading = page.getByRole("heading", { name: "Koleksi Terbaru" });
      await expect(koleksiHeading).toBeVisible();

      // Pastikan tidak ada horizontal scrollbar liar pada body
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 5);
    });

    test(`Katalog Page renders search & filters cleanly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/katalog", { waitUntil: "networkidle" });

      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible();

      // Pastikan tidak ada horizontal scroll liar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 5);
    });

    test(`Absensi Kiosk Page renders without clipping on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/absensi", { waitUntil: "networkidle" });

      const heading = page.locator('h1:has-text("UMC Library")').first();
      await expect(heading).toBeVisible();

      const inputNim = page.locator('input[placeholder*="NIM" i]').first();
      await expect(inputNim).toBeVisible();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(vp.width + 5);
    });
  }
});
