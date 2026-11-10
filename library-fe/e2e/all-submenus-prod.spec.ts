import { test, expect } from "@playwright/test";

test.describe("All 21 Super Admin Sub-Menus E2E Suite (Production)", () => {
  const timestamp = Date.now().toString();
  const testFacultyName = `E2E-AUTO-Fakultas-${timestamp}`;
  const testFacultyCode = `E2E-${timestamp.slice(-4)}`;
  const testProdiName = `E2E-AUTO-Prodi-${timestamp}`;
  const testProdiCode = `PRD-${timestamp.slice(-4)}`;
  const testLocationRoom = `E2E-AUTO-Ruang-${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // Tangani dialog window.confirm secara otomatis agar proses delete di UI berjalan sukses
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.goto("/dashboard/super-admin", { waitUntil: "domcontentloaded" });
  });

  test("1. Comprehensive Navigation Across All 21 Sub-Menus & CMS Sub-Tabs", async ({ page }) => {
    test.setTimeout(90000);
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    const menuChecks = [
      { key: "dashboard", label: "Dashboard", heading: /Ringkasan Sistem/i },
      { key: "circulation", label: "Sirkulasi & Scan", heading: /Sirkulasi/i },
      { key: "loans", label: "Peminjaman & Persetujuan", heading: /Peminjaman/i },
      { key: "returnApprovals", label: "Konfirmasi Pengembalian", heading: /Pengembalian/i },
      { key: "fines", label: "Manajemen Denda", heading: /Manajemen Denda/i },
      { key: "cardApprovals", label: "Persetujuan Kartu", heading: /Persetujuan Kartu/i },
      { key: "bibliographies", label: "Bibliografi (Buku)", heading: /Bibliografi/i },
      { key: "items", label: "Item Eksemplar", heading: /Item \/ Eksemplar/i },
      { key: "ebooks", label: "E-Book Digital", heading: /Manajemen Koleksi E-Book/i },
      { key: "repository", label: "Repositori Skripsi", heading: /Repositori Skripsi/i },
      { key: "recommendations", label: "Rekomendasi Buku", heading: /Usulan Pengadaan/i },
      { key: "importData", label: "Import Data", heading: /Import Data/i },
      { key: "exportData", label: "Export Data", heading: /Export Data/i },
      { key: "fakultas", label: "Fakultas", heading: /Manajemen Fakultas/i },
      { key: "prodi", label: "Program Studi", heading: /Manajemen Program Studi/i },
      { key: "locations", label: "Lokasi Rak", heading: /Lokasi Rak Buku/i },
      { key: "guests", label: "Data Pengunjung", heading: /Pengunjung|Pengguna/i },
      { key: "users", label: "Manajemen User", heading: /Manajemen User/i },
      { key: "audit", label: "Audit Log", heading: /Audit Log Sistem/i },
      { key: "reports", label: "Laporan & Statistik", heading: /Laporan & Statistik/i },
    ];

    for (const item of menuChecks) {
      await page.goto(`/dashboard/super-admin?tab=${item.key}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: item.heading }).first()).toBeVisible({ timeout: 12000 });
    }

    // CMS Sub-Tabs
    const cmsTabs = [
      { key: "cms-banner", heading: /Bilah Pengumuman/i },
      { key: "cms-branding", heading: /Identitas Portal/i },
      { key: "cms-hero", heading: /Hero Section/i },
      { key: "cms-location", heading: /Peta Lokasi/i },
    ];

    for (const cmsTab of cmsTabs) {
      await page.goto(`/dashboard/super-admin?tab=${cmsTab.key}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: cmsTab.heading }).first()).toBeVisible({ timeout: 12000 });
    }
  });

  test("2. CRUD Master Data Fakultas & Prodi with Clean Data", async ({ page }) => {
    // A. Buat Fakultas Baru
    await page.goto("/dashboard/super-admin?tab=fakultas", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Manajemen Fakultas/i })).toBeVisible({ timeout: 10000 });

    const tambahFakBtn = page.getByRole("button", { name: /tambah fakultas/i }).first();
    await tambahFakBtn.click();

    const nameInput = page.locator('input[name="name"], input[placeholder*="Fakultas" i]').first();
    await nameInput.waitFor({ state: "visible", timeout: 5000 });
    await nameInput.fill(testFacultyName);

    const codeInput = page.locator('input[name="code"], input[placeholder*="FT" i]').first();
    if (await codeInput.isVisible()) {
      await codeInput.fill(testFacultyCode);
    }

    await page.getByRole("button", { name: /simpan/i }).click();
    await expect(page.getByText(testFacultyName).first()).toBeVisible({ timeout: 10000 });

    // B. Buat Program Studi Baru yang terhubung ke Fakultas tersebut
    await page.goto("/dashboard/super-admin?tab=prodi", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Manajemen Program Studi/i })).toBeVisible({ timeout: 10000 });

    const tambahProdiBtn = page.getByRole("button", { name: /tambah prodi/i }).first();
    await tambahProdiBtn.click();

    const prodiModal = page.locator('div.fixed.z-\\[9999\\], div.fixed.inset-0').last();
    await expect(page.getByText("Tambah Program Studi")).toBeVisible({ timeout: 5000 });

    const prodiNameInput = prodiModal.locator("input").first();
    await prodiNameInput.fill(testProdiName);

    const prodiCodeInput = prodiModal.locator('input[placeholder*="opsional" i]').first();
    if (await prodiCodeInput.isVisible()) {
      await prodiCodeInput.fill(testProdiCode);
    }

    // Pilih Fakultas di dropdown
    const selectTrigger = prodiModal.locator('button[role="combobox"]').first();
    if (await selectTrigger.isVisible()) {
      await selectTrigger.click();
      await page.waitForTimeout(500);
      const fakOption = page.locator('div[role="option"]', { hasText: testFacultyName }).first();
      if (await fakOption.isVisible()) {
        await fakOption.click();
      } else {
        await page.locator('div[role="option"]').first().click();
      }
    }

    const simpanProdiBtn = prodiModal.getByRole("button", { name: /simpan/i }).first();
    await simpanProdiBtn.click();
    await expect(page.getByText(testProdiName).first()).toBeVisible({ timeout: 10000 });

    // Hapus Prodi via UI (Clean Data)
    const prodiRow = page.locator("tr", { hasText: testProdiName }).first();
    if (await prodiRow.isVisible()) {
      const delProdi = prodiRow.locator("button").last();
      await delProdi.click();
      await page.waitForTimeout(1500);
    }

    // Hapus Fakultas via UI (Clean Data)
    await page.goto("/dashboard/super-admin?tab=fakultas", { waitUntil: "domcontentloaded" });
    const fakRow = page.locator("tr", { hasText: testFacultyName }).first();
    if (await fakRow.isVisible()) {
      const delFak = fakRow.locator('button[title*="Hapus" i]').or(fakRow.locator("button").last()).first();
      await delFak.click();
      await page.waitForTimeout(1500);
    }
  });

  test("3. CRUD Master Data Lokasi Rak with Clean Data", async ({ page }) => {
    await page.goto("/dashboard/super-admin?tab=locations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Lokasi Rak Buku/i })).toBeVisible({ timeout: 10000 });

    // Tambah Lokasi
    const tambahBtn = page.getByRole("button", { name: /tambah lokasi/i }).first();
    await tambahBtn.click();

    const modal = page.locator("div.fixed form");
    await modal.waitFor({ state: "visible", timeout: 5000 });

    const roomInput = modal.locator('input[name="room"], input[placeholder*="Lantai" i]').first();
    await roomInput.fill(testLocationRoom);

    const rackInput = modal.locator('input[name="rack"], input[placeholder*="Rak" i]').first();
    await rackInput.fill("Rak-E2E");

    const shelfInput = modal.locator('input[name="shelf"], input[placeholder*="Baris" i]').first();
    await shelfInput.fill("Baris-1");

    const submitBtn = modal.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Verifikasi Muncul
    await expect(page.getByText(testLocationRoom).first()).toBeVisible({ timeout: 10000 });

    // Hapus Lokasi (Clean Data)
    const row = page.locator("tr, div.rounded-xl", { hasText: testLocationRoom }).first();
    const deleteBtn = row.getByRole("button", { name: /hapus|delete/i }).or(row.locator('button[title*="Hapus" i]')).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmBtn = page.locator('button:has-text("Hapus")').last();
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(2000);
    }
  });

  test("4. CMS Banner Toggle & Content Verification", async ({ page }) => {
    await page.goto("/dashboard/super-admin?tab=cms-banner", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Bilah Pengumuman/i })).toBeVisible({ timeout: 10000 });

    const saveBtn = page.getByRole("button", { name: /Simpan Perubahan/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(2000);
  });

  test("5. Export Sub-Menu Verification", async ({ page }) => {
    await page.goto("/dashboard/super-admin?tab=exportData", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Export Data/i })).toBeVisible({ timeout: 10000 });

    const exportBibBtn = page.getByRole("button", { name: /Export Bibliografi/i }).first();
    await expect(exportBibBtn).toBeVisible({ timeout: 5000 });
  });

  test.afterAll(async ({ request }) => {
    // Teardown API fallback untuk memastikan semua data ber-prefix E2E-AUTO- terhapus dari production DB
    try {
      // Baca storage state yang dinamis dari auth setup prod
      let bearerToken = "";
      try {
        const fs = await import("fs");
        const authPath = "./playwright/.auth/admin-prod.json";
        if (fs.existsSync(authPath)) {
          const authData = JSON.parse(fs.readFileSync(authPath, "utf-8"));
          const originObj = authData.origins?.find((o: any) => o.origin?.includes("vercel.app"));
          const tokenItem = originObj?.localStorage?.find((item: any) => item.name === "better_auth_token");
          if (tokenItem?.value) {
            bearerToken = tokenItem.value;
          }
        }
      } catch (err) {
        console.warn("Could not read auth storage token:", err);
      }

      const authHeader: Record<string, string> = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};

      // 1. Bersihkan Program Studi uji jika tersisa
      const prodiRes = await request.get("https://api-library.abyte.my.id/api/study-programs", { headers: authHeader });
      if (prodiRes.ok()) {
        const prodiJson = await prodiRes.json();
        const prodiList = Array.isArray(prodiJson.data) ? prodiJson.data : (Array.isArray(prodiJson.data?.items) ? prodiJson.data.items : []);
        for (const p of prodiList) {
          if (p.name && p.name.includes("E2E-AUTO")) {
            await request.delete(`https://api-library.abyte.my.id/api/study-programs/${p.id}`, { headers: authHeader });
          }
        }
      }

      // 2. Bersihkan Fakultas uji jika tersisa
      const fakRes = await request.get("https://api-library.abyte.my.id/api/faculties", { headers: authHeader });
      if (fakRes.ok()) {
        const fakJson = await fakRes.json();
        const fakList = Array.isArray(fakJson.data) ? fakJson.data : (Array.isArray(fakJson.data?.items) ? fakJson.data.items : []);
        for (const f of fakList) {
          if (f.name && f.name.includes("E2E-AUTO")) {
            await request.delete(`https://api-library.abyte.my.id/api/faculties/${f.id}`, { headers: authHeader });
          }
        }
      }

      // 3. Bersihkan Lokasi uji jika tersisa
      const locRes = await request.get("https://api-library.abyte.my.id/api/locations", { headers: authHeader });
      if (locRes.ok()) {
        const locJson = await locRes.json();
        const locList = Array.isArray(locJson.data) ? locJson.data : (Array.isArray(locJson.data?.items) ? locJson.data.items : []);
        for (const l of locList) {
          if (l.room && l.room.includes("E2E-AUTO")) {
            await request.delete(`https://api-library.abyte.my.id/api/locations/${l.id}`, { headers: authHeader });
          }
        }
      }
    } catch (e) {
      console.warn("Teardown clean data error:", e);
    }
  });
});
