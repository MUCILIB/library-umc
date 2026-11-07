# Tickets: E-Book Management & Reader Platform

A modular implementation of digital book (E-Book) cataloging, S3 storage, PDF slicing/streaming, and in-browser reading for Perpustakaan UMC. Reference spec: `docs/specs/ebook-management-and-reader.md`.

Work the **frontier**: any ticket whose blockers are all done.

---

## Ticket 1: Schema & Backend Service for E-Book Metadata & Content

**What to build:**
Schema enhancement on `bibliography_contents` table in Drizzle ORM and backend service `EbookService` with Zod validation to handle storing e-book metadata and digital content references.

**Blocked by:** None - can start immediately.

- [x] Update Drizzle schema (`bibliography_contents`) with columns: `fileSize`, `pageCount`, `isFullAccess`, `previewStartPage`, `previewEndPage`, `allowDownload`.
- [x] Create `EbookValidation` (Zod schemas for create, update, and query filters).
- [x] Implement `EbookService` CRUD methods in `library-be/src/modules/ebook`.
- [x] Write unit tests for schema validation and CRUD logic.

---

## Ticket 2: S3 Upload & PDF Streaming with Dynamic Page Slicing

**What to build:**
Secure file upload to S3 Dahono and streaming endpoint with dynamic page slicing (`pdf-lib`) so guest users receive only preview pages when limited access is enabled, while authenticated UMC members receive full access.

**Blocked by:** Ticket 1: Schema & Backend Service for E-Book Metadata & Content.

- [x] Implement S3 upload handler for E-Book PDFs with automatic page count detection using `pdf-lib`.
- [x] Implement `GET /api/ebooks/:id/stream` endpoint with token/session check:
  - If user is authenticated civitas UMC -> stream full PDF.
  - If user is guest and `isFullAccess === true` -> stream full PDF.
  - If user is guest and `isFullAccess === false` -> slice PDF buffer to `[previewStartPage, previewEndPage]` and stream sliced PDF.
- [x] Set security headers: `Content-Type: application/pdf`, `Content-Disposition: inline`, cache control.
- [x] Write integration test for PDF streaming and slicing scenarios.

---

## Ticket 3: Super Admin "E-Book" Dashboard Management UI

**What to build:**
Dedicated "E-Book" menu in `SuperAdminDashboard.tsx` sidebar under "Manajemen Koleksi" with full management table and form modal to upload PDF, fill book metadata, and toggle full access vs preview page slicing.

**Blocked by:** Ticket 2: S3 Upload & PDF Streaming with Dynamic Page Slicing.

- [x] Add `{ key: "ebooks", label: "E-Book", icon: Tablet, group: "Manajemen Koleksi" }` in `SuperAdminDashboard.tsx`.
- [x] Build `EbookSection.tsx` component with:
  - Table of registered e-books with cover, title, author, total pages, and access status badge.
  - "Tambah E-Book" modal with form fields: Title, Author, Publisher, Year, Category, Description, Cover Image upload.
  - PDF file dropzone with upload progress.
  - Access Mode switch: "Akses Penuh" vs "Pratinjau Terbatas" (with start page & end page inputs).
- [x] Connect form submission to backend endpoints with toast notifications.
- [x] Provide edit and delete actions with confirmation dialogs.

---

## Ticket 4: Public Catalog & Landing Page Reader Experience

**What to build:**
Seamless visitor and student reading experience on the public portal: seamless browsing in `/katalog` and `/`, dedicated "Baca E-Book" action on `/katalog/:id`, and integrated `SecurePdfViewer` reader modal.

**Blocked by:** Ticket 2: S3 Upload & PDF Streaming with Dynamic Page Slicing.

- [x] Update `KatalogDetail.tsx`:
  - When `type === "ebook"`, hide physical copy barcodes and shelf location table.
  - Replace "Pinjam Buku Fisik" with primary "Baca E-Book" button.
  - Display e-book specs (Format: PDF, Jumlah Halaman, Status Akses: Penuh / Pratinjau).
- [x] Integrate `EbookReaderModal.tsx` as a reader modal or clean viewer overlay:
  - Stream directly from `/api/ebooks/:id/stream`.
  - Disable right click, print, and direct download if `allowDownload === false`.
  - If guest reaches the end of sliced preview, display friendly callout to login.
- [x] Ensure `/katalog` "E-Book" tab filter and `HomeBookList` render e-book cards with consistent badges.

---

## Ticket 5: E2E Integration, Verification, and Git Sync

**What to build:**
Complete manual and automated verification across the whole vertical stack (Admin upload -> Public catalog -> Secure reader streaming), clean code verification, and git synchronization.

**Blocked by:** Ticket 3: Super Admin "E-Book" Dashboard Management UI, Ticket 4: Public Catalog & Landing Page Reader Experience.

- [x] Run backend typecheck and tests.
- [x] Run frontend typecheck and build validation.
- [x] Verify complete workflow in browser/test suite.
- [x] Clean up temporary files, review git diff, and sync commits cleanly.

---

# Tickets: Security Hardening (Cloudflare Security Audit)

Implementation of security findings identified during Cloudflare & OWASP audit across MUCILIB (`library-umc`).

---

## Ticket SEC-1: E-Book Magic Bytes & CSV Formula Injection Sanitization (SEC-07 & SEC-04)

**What to build:**
Strengthen boundary validation for file uploads and tabular exports. Fix inverted boolean check (`&&` -> `||`) on PDF MIME type and magic bytes in `ebook.service.ts`. Prefix spreadsheet formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with single quote (`'`) in `export.service.ts` to neutralize CSV Injection / DDE attacks.

**Blocked by:** None (frontier - can start immediately).

- [x] Fix magic bytes validation condition in `ebook.service.ts` (lines 67, 351).
- [x] Add formula character escaping in `escapeCsvField` in `export.service.ts`.
- [x] Add unit test assertions in export and ebook test suites.
- [x] Run backend tests to verify green baseline.

---

## Ticket SEC-2: Targeted Rate Limiting & Auth Route Hardening (SEC-03 & SEC-05)

**What to build:**
Shield authentication and visitor counter routes from brute-force and resource exhaustion. Attach `authLimiter` to sensitive Better-Auth paths (`/api/auth/sign-in/*`, `/api/auth/sign-up/*`, `/api/auth/forget-password`). Attach dedicated limiter on guest check-in routes (`/guests/scan`, `/guests/non-member`, `/guests/absensi`). Remove noisy ad-hoc script regex from global express body middleware.

**Blocked by:** None (frontier - can start immediately).

- [x] Attach `authLimiter` to Better-Auth authentication endpoints in `library-be/src/index.ts`.
- [x] Define and apply `guestLimiter` for public guest check-in routes in `library-be/src/modules/guest/route/guest.route.ts`.
- [x] Clean up redundant ad-hoc regex mutation from `index.ts`.
- [x] Verify test suite runs clean.

---

## Ticket SEC-3: Production Security Headers via Helmet (SEC-06)

**What to build:**
Install and configure `helmet` middleware in `library-be/src/index.ts`. Strip `X-Powered-By: Express`, enforce `X-Content-Type-Options: nosniff`, and configure frameguard/CSP rules compatible with Swagger UI and embedded frontend PDF readers.

**Blocked by:** Ticket SEC-2.

- [x] Install `helmet` and `@types/helmet` in `library-be`.
- [x] Register `helmet` middleware in `library-be/src/index.ts` with cross-origin & frame settings compatible with client iframe/blob viewers and Swagger.
- [x] Disable `app.disable("x-powered-by")`.
- [x] Verify test suite and server startup.

---

## Ticket SEC-4: PDF Streaming Hardening & Ephemeral Stream Ticket (SEC-01)

**What to build:**
Deprecate passing full master JWT session tokens in URL query parameter `?token=...`. Introduce ephemeral, short-lived (60-second) scoped tickets for PDF streaming and direct downloads, preventing token leakage in browser history, HTTP referrers, and proxy logs.

**Blocked by:** Ticket SEC-3.

- [x] Implement short-lived streaming ticket generator and validator in `library-be`.
- [x] Update proposal and ebook streaming controllers to accept stream tickets.
- [x] Update frontend viewers (`SecurePdfViewer.tsx`, `EbookReaderModal.tsx`) to request a stream ticket or use authenticated blob fetch.
- [x] Deprecate master bearer token extraction from `req.query.token`.
- [x] Run backend and frontend typechecks and test suites.

---

# Milestone: Post-Presentation Revisions & Enhancement (Tickets REV-1 to REV-7)

Work the **frontier**: any ticket whose blockers are all done.

---

## Ticket REV-1: Quick Fixes & UI Alignment
- Bug 404 Route Eksemplar
- Judul Buku Export Laporan
- Validasi Fleksibel ISBN/ISSN
- Rename Card Denda
- Klasifikasi DDC di Detail Buku
- Social Media di Halaman Tentang

**What to build:**
Resolve quick presentation bugs and baseline UI alignments:
1. Fix 404 navigation for item exemplars by syncing `SuperAdminDashboard` menu state with URL query search params (`?tab=items` / `?menu=items`) and declaring route aliases `/items`, `/exemplar`, and `/eksemplar` in `routes/index.tsx`.
2. Fix missing book title in loan & fines report exports by correcting the relation in `report.controller.ts` from `item.collection.title` to `item.bibliography.title`.
3. Relax ISBN validation in Zod schema and frontend forms to accept arbitrary digit lengths (>= 4 characters, including 6-digit legacy book numbers). Ensure both ISBN and ISSN are 100% optional.
4. Rename card "Pendapatan Denda Bulanan" and related labels to "Denda" / "Denda Bulanan" in `ReportsSection.tsx`.
5. Display the DDC classification badge in the public book detail view (`KatalogDetail.tsx`).
6. Add official social media links (Instagram, etc.) in `TentangPage.tsx` and footer.

**Blocked by:** None - can start immediately.

- [x] Sync `SuperAdminDashboard` `activeMenu` state with URL search params (`?tab=...`) and add route aliases `/items`, `/exemplar` redirecting to `/dashboard/super-admin?tab=items`.
- [x] Fix book title relation in `library-be/src/modules/report/controller/report.controller.ts`.
- [x] Update `createBibliographySchema` and update schemas in `library-be/src/modules/bibliography/validation/bibliography.validation.ts` so ISBN accepts lengths >= 4 digits, and both ISBN & ISSN are optional.
- [x] Rename "Pendapatan Denda Bulanan" to "Denda Bulanan" in `library-fe/src/components/dashboard/ReportsSection.tsx`.
- [x] Add classification display in `library-fe/src/pages/KatalogDetail.tsx`.
- [x] Add social media channels in `library-fe/src/pages/TentangPage.tsx`.
- [x] Verify test suite and typechecks pass.

---

## Ticket REV-2: Pola Kode Buku, Generator Eksemplar Berjenjang & Standarisasi No. Inventaris

**What to build:**
Implement hierarchical, parent-based auto-generation for item exemplars. If a book has pattern `PND-01`, its exemplars automatically sequence as `PND-01-01`, `PND-01-02`, etc. Add guidance tooltips/examples on book pattern formats. Standardize all frontend and backend occurrences of `inventoryCode` to "No. Inventaris".

**Blocked by:** Ticket REV-1.

- [x] Enhance `itemService.generateItemCode` in `library-be` to inspect the bibliography's callNumber/code pattern and produce sequential hierarchical codes (`<PATTERN>-01`, `<PATTERN>-02`).
- [x] Add guide cards with concrete pattern examples (e.g. `PND-01`, `TI-2026-05`, `UMC-B-102`) in the bibliography and item creation forms in `library-fe`.
- [x] Standardize field labels and table headers from `inventoryCode` / "Kode Inventarisasi" to "No. Inventaris" across all components.
- [x] Verify item creation and automated code tests.

---

## Ticket REV-3: Import SLiMS (Senayan CSV Parser) & Dialog Delimiter Export CSV

**What to build:**
Harden the CSV import parser to seamlessly process SLiMS (Senayan Library Management System) export files. Support semicolon delimiter, quotes containing commas or newlines, angle-bracket multi-value tags (`<author>`, `<topic>`, `<item_code>`), and auto-upsert master relations. Provide a delimiter choice dialog (semicolon vs comma) on CSV export.

**Blocked by:** Ticket REV-2.

- [x] Implement robust CSV parser in `library-be/src/modules/import/service/import.service.ts` supporting RFC 4180 quotes, semicolons, and SLiMS multi-value angle tags.
- [x] Add auto-upsert fallback for missing publishers, languages, places, GMDs, and locations during import.
- [x] Add delimiter selection modal dialog (Semicolon `;` vs Comma `,`) in `ExportSection.tsx`.
- [x] Ensure UTF-8 BOM (`\uFEFF`) is prepended to CSV export streams for Excel compatibility.
- [x] Test import against real files `senayan_biblio_export (2).csv` and `senayan_item_export_kloter 5.csv`.

---

## Ticket REV-4: Filter Lanjutan Export Koleksi per Fakultas & Prodi (Output PDF & CSV)

**What to build:**
Add advanced filtering to the Collection Export feature, allowing librarians or department heads (e.g. Pendidikan Matematika) to export only their department's books and exemplars. Support both formatted, printable official UMC PDF reports and raw CSV.

**Blocked by:** Ticket REV-3.

- [x] Add filter query parameters (`facultyId`, `studyProgramId`, `withItems`) to export endpoints in `library-be`.
- [x] Implement printable PDF generation for filtered collections with official UMC library header and structured tabular layout.
- [x] Add filter tab & selector UI in `library-fe/src/components/dashboard/ExportSection.tsx`.
- [x] Test PDF and CSV outputs with faculty/study program filters.

---

## Ticket REV-5: Alur Pengembalian Buku 2 Arah (Halaman Berita Acara, Digital Signature Pad & Tanda Terima Sah Member)

**What to build:**
Implement a complete two-way return verification workflow. Create a dedicated confirmation page (`/dashboard/return-confirmation/:loanId`) where the librarian verifies physical book condition, confirms their name (e.g. "Roni"), and provides a digital signature via an interactive signature pad. In member profile, show an authenticated return stamp badge and a printable digital receipt with librarian's signature.

**Blocked by:** Ticket REV-1.

- [x] Extend loan schema/migration in `library-be` to store `returnStaffName`, `returnStaffSignature` (base64 image data URL), `returnCondition`, and `returnedAt`.
- [x] Create dedicated verification page `/dashboard/return-confirmation/:loanId` in `library-fe` with responsive HTML5 canvas signature pad and condition checklist.
- [x] Update return approval action in `ReturnApprovalsSection.tsx` to link to the new confirmation page.
- [x] Create member-facing digital return receipt modal / print view in `RiwayatPeminjaman.tsx` with official UMC stamp and librarian signature.
- [x] Add automated tests for return verification endpoint and signature payload handling.

---

## Ticket REV-6: Fitur Pengajuan & Persetujuan Perpanjangan Kartu Anggota (Card Renewal)

**What to build:**
Enable library members to request a membership card extension (renewal) from their profile when approaching expiration or expired. Provide an admin review interface in `CardApprovalsSection` to approve renewals and automatically extend member card validity.

**Blocked by:** Ticket REV-1.

- [x] Add membership card renewal status and expiry tracking in member schema/service in `library-be`.
- [x] Add "Ajukan Perpanjangan Kartu" button in `library-fe/src/pages/Profile.tsx` when card expires or is within 30 days of expiry.
- [x] Add renewal tab and approval actions in `library-fe/src/components/dashboard/CardApprovalsSection.tsx`.
- [x] Write tests covering renewal request and approval workflows.

---

## Ticket REV-7: Dynamic Roles & Sub-Menu Permission Matrix (RBAC dengan UI Switch Toggle)

**What to build:**
Establish dynamic role-based access control. Allow super admins to create custom roles while keeping system roles (`super_admin`, `staff`, `student`, `lecturer`) locked. Provide an interactive permissions matrix in the admin dashboard featuring responsive switch toggles for each sidebar sub-menu across four capability pillars: View, Add, Edit, and Delete.

**Blocked by:** Ticket REV-1.

- [x] Create database tables `roles` and `role_permissions` in `library-be` with Drizzle ORM migration.
- [x] Build backend CRUD API for roles and bulk permission matrix updates (`/api/roles`, `/api/roles/:id/permissions`).
- [x] Build "Kelola Role & Hak Akses" tab in `library-fe/src/components/dashboard/UsersSection.tsx` with switch toggles per sidebar menu.
- [x] Enforce frontend sidebar menu visibility and CRUD action buttons according to the authenticated user's permissions.
- [x] Enforce backend middleware authorization against dynamic permissions.
- [x] Verify test suite and typechecks pass.


