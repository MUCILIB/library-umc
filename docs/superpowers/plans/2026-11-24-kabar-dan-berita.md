# Fitur Kabar & Berita Perpustakaan (News & Announcements) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul publikasi Berita & Pengumuman Perpustakaan (*Kabar & Berita*) lengkap dari backend database, penyimpanan gambar S3 terkonfigurasi, CMS editor teks terstruktur kaya gaya Word di Dashboard Admin, hingga halaman publik Berita dan Berita Detail serta seksi Berita Terbaru di Beranda.

**Architecture:** 
1. Database: Tabel PostgreSQL `news` menggunakan Drizzle ORM dengan enum kategori (`pengumuman`, `agenda`, `kegiatan`, `layanan`, `literasi`) dan status publikasi (`draft`, `published`, `archived`).
2. Media Storage: Memanfaatkan `StorageService` S3 yang sudah terkonfigurasi pada proyek (`newsStorageService` subfolder `news`) untuk upload cover image dan gambar artikel, dengan fallback disk lokal dan endpoint streaming aset aman.
3. CMS Admin: Submenu `cms-news` ("Kabar & Berita") di dalam grup navigasi CMS Dashboard Super Admin, dilengkapi komponen Rich Text Editor Word-like WYSIWYG untuk format teks (bold, italic, underline, strike, headings, bullet/numbered list, quote, align, image insert, link) dan manajemen draft/publikasi.
4. Publik: Komponen Berita Terbaru di `Home.tsx`, Halaman Indeks `/berita` dengan filter kategori & pencarian, serta Halaman Baca Detail `/berita/:slug` berformat tipografi akademik yang rapi dan responsif.

**Tech Stack:** Node.js, Express/Hono, Drizzle ORM, PostgreSQL, AWS S3 Client (`@aws-sdk/client-s3`), React 19, Vite, Tailwind CSS v4, Lucide React, Vitest.

---

## Global Constraints

- **Storage Constraint:** WAJIB menggunakan S3 yang sudah terkonfigurasi di proyek (`newsStorageService`), DILARANG menggunakan Cloudinary.
- **Frontend Compatibility:** React 19 (`^19.2.5`), Tailwind CSS v4, Vite. Rich Text Editor harus native/bebas konflik peer dependency React 18.
- **Anti-Slop:** Gunakan bahasa Indonesia baku dan profesional perpustakaan akademik (UMC). Jangan gunakan karakter em-dash (`—`), gunakan tanda kurung atau strip tunggal `-`.
- **RBAC & Security:** Endpoint modifikasi berita (`POST`, `PUT`, `DELETE`, `upload`) wajib diproteksi auth middleware session dan verifikasi role (`super_admin`, `staff`).
- **TDD & Verification:** Setiap modul backend dan frontend wajib memiliki pengujian otomatis (unit/integration test) dan lulus build produksi `tsc -b && vite build`.

---

## Review Focus

1. **Storage Integrity:** Unggahan gambar cover berita ke S3 harus menyimpan key dengan format `library/news/...` dan dapat diakses publik melalui endpoint proxy atau url storage tanpa CORS block.
2. **Slug Uniqueness:** Jika admin membuat judul berita yang sama, slug otomatis ditambahkan sufiks angka acak unik agar tidak terjadi collision database error.
3. **Draft Isolation:** Berita berstatus `draft` atau `archived` tidak boleh tampil di halaman publik (`/`, `/berita`, `/berita/:slug`), hanya boleh diakses oleh admin/staf di CMS.
4. **Rich Text Sanitation & Safe Rendering:** Konten HTML artikel harus dirender secara aman dengan sanitasi elemen berbahaya tanpa merusak formatting teks, heading, atau link.
5. **View Counter Concurrency:** Kunjungan pembaca pada `/berita/:slug` menambah counter `views` secara atomik di database tanpa memperlambat waktu respon pembaca.

---

### Task 1: Database Schema & Storage Service for News

**Files:**
- Modify: `library-be/src/db/schema.ts`
- Modify: `library-be/src/modules/repository/service/storage.service.ts`
- Modify: `library-be/src/index.ts`
- Test: `library-be/src/modules/news/__tests__/news.schema.test.ts`

**Interfaces:**
- `newsCategoryEnum`: `'pengumuman' | 'agenda' | 'kegiatan' | 'layanan' | 'literasi'`
- `newsStatusEnum`: `'draft' | 'published' | 'archived'`
- `news` table: `id` (uuid PK), `title` (varchar 255), `slug` (varchar 255 unique), `category` (newsCategoryEnum), `excerpt` (text), `content` (text), `coverImage` (varchar 500), `status` (newsStatusEnum), `views` (integer default 0), `authorId` (text references users.id), `publishedAt` (timestamp), `createdAt` (timestamp), `updatedAt` (timestamp).
- `newsStorageService`: `StorageService("news")`.

- [ ] **Step 1: Write the failing schema test**
- [ ] **Step 2: Add news table & enums to `library-be/src/db/schema.ts`**
- [ ] **Step 3: Export `newsStorageService` in `storage.service.ts`**
- [ ] **Step 4: Ensure `news` table creation query in `library-be/src/index.ts`**
- [ ] **Step 5: Run tests and verify they pass**

---

### Task 2: Backend News Module (Validation, Service, Controller, Routes)

**Files:**
- Create: `library-be/src/modules/news/news.types.ts`
- Create: `library-be/src/modules/news/news.validation.ts`
- Create: `library-be/src/modules/news/service/news.service.ts`
- Create: `library-be/src/modules/news/controller/news.controller.ts`
- Create: `library-be/src/modules/news/route/news.route.ts`
- Modify: `library-be/src/routes/index.ts`
- Test: `library-be/src/modules/news/__tests__/news.service.test.ts`
- Test: `library-be/src/modules/news/__tests__/news.route.test.ts`

**Endpoints:**
- `GET /api/news`: List published news (public with search, category, pagination). Admin can pass `status=all`.
- `GET /api/news/recent`: List latest 3-5 published news for landing page.
- `GET /api/news/:slug`: Detail berita by slug (increments view count for public).
- `GET /api/news/assets/:filename`: Stream cover/article image from S3 storage.
- `POST /api/news/upload`: Upload cover image / article image to S3 (authenticated staff/admin).
- `POST /api/news`: Create news article (authenticated staff/admin).
- `PUT /api/news/:id`: Update news article (authenticated staff/admin).
- `DELETE /api/news/:id`: Delete news article (authenticated staff/admin).

- [ ] **Step 1: Write the failing service and route unit tests**
- [ ] **Step 2: Implement validation schema using Zod**
- [ ] **Step 3: Implement NewsService with slug generator and CRUD**
- [ ] **Step 4: Implement NewsController with S3 image upload handler**
- [ ] **Step 5: Define routes and register in `routes/index.ts`**
- [ ] **Step 6: Run tests and verify they pass**

---

### Task 3: Admin CMS Submenu & Navigation Integration

**Files:**
- Modify: `library-fe/src/pages/dashboard/SuperAdminDashboard.tsx`
- Modify: `library-fe/src/pages/dashboard/__tests__/SuperAdminDashboardNavigation.test.tsx`

**Scope:**
- Register `cms-news` in `CmsSubMenuKey` and `CMS_SUB_ITEMS` with label "Kabar & Berita" and icon `Newspaper`.
- Update navigation unit tests expecting 5 items in CMS sub-menu.
- Render `NewsManagementSection` when `activeMenu === "cms-news"`.

- [ ] **Step 1: Update navigation tests for `cms-news`**
- [ ] **Step 2: Add `cms-news` to `CMS_SUB_ITEMS` and `CmsSubMenuKey`**
- [ ] **Step 3: Run navigation unit tests and verify they pass**

---

### Task 4: Rich Text Editor Component (Word-like WYSIWYG)

**Files:**
- Create: `library-fe/src/components/ui/RichTextEditor.tsx`
- Test: `library-fe/src/components/ui/__tests__/RichTextEditor.test.tsx`

**Features:**
- Toolbar buttons:
  - Font Styling: Bold, Italic, Underline, Strikethrough
  - Headings: Normal text, Heading 1 (`H1`), Heading 2 (`H2`), Heading 3 (`H3`)
  - Alignment: Left, Center, Right, Justify
  - Lists: Bullet list (`UL`), Numbered list (`OL`)
  - Quotes: Blockquote
  - Insert: Link insert dialog, Image insert (direct upload to S3 or URL)
  - History: Undo, Redo, Clear Formatting
- Word counter & character counter indicator
- Dark & Light mode compatibility

- [ ] **Step 1: Write unit test for `RichTextEditor`**
- [ ] **Step 2: Implement `RichTextEditor.tsx` component**
- [ ] **Step 3: Run tests and verify formatting actions trigger correctly**

---

### Task 5: Admin News Management Section (`NewsManagementSection.tsx`)

**Files:**
- Create: `library-fe/src/pages/dashboard/components/NewsManagementSection.tsx`
- Test: `library-fe/src/pages/dashboard/components/__tests__/NewsManagementSection.test.tsx`

**Features:**
- Header with search, category filter, status tabs ("Semua", "Terbit", "Draft"), and button "+ Tambah Berita".
- Table view with columns: Cover, Judul & Kategori, Status (badge), Penulis, Dilihat, Tanggal, Aksi (Edit, Hapus, Toggle Status Publikasi).
- Dialog Modal for Create & Edit:
  - Cover Image Dropzone/Uploader (direct preview and S3 upload).
  - Title input with automatic slug generation.
  - Category selector (`Pengumuman`, `Agenda`, `Kegiatan`, `Layanan`, `Literasi`).
  - Status selector (`Draft`, `Published`).
  - Ringkasan / Excerpt input.
  - RichTextEditor for full content.
  - Save & Cancel buttons with loading state.

- [ ] **Step 1: Write unit tests for `NewsManagementSection`**
- [ ] **Step 2: Implement `NewsManagementSection.tsx`**
- [ ] **Step 3: Wire into `SuperAdminDashboard.tsx` content view**
- [ ] **Step 4: Run tests and verify they pass**

---

### Task 6: Frontend News API Client & Public News Pages

**Files:**
- Create: `library-fe/src/services/newsService.ts`
- Create: `library-fe/src/components/LatestNewsSection.tsx`
- Create: `library-fe/src/pages/BeritaPage.tsx`
- Create: `library-fe/src/pages/BeritaDetailPage.tsx`
- Modify: `library-fe/src/pages/Home.tsx`
- Modify: `library-fe/src/components/ui/navbar.tsx`
- Modify: `library-fe/src/routes/index.tsx`
- Test: `library-fe/src/pages/__tests__/BeritaPage.test.tsx`

**Scope:**
- `newsService.ts`: API client functions (`getNewsList`, `getRecentNews`, `getNewsBySlug`, `createNews`, `updateNews`, `deleteNews`, `uploadNewsImage`).
- `LatestNewsSection.tsx`: Clean card grid on landing page showing latest 3 published articles with "Lihat Semua Berita" link.
- `BeritaPage.tsx` (`/berita`): Hero title, search input, category filter buttons, responsive card grid, pagination.
- `BeritaDetailPage.tsx` (`/berita/:slug`): Breadcrumbs, headline, author, date, views counter, cover image, formatted article content, share buttons, sidebar for latest/related news.
- Navbar: Add "Berita" link (`/berita`) in desktop and mobile menus.
- Routes: Register `/berita` and `/berita/:slug`.

- [ ] **Step 1: Implement `newsService.ts`**
- [ ] **Step 2: Implement `LatestNewsSection.tsx` and embed in `Home.tsx`**
- [ ] **Step 3: Implement `BeritaPage.tsx` and `BeritaDetailPage.tsx`**
- [ ] **Step 4: Register routes in `routes/index.tsx` and nav item in `navbar.tsx`**
- [ ] **Step 5: Write and run tests for public news pages**

---

### Task 7: Full Verification & Quality Assurance

- [ ] **Step 1: Run all backend tests (`npm.cmd test` in `library-be`)**
- [ ] **Step 2: Run all frontend tests (`npm.cmd test` in `library-fe`)**
- [ ] **Step 3: Run production build check (`npm.cmd run build` in `library-fe`)**
- [ ] **Step 4: Verify S3 upload integration and database table existence**
