import { test, expect } from "@playwright/test";

test.describe("E2E: Dynamic Sidebar & Dynamic Role Permissions", () => {
  const baseURL = "http://localhost:5173";

  test("Super Admin memiliki akses penuh ke seluruh menu dan dapat melihat tab RBAC", async ({ page }) => {
    // 1. Login sebagai Super Admin
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill("admin@mucilib.ac.id");
    await passwordInput.fill("Admin123456!");
    await page.locator('button[type="submit"]').click();

    // Tunggu redirect ke dashboard
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // 2. Verifikasi Sidebar Super Admin
    // Super admin harus bisa melihat menu sensitif seperti Manajemen User & Audit Log
    const userMenu = page.locator('button:has-text("Manajemen User")').first();
    const auditMenu = page.locator('button:has-text("Audit Log")').first();

    await expect(userMenu).toBeVisible({ timeout: 10000 });
    await expect(auditMenu).toBeVisible({ timeout: 10000 });

    // 3. Masuk ke Manajemen User -> Tab Kelola Role & Hak Akses (RBAC)
    await userMenu.click();
    await page.waitForTimeout(1000);

    const rbacTab = page.locator('button:has-text("Kelola Role & Hak Akses (RBAC)")');
    await expect(rbacTab).toBeVisible();
    await rbacTab.click();

    // 4. Verifikasi Tampilan Role Permissions Manager
    // Header Matriks Hak Akses & Role Dinamis (RBAC) harus muncul
    const rbacTitle = page.locator('text=Matriks Hak Akses & Role Dinamis (RBAC)').first();
    await expect(rbacTitle).toBeVisible({ timeout: 10000 });

    // Verifikasi tombol tambah role kustom muncul
    const addRoleBtn = page.locator('button:has-text("Tambah Role Kustom")').first();
    await expect(addRoleBtn).toBeVisible();
  });

  test("User External (Non-Admin) tidak memiliki akses ke Manajemen User & RBAC di sidebar", async ({ page }) => {
    // 1. Login sebagai Member External
    await page.goto(`${baseURL}/login`);
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await emailInput.fill("external@mucilib.ac.id");
    await passwordInput.fill("External123456!");
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // 2. Jika diarahkan ke homepage/katalog, coba navigasi manual ke /dashboard
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState("networkidle");

    // 3. Verifikasi proteksi Dynamic Sidebar
    // Menu "Manajemen User" dan "Audit Log" TIDAK boleh terlihat di sidebar akun external
    const userMenu = page.locator('button:has-text("Manajemen User")');
    const auditMenu = page.locator('button:has-text("Audit Log")');

    await expect(userMenu).toHaveCount(0);
    await expect(auditMenu).toHaveCount(0);
  });
});
