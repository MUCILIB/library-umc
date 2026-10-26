import { test, expect } from "@playwright/test";

test.describe("Super Admin & Student Profile Flows", () => {
  const timestamp = Date.now();
  const testFacultyName = `Fakultas Teknik Otomasi ${timestamp}`;
  const testFacultyCode = `FTO-${String(timestamp).slice(-4)}`;
  const testLocationName = `Lantai 3 - Rak QA-${String(timestamp).slice(-4)}`;
  const testBiblioTitle = `Automated Engineering Manual ${timestamp}`;
  const testIsbn = `978-602-${String(timestamp).slice(-4)}`;
  const testItemCode = `ITM-${String(timestamp).slice(-6)}`;

  test("1. Admin creates Faculty and Location", async ({ page }) => {
    await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Buka Menu Fakultas
    await page.locator('[data-sidebar="sidebar"]').getByText("Fakultas").first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading", { name: "Fakultas" })).toBeVisible({ timeout: 10000 });

    // Tambah Fakultas Baru
    const tambahFakultasBtn = page.getByRole("button", { name: /tambah/i }).first();
    if (await tambahFakultasBtn.isVisible()) {
      await tambahFakultasBtn.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[placeholder*="nama" i], input[name="name"]').first();
      await nameInput.fill(testFacultyName);

      const codeInput = page.locator('input[placeholder*="kode" i], input[name="code"]').first();
      if (await codeInput.isVisible()) {
        await codeInput.fill(testFacultyCode);
      }

      await page.getByRole("button", { name: /simpan/i }).click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(testFacultyName)).toBeVisible({ timeout: 10000 });
    }

    // Buka Menu Lokasi Rak
    await page.locator('[data-sidebar="sidebar"]').getByText("Lokasi Rak").first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading", { name: /lokasi/i })).toBeVisible({ timeout: 10000 });

    // Tambah Lokasi Rak Baru
    const tambahLokasiBtn = page.getByRole("button", { name: /tambah/i }).first();
    if (await tambahLokasiBtn.isVisible()) {
      await tambahLokasiBtn.click();
      await page.waitForTimeout(1000);

      const locNameInput = page.locator('input[placeholder*="nama" i], input[name="name"]').first();
      await locNameInput.fill(testLocationName);

      await page.getByRole("button", { name: /simpan/i }).click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(testLocationName)).toBeVisible({ timeout: 10000 });
    }
  });

  test("2. Admin creates Bibliography and Physical Item", async ({ page }) => {
    await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Buka Menu Bibliografi
    await page.locator('[data-sidebar="sidebar"]').getByText("Bibliografi").last().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText("Kelola data bibliografi")).toBeVisible({ timeout: 10000 });

    // Tambah Bibliografi
    await page.getByRole("button", { name: "Tambah" }).click();
    await expect(page.getByRole("heading", { name: /tambah bibliografi/i })).toBeVisible({ timeout: 10000 });

    // Isi Form Bibliografi
    const titleInput = page.locator('input[placeholder*="judul" i], input[name="title"]').first();
    await titleInput.fill(testBiblioTitle);

    const isbnInput = page.locator('input[placeholder*="isbn" i], input[name="isbn"]').first();
    if (await isbnInput.isVisible()) {
      await isbnInput.fill(testIsbn);
    }

    const simpanBtn = page.getByRole("button", { name: /simpan/i }).first();
    await simpanBtn.click();
    await page.waitForTimeout(3000);

    // Buka Menu Item / Eksemplar
    await page.locator('[data-sidebar="sidebar"]').getByText("Item Buku").first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByRole("heading", { name: /item/i })).toBeVisible({ timeout: 10000 });

    // Tambah Item Fisik
    const tambahItemBtn = page.getByRole("button", { name: /tambah/i }).first();
    if (await tambahItemBtn.isVisible()) {
      await tambahItemBtn.click();
      await page.waitForTimeout(1500);

      const barcodeInput = page.locator('input[placeholder*="barcode" i], input[name="itemCode"]').first();
      if (await barcodeInput.isVisible()) {
        await barcodeInput.fill(testItemCode);
      }

      const submitItemBtn = page.getByRole("button", { name: /simpan/i }).first();
      if (await submitItemBtn.isVisible()) {
        await submitItemBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});
