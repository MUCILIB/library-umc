# Headless CMS & Site Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun subsystem Headless CMS / Site Settings mandiri pada platform MUCILIB agar identitas web, favicon, pengumuman sticky banner, hero section, info peta, dan footer dapat dikustomisasi dinamis langsung dari dashboard admin.

**Architecture:** Menggunakan tabel generik PostgreSQL `site_settings` (Drizzle ORM) dengan payload JSONB dan fallback terstruktur. Endpoint publik `GET /api/site-settings` menyajikan seluruh konfigurasi dengan efisien, dan endpoint `PUT /api/site-settings/:key` diproteksi middleware RBAC modul `cms`. Frontend menyediakan UI tabbed 4 segmen di `CmsSection.tsx` dan hook global `useSiteSettings()` untuk injeksi dinamis ke `document.title`, `<link rel="icon">`, banner, hero, peta, dan footer.

**Tech Stack:** Hono / Node.js, Drizzle ORM, PostgreSQL, Better Auth, React 19, Vite, Tailwind CSS v4, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-headless-cms-design.md`

## Global Constraints

- Backend framework: Hono / Node.js with Drizzle ORM at `library-be`.
- Frontend framework: React 19 + Vite + Tailwind CSS v4 at `library-fe`.
- Anti-Slop: Tidak boleh ada karakter em-dash (`—`) pada teks UI atau copywriting; gunakan strip standar `-` atau tanda kurung.
- TDD & Vitest: Setiap task backend dan frontend wajib memiliki file unit test Vitest tersendiri.
- Backward compatibility: Jika tabel `site_settings` kosong, backend wajib menyajikan nilai default fallback tanpa melempar HTTP 404 atau 500.

## Review Focus

1. **Database Fallback:** Ketika database baru pertama kali dijalankan tanpa data seed, `GET /api/site-settings` wajib tetap mengembalikan struktur objek lengkap berisi nilai default.
2. **RBAC Isolation:** User non-super-admin yang tidak memiliki permission `canEdit` pada modul `cms` wajib ditolak dengan HTTP 403 saat memanggil `PUT /api/site-settings/:key`.
3. **Invalid JSON Payload:** Input JSON yang rusak atau tidak sesuai tipe skema pada `PUT` tidak boleh menyebabkan server crash atau merusak data kunci lain.
4. **Local Storage Conflict:** Penutupan sticky banner di client tidak boleh merusak sinkronisasi saat admin memperbarui pesan pengumuman baru.
5. **Favicon DOM Injection:** Injeksi dinamis elemen `<link rel="icon">` di browser harus mendukung URL eksternal maupun path lokal tanpa error CORS/mixed content.

---

### Task 1: Database Schema & Migration for `site_settings`

**Files:**
- Modify: `library-be/src/db/schema.ts`
- Modify: `library-be/src/index.ts` (jika pending migration perlu dipanggil)
- Test: `library-be/src/modules/site-setting/__tests__/site-setting.schema.test.ts`

**Interfaces:**
- Produces: `siteSettings` table definition di Drizzle ORM dengan kolom `key` (varchar 100 PK), `value` (jsonb notNull), `description` (text), `updatedBy` (varchar 50), `createdAt`, `updatedAt`.

- [ ] **Step 1: Write the failing test**

```ts
// library-be/src/modules/site-setting/__tests__/site-setting.schema.test.ts
import { describe, it, expect } from "vitest";
import { siteSettings } from "../../../db/schema";

describe("SiteSettings Schema", () => {
  it("mendefinisikan tabel site_settings dengan kolom yang sesuai", () => {
    expect(siteSettings).toBeDefined();
    expect(siteSettings.key).toBeDefined();
    expect(siteSettings.value).toBeDefined();
    expect(siteSettings.description).toBeDefined();
    expect(siteSettings.updatedBy).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/KERJAAN/library-umc/library-be && bunx vitest run src/modules/site-setting/__tests__/site-setting.schema.test.ts`
Expected: FAIL (Cannot find module or export `siteSettings`)

- [ ] **Step 3: Implement `siteSettings` table in `library-be/src/db/schema.ts`**

Tambahkan tabel `siteSettings` dengan kolom `key`, `value` (jsonb), `description`, `updatedBy` (references `Users.id`), `createdAt`, dan `updatedAt`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/KERJAAN/library-umc/library-be && bunx vitest run src/modules/site-setting/__tests__/site-setting.schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add library-be/src/db/schema.ts library-be/src/modules/site-setting/__tests__/site-setting.schema.test.ts
git commit -m "feat(db): add site_settings schema with jsonb value support"
```

---

### Task 2: Backend Site Setting Service, Controller, Routes & Tests

**Files:**
- Create: `library-be/src/modules/site-setting/site-setting.constants.ts`
- Create: `library-be/src/modules/site-setting/service/site-setting.service.ts`
- Create: `library-be/src/modules/site-setting/controller/site-setting.controller.ts`
- Create: `library-be/src/modules/site-setting/site-setting.route.ts`
- Modify: `library-be/src/index.ts` (mendaftarkan route `/api/site-settings`)
- Test: `library-be/src/modules/site-setting/__tests__/site-setting.service.test.ts`
- Test: `library-be/src/modules/site-setting/__tests__/site-setting.route.test.ts`

**Interfaces:**
- Produces:
  - `SiteSettingService.getAllSettings(): Promise<AllSiteSettings>`
  - `SiteSettingService.getSettingByKey(key: string): Promise<Record<string, any>>`
  - `SiteSettingService.updateSetting(key: string, value: Record<string, any>, userId?: string): Promise<any>`
  - Route: `GET /api/site-settings` (Public)
  - Route: `GET /api/site-settings/:key` (Public)
  - Route: `PUT /api/site-settings/:key` (Protected: `requireAuth`, `requirePermission("cms", "canEdit")`)

- [ ] **Step 1: Write the failing unit tests for SiteSettingService**

```ts
// library-be/src/modules/site-setting/__tests__/site-setting.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SiteSettingService } from "../service/site-setting.service";
import { DEFAULT_SITE_SETTINGS } from "../site-setting.constants";

describe("SiteSettingService", () => {
  it("mengembalikan default settings jika tabel kosong", async () => {
    const result = await SiteSettingService.getAllSettings();
    expect(result.branding.siteTitle).toBe(DEFAULT_SITE_SETTINGS.branding.siteTitle);
    expect(result.banner.badgeText).toBe(DEFAULT_SITE_SETTINGS.banner.badgeText);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/KERJAAN/library-umc/library-be && bunx vitest run src/modules/site-setting/__tests__/site-setting.service.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement constants, service, controller, and route**

1. Tulis `DEFAULT_SITE_SETTINGS` di `site-setting.constants.ts` mencakup `branding`, `banner`, `hero`, `location`, dan `footer`.
2. Tulis `SiteSettingService` dengan operasi Drizzle ORM upsert (on conflict do update).
3. Tulis `SiteSettingController` dan `siteSettingRoute`.
4. Pasang `app.route("/api/site-settings", siteSettingRoute)` di `library-be/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/KERJAAN/library-umc/library-be && bunx vitest run src/modules/site-setting/__tests__/site-setting.service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add library-be/src/modules/site-setting/ library-be/src/index.ts
git commit -m "feat(api): implement site-setting service, controller, and routes"
```

---

### Task 3: RBAC Constants & Permissions Matrix Integration for `cms`

**Files:**
- Modify: `library-be/src/modules/role/role.constants.ts`
- Modify: `library-fe/src/components/dashboard/RolePermissionsManager.tsx`
- Test: `library-be/src/modules/role/__tests__/role.constants.test.ts`

**Interfaces:**
- Consumes: `SIDEBAR_MENUS` dari `role.constants.ts`
- Produces: Modul `"cms"` terdaftar dengan label `"Manajemen Konten (CMS)"` di grup `"Pengaturan & Audit"`.

- [ ] **Step 1: Write test for role.constants.ts**

Pastikan menu dengan `key === "cms"` ada di dalam `SIDEBAR_MENUS`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/KERJAAN/library-umc/library-be && bunx vitest run src/modules/role/__tests__/role.constants.test.ts`
Expected: FAIL

- [ ] **Step 3: Add `cms` menu in `role.constants.ts` and update `RolePermissionsManager.tsx`**

Tambahkan item menu `cms` ke `SIDEBAR_MENUS` di backend. Di frontend `RolePermissionsManager.tsx`, pastikan baris `cms` hanya mengaktifkan switch `canView` dan `canEdit` (menonaktifkan `canAdd` dan `canDelete` karena data bertipe singleton).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/KERJAAN/library-umc/library-be && bunx vitest run src/modules/role/__tests__/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add library-be/src/modules/role/role.constants.ts library-fe/src/components/dashboard/RolePermissionsManager.tsx
git commit -m "feat(rbac): register cms menu into sidebar constants and permission matrix"
```

---

### Task 4: Frontend API Client & Global `useSiteSettings` Hook

**Files:**
- Create: `library-fe/src/api/siteSettingApi.ts`
- Create: `library-fe/src/hooks/useSiteSettings.ts`
- Modify: `library-fe/src/api/client.ts` (export `siteSettingApi`)
- Test: `library-fe/src/hooks/__tests__/useSiteSettings.test.ts`

**Interfaces:**
- Produces:
  - `siteSettingApi.getAll(): Promise<{ success: boolean; data: AllSiteSettings }>`
  - `siteSettingApi.update(key: string, value: any): Promise<{ success: boolean; message: string }>`
  - Hook: `useSiteSettings()` mengembalikan `{ settings, loading, error, refetch, updateSetting }`

- [ ] **Step 1: Write test for `useSiteSettings` hook**

Verifikasi bahwa hook mengembalikan default fallback saat memuat dan memperbarui state ketika data API diterima.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/KERJAAN/library-umc/library-fe && bunx vitest run src/hooks/__tests__/useSiteSettings.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `siteSettingApi` and `useSiteSettings`**

1. Tulis fungsi HTTP fetcher ke `/api/site-settings` dan `PUT /api/site-settings/:key`.
2. Tulis hook React `useSiteSettings` dengan state lokal dan efek injeksi DOM otomatis ke `document.title` dan favicon `<link rel="icon">`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/KERJAAN/library-umc/library-fe && bunx vitest run src/hooks/__tests__/useSiteSettings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add library-fe/src/api/siteSettingApi.ts library-fe/src/hooks/useSiteSettings.ts library-fe/src/api/client.ts
git commit -m "feat(fe): add siteSettingApi and useSiteSettings hook with automatic DOM injection"
```

---

### Task 5: Frontend Admin CMS Management UI (`CmsSection.tsx`)

**Files:**
- Create: `library-fe/src/components/dashboard/CmsSection.tsx`
- Modify: `library-fe/src/pages/dashboard/SuperAdminDashboard.tsx`
- Test: `library-fe/src/components/dashboard/__tests__/CmsSection.test.tsx`

**Interfaces:**
- Consumes: `useSiteSettings()`, `useRolePermissions()`, `useToast()`
- Produces: Komponen `CmsSection` dengan 4 tab:
  1. *Branding & Pengumuman*
  2. *Hero Section & Quick Search*
  3. *Info Lokasi & Google Maps*
  4. *Footer & Ekosistem Kampus*
  - Tombol simpan per-kunci atau simpan serentak dengan toast notifikasi sukses.

- [ ] **Step 1: Write test for `CmsSection`**

Verifikasi rendering form 4 tab, perubahan input teks, dan pemanggilan `updateSetting` saat tombol simpan ditekan.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /d/KERJAAN/library-umc/library-fe && bunx vitest run src/components/dashboard/__tests__/CmsSection.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement `CmsSection.tsx` and integrate into `SuperAdminDashboard.tsx`**

1. Bangun form tabbed menggunakan komponen Tailwind UI/shadcn tanpa em-dash (Anti-Slop compliant).
2. Tambahkan `{ key: "cms", label: "Manajemen Konten (CMS)", icon: Globe, group: "Pengaturan & Audit" }` ke `MENU_CONFIG` di `SuperAdminDashboard.tsx`.
3. Tambahkan `case "cms": return <CmsSection />;` di `renderSection()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /d/KERJAAN/library-umc/library-fe && bunx vitest run src/components/dashboard/__tests__/CmsSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add library-fe/src/components/dashboard/CmsSection.tsx library-fe/src/pages/dashboard/SuperAdminDashboard.tsx
git commit -m "feat(dashboard): add CmsSection management panel with 4-tab controls"
```

---

### Task 6: Public Page Dynamic Integration & Verification

**Files:**
- Modify: `library-fe/src/App.tsx` (injeksi title & favicon global)
- Modify: `library-fe/src/components/ui/navbar.tsx` (konsumsi banner dari `useSiteSettings`)
- Modify: `library-fe/src/pages/Home.tsx` (konsumsi hero title, subtitle, bgImage, quick chips)
- Modify: `library-fe/src/pages/TentangPage.tsx` (konsumsi gmaps embed, direct url, info gedung)
- Modify: `library-fe/src/components/Footer.tsx` (konsumsi medsos, kampus, link lembaga)
- Test: `library-fe/src/components/blocks/__tests__/BannerAnnouncementSticky.test.tsx`
- Test: Vitest Full Suite FE & BE

- [ ] **Step 1: Update public components to consume `useSiteSettings`**

1. Di `App.tsx`: pasang hook `useSiteSettings()` di level root sehingga title & favicon langsung aktif saat user membuka situs.
2. Di `navbar.tsx`: oper props `settings.banner` ke `<BannerAnnouncementSticky />`.
3. Di `Home.tsx`: gunakan `settings.hero.title`, `settings.hero.subtitle`, dan `settings.hero.quickChips`.
4. Di `TentangPage.tsx`: gunakan `settings.location.embedUrl`, `settings.location.directUrl`, dan kontak.
5. Di `Footer.tsx`: gunakan `settings.footer.socialMedia`, `settings.footer.campuses`, dan `settings.footer.campusLinks`.

- [ ] **Step 2: Run all backend tests**

Run: `cd /d/KERJAAN/library-umc/library-be && bun run test`
Expected: All test suites PASS (0 failures)

- [ ] **Step 3: Run all frontend tests**

Run: `cd /d/KERJAAN/library-umc/library-fe && bun run test`
Expected: All test suites PASS (0 failures)

- [ ] **Step 4: Verify production builds**

Run: `cd /d/KERJAAN/library-umc/library-be && bun run build`
Run: `cd /d/KERJAAN/library-umc/library-fe && bun run build`
Expected: Exit code 0 for both builds.

- [ ] **Step 5: Commit**

```bash
git add library-fe/src/App.tsx library-fe/src/components/ui/navbar.tsx library-fe/src/pages/Home.tsx library-fe/src/pages/TentangPage.tsx library-fe/src/components/Footer.tsx
git commit -m "feat(landing): connect public pages to dynamic site settings"
```
