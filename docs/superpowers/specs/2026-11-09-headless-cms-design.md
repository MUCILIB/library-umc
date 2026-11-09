# Headless CMS & Site Settings Subsystem Specification

**Date:** 2026-11-09  
**Status:** Approved by User  
**Scope:** Architectural Subsystem (Backend Drizzle ORM + REST API + RBAC + Frontend Admin Dashboard + Public Landing Page Integration)

---

## 1. Executive Summary & Goal

Platform MUCILIB (`library-umc`) membutuhkan kapabilitas pengelolaan konten dinamis (*Headless CMS / Site Settings*) yang memungkinkan pengelola perpustakaan (Super Admin / Staf) mengonfigurasi identitas web, pengumuman darurat, konten landing page, dan informasi kampus langsung dari dashboard tanpa perlu mengubah kode sumber atau melakukan build ulang.

### Tujuan Utama
1. **Identitas & SEO Dinamis**: Kontrol judul tab browser (`<title>`), tagline, favicon (`<link rel="icon">`), logo resmi, dan meta deskripsi.
2. **Sticky Announcement Banner**: Kontrol siaran pengumuman di atas navbar dengan toggle ON/OFF, teks badge, pesan, link aksi, dan opsi dismiss.
3. **Hero Section & Quick Search**: Kontrol judul H1, subjudul, foto latar belakang, tag pencarian cepat (*chips*), dan 4 kartu layanan pintas.
4. **Info Lokasi & Google Maps**: Kontrol tautan embed iframe peta digital, direct navigation link, jam operasional, dan kontak resmi.
5. **Footer & Ekosistem Kampus**: Kontrol motto universitas, media sosial resmi, alamat 3 kampus UMC, dan link lembaga kampus.
6. **Integrasi RBAC Penuh**: Terdaftar sebagai modul `"cms"` di matriks hak akses (*Role & Permissions*) dengan hak granular `canView` dan `canEdit`.

---

## 2. Arsitektur Sistem

```
+-----------------------------------------------------------------------------------+
|                                 BROWSER CLIENTS                                   |
|                                                                                   |
|  +---------------------------+            +------------------------------------+  |
|  |   Halaman Publik MUCILIB  |            |     Dashboard Admin MUCILIB        |  |
|  | (Home, Navbar, Footer,    |            | (SuperAdminDashboard ->            |  |
|  |  TentangPage, Helmet/DOM) |            |  CmsSection [4 Tabs UI])           |  |
|  +-------------+-------------+            +-----------------+------------------+  |
+----------------|--------------------------------------------|---------------------+
                 | GET /api/site-settings                     | PUT /api/site-settings/:key
                 | (Public, in-memory cache)                  | (Auth + requirePermission)
                 v                                            v
+-----------------------------------------------------------------------------------+
|                                BACKEND (Hono / Node.js)                           |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | SiteSettingRoute   |-->| SiteSettingController |-->| SiteSettingService     |  |
|  +--------------------+   +-----------------------+   +-----------+------------+  |
|                                                                   |               |
|                                                                   v               |
|                                                     +--------------------------+  |
|                                                     | Drizzle ORM              |  |
|                                                     | (pgTable: site_settings) |  |
|                                                     +-------------+------------+  |
+-------------------------------------------------------------------|---------------+
                                                                    v
                                                     +--------------------------+
                                                     | PostgreSQL Database      |
                                                     | Table: `site_settings`   |
                                                     +--------------------------+
```

---

## 3. Skema Database (Drizzle ORM)

Menggunakan tabel generik pasangan kunci-nilai (*key-value with JSONB*) di `library-be/src/db/schema.ts` untuk memastikan fleksibilitas data tanpa migrasi DDL berulang.

### Definisi Tabel: `site_settings`
```ts
export const siteSettings = pgTable("site_settings", {
  key: varchar("key", { length: 100 }).primaryKey(), // "branding", "banner", "hero", "footer", "location"
  value: jsonb("value").notNull(),                   // Payload data JSON terstruktur
  description: text("description"),                  // Keterangan pengaturan
  updatedBy: varchar("updated_by", { length: 50 }).references(() => Users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Struktur Payload JSON per Kunci (`value`)

#### 1. Key: `"branding"`
```json
{
  "siteTitle": "Perpustakaan Universitas Muhammadiyah Cirebon",
  "siteTagline": "Portal Riset & Sumber Belajar Digital",
  "faviconUrl": "/favicon.ico",
  "logoUrl": "/assets/logo_umc.png",
  "metaDescription": "Layanan perpustakaan digital resmi Universitas Muhammadiyah Cirebon."
}
```

#### 2. Key: `"banner"`
```json
{
  "isActive": true,
  "badgeText": "PENGUMUMAN",
  "message": "Layanan repositori digital dan peminjaman buku fisik kini dapat diakses secara mandiri.",
  "linkText": "Lihat Katalog",
  "linkUrl": "/katalog",
  "dismissible": true
}
```

#### 3. Key: `"hero"`
```json
{
  "title": "Perpustakaan Universitas Muhammadiyah Cirebon",
  "subtitle": "Akses Koleksi buku, jurnal, dan e-book resmi UMC",
  "backgroundImage": "/assets/bg1-BOtzP3_E.jpeg",
  "searchPlaceholder": "Cari judul, penulis, ISBN...",
  "quickChips": ["Pemrograman", "Manajemen", "Algoritma", "Jurnal", "Kesehatan"]
}
```

#### 4. Key: `"location"`
```json
{
  "embedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.395781358931!2d108.53075257577555!3d-6.721464593274536!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6ee2629e46a789%3A0xc0051b439c29c878!2sUniversitas%20Muhammadiyah%20Cirebon!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid",
  "directUrl": "https://maps.app.goo.gl/UMCirebon",
  "building": "Gedung Perpustakaan Pusat Kampus 1, Lantai 2",
  "operationalHours": "Senin - Jumat: 08.00 - 16.00 WIB | Sabtu: 08.00 - 12.00 WIB",
  "phone": "+62 231 209608",
  "email": "perpustakaan@umc.ac.id"
}
```

#### 5. Key: `"footer"`
```json
{
  "motto": "Unggul, Islami, Mandiri & Profesional",
  "socialMedia": {
    "facebook": "https://facebook.com/umcirebon",
    "instagram": "https://instagram.com/perpustakaan_umc",
    "twitter": "https://twitter.com/umcirebon",
    "youtube": "https://youtube.com/@umctv",
    "whatsapp": "https://wa.me/6281234567890"
  },
  "campuses": [
    {
      "name": "Kampus 1 (Pusat)",
      "address": "Jl. Tuparev No. 70, Cirebon 45153",
      "phone": "(0231) 209608"
    },
    {
      "name": "Kampus 2 (Watubelah)",
      "address": "Jl. Fatahillah - Watubelah, Kab. Cirebon",
      "phone": "(0231) 204276"
    },
    {
      "name": "Kampus 3 (Kedawung)",
      "address": "Jl. Tuparev No. 111, Cirebon",
      "phone": "(0231) 209610"
    }
  ],
  "campusLinks": [
    { "title": "LPM UMC", "url": "https://lpm.umc.ac.id" },
    { "title": "LPPM UMC", "url": "https://lppm.umc.ac.id" },
    { "title": "LPAIK UMC", "url": "https://lpaik.umc.ac.id" },
    { "title": "Kantor Urusan Internasional (KUI)", "url": "https://kui.umc.ac.id" },
    { "title": "Career Development Center (CDC)", "url": "https://cdc.umc.ac.id" }
  ]
}
```

---

## 4. API Endpoints & Kontrak Data

### A. Endpoint Publik: Ambil Seluruh Pengaturan
* **Method & Path**: `GET /api/site-settings`
* **Akses**: Publik (tanpa autentikasi)
* **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "branding": { ... },
    "banner": { ... },
    "hero": { ... },
    "location": { ... },
    "footer": { ... }
  }
}
```
* **Fallback Otomatis**: Jika database belum memiliki entri kunci tertentu, backend mengembalikan default fallback terstruktur tanpa error 404/500.

### B. Endpoint Terproteksi: Ambil Pengaturan Spesifik
* **Method & Path**: `GET /api/site-settings/:key`
* **Akses**: Publik / Admin
* **Response `200 OK`**: Mengembalikan objek nilai kunci terkait.

### C. Endpoint Terproteksi: Update Pengaturan Spesifik
* **Method & Path**: `PUT /api/site-settings/:key`
* **Akses**: Terproteksi (`requireAuth` + `requirePermission("cms", "canEdit")`)
* **Request Body**:
```json
{
  "value": { ... }
}
```
* **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Pengaturan cms berhasil diperbarui",
  "data": {
    "key": "banner",
    "value": { ... },
    "updatedAt": "2026-11-09T09:45:00.000Z"
  }
}
```
* **Audit Trail**: Mencatat aktivitas mutasi ke tabel `logs` dengan `action: "UPDATE_SITE_SETTING"`.

---

## 5. Integrasi RBAC & Matriks Hak Akses

1. **Konstanta Sistem (`role.constants.ts`)**:
   Menambahkan `cms` ke daftar `SIDEBAR_MENUS`:
   ```ts
   {
     key: "cms",
     label: "Manajemen Konten (CMS)",
     group: "Pengaturan & Audit",
     description: "Kelola banner pengumuman, favicon, identitas web, hero section, footer, dan peta lokasi",
   }
   ```
2. **Matriks Hak Akses (`RolePermissionsManager.tsx`)**:
   * Menampilkan baris **"Manajemen Konten (CMS)"** dalam grup *"Pengaturan & Audit"*.
   * Tindakan yang didukung: `canView` dan `canEdit`.
   * `canAdd` dan `canDelete` dinonaktifkan (`disabled`) karena data bersifat konfigurasi *singleton*.
3. **Guard Role Default**:
   * `super_admin`: Otomatis memiliki akses penuh (`canView: true`, `canEdit: true`).
   * `staff`: Dikonfigurasi dinamis sesuai kebijakan perpustakaan.

---

## 6. Antarmuka Frontend Admin (`CmsSection.tsx`)

Ditempatkan di `library-fe/src/components/dashboard/CmsSection.tsx` dan dipanggil di `SuperAdminDashboard.tsx`.

### Desain Layout & 4 Tab:
* **Header**: Judul modul *"Manajemen Konten (CMS)"*, tombol *"Simpan Perubahan"*, dan indikator status sinkronisasi.
* **Tab Navigasi (Segmented Control)**:
  1. **Tab 1: Identitas & Banner**:
     * Input teks judul web (`siteTitle`), tagline (`siteTagline`), dan meta deskripsi.
     * Upload/URL Favicon dan Logo.
     * Switch Toggle: Banner Pengumuman ON/OFF.
     * Input Badge Pengumuman, Pesan Siaran, Teks Tombol CTA, dan URL Tautan CTA.
     * Switch Dismissible.
  2. **Tab 2: Hero Section**:
     * Input Judul Utama (H1) dan Subjudul Hero.
     * URL / Upload foto latar belakang Hero.
     * Tag Management: Menambah/menghapus chip kata kunci pencarian cepat.
  3. **Tab 3: Info Peta & Lokasi**:
     * Input link iframe Google Maps Embed dan link navigasi aplikasi Google Maps.
     * Nama gedung, lantai, dan jam layanan operasional.
     * Kontak telepon dan email resmi perpustakaan.
  4. **Tab 4: Footer & Ekosistem**:
     * Motto universitas.
     * Form tautan media sosial (Instagram, Facebook, X, YouTube, WhatsApp).
     * Form alamat 3 kampus UMC (Kampus 1, Kampus 2, Kampus 3).
     * Form tautan portal ekosistem kampus (LPM, LPPM, KUI, CDC).

---

## 7. Integrasi Halaman Publik

1. **Hook Global (`useSiteSettings.ts`)**:
   * Mengambil pengaturan dari `/api/site-settings` sekali saat aplikasi dibuka, menyimpannya di memory state, dan menyediakan fallback bawaan jika offline/loading.
2. **Tab Browser & Favicon (`App.tsx` / `useSiteSettings`)**:
   * Mengubah `document.title` sesuai `siteTitle` dan `siteTagline`.
   * Mengubah elemen `<link rel="icon" href="...">` sesuai `faviconUrl`.
3. **Banner Pengumuman (`Navbar.tsx`)**:
   * `<BannerAnnouncementSticky isActive={settings.banner.isActive} ... />`
4. **Hero Landing Page (`Home.tsx`)**:
   * Menampilkan judul, subjudul, dan background image dari `settings.hero`.
   * Menampilkan tag pencarian dinamis dari `settings.hero.quickChips`.
5. **Halaman Info Peta (`TentangPage.tsx`)**:
   * Iframe embed dan detail jam buka mengonsumsi data `settings.location`.
6. **Footer (`Footer.tsx`)**:
   * Mengonsumsi medsos, alamat 3 kampus, dan link lembaga dari `settings.footer`.

---

## 8. Rencana Verifikasi & Uji Mutu

1. **Backend Testing (Vitest)**:
   * Test `SiteSettingService`: Verifikasi get all, get key dengan fallback, upsert key, dan validasi schema.
   * Test `SiteSettingRoute`: Verifikasi endpoint `GET /api/site-settings` tanpa auth (200), `PUT /api/site-settings/:key` tanpa auth (401), dan `PUT /api/site-settings/:key` dengan izin yang benar (200).
2. **Frontend Testing (Vitest)**:
   * Test `CmsSection.test.tsx`: Verifikasi rendering form tiap tab, interaksi input, dan aksi submit save.
   * Test `useSiteSettings.test.ts`: Verifikasi pembacaan API dan penanganan fallback.
3. **Typecheck & Build**:
   * Backend: `bun run build` / `tsc --noEmit` lulus tanpa error tipe.
   * Frontend: `tsc -b && vite build` lulus tanpa error tipe.
4. **Audit Standar Anti-Slop**:
   * Bebas karakter em-dash pada copywriting teks dan form.
   * Validasi kontras warna WCAG AA dan penanganan responsif mobile.
