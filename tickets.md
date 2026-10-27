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
