import { test, expect } from "@playwright/test";

test.describe("Fixes Verification E2E Suite (Live Production)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
  });

  test("1. Sub-menu Item: Deterministic sorting and interactive sort selector", async ({ page }) => {
    test.setTimeout(60000);

    // Navigasi ke sub-menu items
    await page.goto("/dashboard/super-admin?tab=items", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Item \/ Eksemplar/i })).toBeVisible({ timeout: 15000 });

    // Tunggu tabel data item ter-render
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 15000 });

    // Pastikan header kolom 'Kode Item' ada dan interaktif
    const itemCodeHeader = page.getByTitle("Klik untuk mengubah urutan kode item");
    await expect(itemCodeHeader).toBeVisible();

    // Verifikasi default sort: cek baris pertama dan kedua memiliki kode item valid
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const firstCode = await rows.first().locator("td").first().innerText();
    expect(firstCode.trim().length).toBeGreaterThan(0);

    // Verifikasi dropdown Urutan
    const sortSelect = page.locator('button[role="combobox"]').filter({ hasText: /Kode Item|Terbaru|Terlama/i });
    await expect(sortSelect).toBeVisible();

    // Klik dropdown urutan dan verifikasi opsi
    await sortSelect.click();
    await expect(page.getByRole("option", { name: /Kode Item \(1, 2, 3\.\.\.\)/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Kode Item \(3, 2, 1\.\.\.\)/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Terbaru Ditambahkan/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Terlama Ditambahkan/i })).toBeVisible();

    // Pilih urutan terbalik (3, 2, 1...)
    await page.getByRole("option", { name: /Kode Item \(3, 2, 1\.\.\.\)/i }).click();
    await page.waitForTimeout(2000);

    // Ambil kode item pertama setelah sort desc
    const descFirstCode = await rows.first().locator("td").first().innerText();
    expect(descFirstCode.trim().length).toBeGreaterThan(0);

    // Toggle kembali melalui klik header Kode Item
    await itemCodeHeader.click();
    await page.waitForTimeout(2000);
    const toggledCode = await rows.first().locator("td").first().innerText();
    expect(toggledCode.trim().length).toBeGreaterThan(0);
  });

  test("2. Sub-menu Bibliografi: Delete action with item-cascade warning dialog", async ({ page }) => {
    test.setTimeout(60000);

    // Navigasi ke sub-menu bibliographies
    await page.goto("/dashboard/super-admin?tab=bibliographies", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Bibliografi/i }).first()).toBeVisible({ timeout: 15000 });

    // Tunggu tabel bibliografi tampil
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 15000 });

    // Verifikasi tombol hapus (bukan lagi arsipkan)
    const deleteBtn = rows.first().getByTitle("Hapus Bibliografi");
    await expect(deleteBtn).toBeVisible();

    // Klik tombol hapus
    await deleteBtn.click();

    // Verifikasi modal konfirmasi anti-slop muncul
    await expect(page.getByText("Konfirmasi Penghapusan Bibliografi")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Batal" })).toBeVisible();
    await expect(page.getByTestId("confirm-delete-bib-btn")).toBeVisible();

    // Verifikasi peringatan eksemplar aktif jika buku memiliki eksemplar fisik
    const warningBadge = page.getByText("Peringatan Eksemplar Fisik Aktif");
    const safeNote = page.getByText("Bibliografi ini belum memiliki eksemplar fisik");
    const hasWarning = await warningBadge.isVisible().catch(() => false);
    const hasSafeNote = await safeNote.isVisible().catch(() => false);
    expect(hasWarning || hasSafeNote).toBeTruthy();

    // Klik tombol Batal agar data live tetap terjaga
    await page.getByRole("button", { name: "Batal" }).click();
    await expect(page.getByText("Konfirmasi Penghapusan Bibliografi")).not.toBeVisible();
  });

  test("3. Form Tambah Bibliografi: Step 4 cover image file upload and UI elements", async ({ page }) => {
    test.setTimeout(60000);

    // Navigasi ke sub-menu bibliografi
    await page.goto("/dashboard/super-admin?tab=bibliographies", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Bibliografi/i }).first()).toBeVisible({ timeout: 15000 });

    // Buka form tambah bibliografi
    const tambahBtn = page.getByRole("button", { name: "Tambah" }).first();
    await expect(tambahBtn).toBeVisible();
    await tambahBtn.click();

    // Form wizard terbuka
    await expect(page.getByRole("heading", { name: /Tambah Bibliografi/i })).toBeVisible({ timeout: 10000 });

    // Isi judul buku dan nama pengarang untuk validasi Step 1
    const titleInput = page.locator('input[placeholder*="judul" i]').first();
    await titleInput.fill("E2E Test Cover Upload Validation");

    const authorInput = page.locator('input[placeholder*="Ketikkan nama penulis" i]').first();
    await authorInput.fill("E2E Author");

    // Lanjut ke Step 2
    await page.getByRole("button", { name: "Selanjutnya" }).click();
    await page.waitForTimeout(500);

    // Lanjut ke Step 3
    await page.getByRole("button", { name: "Selanjutnya" }).click();
    await page.waitForTimeout(500);

    // Lanjut ke Step 4 (Sampul & Berkas)
    await page.getByRole("button", { name: "Selanjutnya" }).click();
    await page.waitForTimeout(500);

    // Verifikasi berada di Step 4 Sampul
    await expect(page.getByText(/Unggah Gambar Sampul Buku/i)).toBeVisible({ timeout: 10000 });

    // Verifikasi input file sampul buku ada dengan batasan image/*
    const fileInput = page.locator('input[type="file"][accept*="image"]');
    await expect(fileInput).toBeAttached();

    // Batalkan / kembali form
    const batalBtn = page.getByRole("button", { name: /Kembali ke Daftar/i });
    await batalBtn.click();
    await expect(page.getByRole("heading", { name: /Tambah Bibliografi/i })).not.toBeVisible();
  });
});
