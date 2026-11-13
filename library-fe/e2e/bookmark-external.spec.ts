import { test, expect } from "@playwright/test";

test.describe("E2E: Member External Bookmark Flow", () => {
  const baseURL = "http://localhost:5173";

  test("Login Member External -> Simpan Buku di Katalog -> Cek Buku di Profil", async ({ page }) => {
    // 1. Masuk ke halaman login
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState("networkidle");

    // 2. Klik tombol demo "Member External" atau isi manual
    const externalDemoBtn = page.locator("button:has-text('Member External')");
    if (await externalDemoBtn.isVisible()) {
      await externalDemoBtn.click();
    } else {
      await page.fill('input[type="email"]', "external@mucilib.ac.id");
      await page.fill('input[type="password"]', "External123456!");
    }

    // Submit form login
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Tunggu redirect ke landing page atau dashboard
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
    console.log("Berhasil login:", page.url());

    // 3. Masuk ke halaman katalog
    await page.goto(`${baseURL}/katalog`);
    await page.waitForLoadState("networkidle");

    // Tunggu kartu buku muncul
    const bookTitleLocator = page.locator("h3[title]").first();
    await expect(bookTitleLocator).toBeVisible({ timeout: 15000 });
    const bookTitle = (await bookTitleLocator.textContent())?.trim() || "";
    console.log("Menemukan buku:", bookTitle);

    // Klik judul / cover buku untuk membuka detail
    await bookTitleLocator.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/katalog\/.+/);
    console.log("Membuka detail katalog:", page.url());

    // 4. Cek tombol Bookmark / Simpan di Katalog Detail
    const saveButton = page.locator("button:has-text('Simpan'), button:has-text('Disimpan')").first();
    await expect(saveButton).toBeVisible({ timeout: 10000 });

    const initialButtonText = (await saveButton.textContent())?.trim();
    console.log("Status tombol simpan awal:", initialButtonText);

    // Jika belum tersimpan, klik simpan
    if (initialButtonText?.includes("Simpan") && !initialButtonText?.includes("Disimpan")) {
      await saveButton.click();
      await page.waitForTimeout(1500);
      await expect(page.locator("button:has-text('Disimpan')").first()).toBeVisible({ timeout: 5000 });
    }
    console.log("Buku berhasil dipastikan tersimpan!");

    // 5. Masuk ke halaman Profil
    await page.goto(`${baseURL}/profile`);
    await page.waitForLoadState("networkidle");

    // 6. Klik tab "Buku Disimpan"
    const savedTab = page.locator("button:has-text('Buku Disimpan'), [role='tab']:has-text('Disimpan')").first();
    if (await savedTab.isVisible()) {
      await savedTab.click();
      await page.waitForTimeout(2000);
    }

    // 7. Verifikasi buku ada di dalam list Buku Disimpan
    const savedPageBody = page.locator("body");
    await expect(savedPageBody).toContainText(bookTitle.slice(0, 15), { timeout: 10000 });

    // Tunggu gambar cover di tab profil selesai render
    const savedImg = page.locator("img[alt*='Akuntansi']").first();
    await expect(savedImg).toBeVisible({ timeout: 10000 });
    console.log("Gambar cover buku di profil berhasil ter-load!");

    // 8. Ambil screenshot bukti
    await page.screenshot({ path: "D:/KERJAAN/library-umc/e2e-bookmark-profile-success.png", fullPage: true });
  });
});
