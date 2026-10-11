# PRD & Technical Specification: MUCILIB (library-umc)
## Initiatives: Resilient Batch Import Pipeline & Thesis/Proposal Digital Repository with Page-Level PDF ACL

**Author:** Rizqi Noor Fauzan / Lead System Architect  
**Project:** MUCILIB (`library-umc`)  
**Backend Stack:** Node.js, Express.js v5, TypeScript, Drizzle ORM, PostgreSQL  
**Frontend Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI  
**Target Completion:** Q4 2026  

---

## 1. Executive Summary & Problem Statements

### 1.1 Initiative A: Resilient Batch Import Engine
* **Kondisi Eksisting:**
  - File upload CSV disimpan seluruhnya ke memori/database metadata (`metadata.fileContent`) sebagai raw string (`stripBom(fileContent).split("\n")`).
  - Ketika admin mengunggah file CSV besar (> 1.000 s/d puluhan ribu baris seperti `senayan_biblio_export.csv`), terjadi **Heap Memory Exhaustion (OOM)** atau **HTTP Timeout (504 Gateway Timeout)** karena parsing dan validasi berjalan sinkron di thread utama Express.
  - Jika terjadi error pada row tertentu saat commit/approval, tidak ada isolasi transaksional per batch atau retry otomatis, sehingga seluruh proses import terhenti secara ambigu.
* **Solusi Arsitektur:**
  - Streaming File Ingestion via filesystem (`multer.diskStorage`) tanpa menyimpan string utuh di JSON metadata.
  - Job Queue / Worker Pipeline (Asynchronous Background Job) dengan DB-backed Staging queue atau BullMQ/Worker Threads.
  - Chunked Transaction Processing (50-100 rows per DB transaction batch) dengan partial commit and detailed error logging per row number.

### 1.2 Initiative B: Thesis & Proposal Repository with Dynamic PDF Page ACL
* **Kondisi Eksisting:**
  - Belum ada modul repositori terintegrasi untuk mahasiswa mengunggah draf skripsi/proposal penelitian.
  - Pustakawan dan Admin harus memeriksa dan memverifikasi dokumen secara manual di luar sistem.
  - Belum ada proteksi hak cipta dokumen: jika file PDF diunggah ke storage publik, publik dapat mengunduh seluruh isi skripsi termasuk bab pembahasan dan data mentah.
* **Solusi Arsitektur:**
  - Portal Mahasiswa untuk mandiri upload proposal/skripsi lengkap dengan metadata (Judul, Penulis/NIM otomatis dari sesi auth, Pembimbing, Abstrak, Program Studi).
  - Alur Maker-Checker: Mahasiswa Submit $\rightarrow$ Notifikasi In-App & Email ke Admin $\rightarrow$ Admin Review di Sidebar Dashboard $\rightarrow$ Approve atau Reject/Kembalikan dengan Catatan Revisi $\rightarrow$ Notifikasi Email & In-App ke Mahasiswa.
  - **Dynamic Page-Level PDF ACL**: Super Admin/Pustakawan mengonfigurasi batasan halaman (misal: Halaman 1–7 untuk Public / Tanpa Login, Halaman Penuh untuk Mahasiswa/Dosen login). File master PDF disimpan di storage privat; server memotong (*slice/stream*) halaman secara on-the-fly via `pdf-lib` tanpa mengekspos link file mentah.

---

## 2. Database Schema Design (Drizzle ORM & PostgreSQL)

### 2.1 Table: `import_batches` & `import_batch_jobs` (Refinement)
Penyempurnaan skema `import_batches` yang sudah ada di `schema.ts`:
```typescript
// Refinement pada importBatches:
// 1. Ubah filePath menjadi mandatory disk storage path.
// 2. Hilangkan ketergantungan metadata.fileContent (menghindari OOM).
// 3. Tambahkan field progress & error report path.
```

### 2.2 Table: `repository_proposals`
```typescript
export const repositoryProposals = pgTable("repository_proposals", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalNumber: varchar("proposal_number", { length: 50 }).notNull().unique(), // PROP-2026-XXXX
  title: text("title").notNull(),
  abstract: text("abstract"),
  keywords: text("keywords").array(),
  authorUserId: text("author_user_id").notNull().references(() => Users.id),
  authorNim: varchar("author_nim", { length: 30 }).notNull(),
  authorName: varchar("author_name", { length: 150 }).notNull(),
  studyProgramId: uuid("study_program_id").references(() => studyPrograms.id),
  advisorName1: varchar("advisor_name_1", { length: 150 }).notNull(),
  advisorName2: varchar("advisor_name_2", { length: 150 }),
  documentCategory: varchar("document_category", { length: 50 }).default("PROPOSAL"), // PROPOSAL, THESIS, REPORT
  status: varchar("status", { length: 30 }).notNull().default("SUBMITTED"), // SUBMITTED, UNDER_REVIEW, REVISION_REQUIRED, APPROVED, ARCHIVED
  storagePath: text("storage_path").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  fileHashSha256: varchar("file_hash_sha256", { length: 64 }).notNull(),
  reviewerUserId: text("reviewer_user_id").references(() => Users.id),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  authorIdx: index("repo_prop_author_idx").on(table.authorUserId),
  statusIdx: index("repo_prop_status_idx").on(table.status),
  programIdx: index("repo_prop_program_idx").on(table.studyProgramId),
}));
```

### 2.3 Table: `repository_document_page_rules` (Page-Level ACL)
```typescript
export const repositoryDocumentPageRules = pgTable("repository_document_page_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id").notNull().references(() => repositoryProposals.id, { onDelete: "cascade" }),
  roleScope: varchar("role_scope", { length: 30 }).notNull().default("PUBLIC"), // PUBLIC, STUDENT, MEMBER, ALL
  allowedStartPage: integer("allowed_start_page").notNull().default(1),
  allowedEndPage: integer("allowed_end_page").notNull().default(7),
  allowDownloadFull: boolean("allow_download_full").notNull().default(false),
  configuredBy: text("configured_by").notNull().references(() => Users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  propRoleIdx: unique("repo_rule_prop_role_unique").on(table.proposalId, table.roleScope),
}));
```

### 2.4 Table: `proposal_review_logs`
```typescript
export const proposalReviewLogs = pgTable("proposal_review_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  proposalId: uuid("proposal_id").notNull().references(() => repositoryProposals.id, { onDelete: "cascade" }),
  reviewerUserId: text("reviewer_user_id").notNull().references(() => Users.id),
  action: varchar("action", { length: 30 }).notNull(), // SUBMIT, UNDER_REVIEW, APPROVE, REVISION_REQUEST, RESUBMIT
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

---

## 3. High-Level Architecture & Data Flow

```
[ Mahasiswa / User ]
         |
    (1) POST /api/repository/proposals (Upload PDF + Metadata)
         v
[ Repository Service ] ---> Save to Private Storage (/uploads/proposals/)
         |             ---> Calculate Hash & Total Pages (via pdf-lib)
         v
[ Notification Service ] ---> In-App Alert to Admin & Email Receipt
         |
[ Admin / Pustakawan Dashboard ]
         |
    (2) GET /api/repository/proposals (Review & Verify)
    (3) PATCH /api/repository/proposals/:id/review (Approve / Return with Notes)
         |
         +---> If Rejected: Email & In-App Notif ke Mahasiswa (Status: REVISION_REQUIRED)
         +---> If Approved: Mahasiswa Notified & Super Admin Set Page Rules:
                   POST /api/repository/proposals/:id/page-rules
                   (e.g., Public: 1-7, Mahasiswa: Full)
         v
[ Public / Guest Viewer ]  <---> GET /api/repository/proposals/:id/view-pdf
                                      |
                           [ Dynamic PDF Slicing Engine ]
                           (Stream sliced pages 1-7 using pdf-lib)
```

---

## 4. Matt Pocock Tracer-Bullet Tickets (Implementation Graph)

### Dependency Graph:
```
TICKET-01 (Import Disk & Stream Queue)  ------> TICKET-02 (Import Batch Chunk Transaction)
                                                                 
TICKET-03 (Proposal Schema & DB Migration) 
        |
        v
TICKET-04 (Student Proposal Submission API & Storage)
        |
        v
TICKET-05 (Reviewer Hub & Notification Engine)
        |
        v
TICKET-06 (Dynamic PDF Slicing Engine & Page ACL)
        |
        v
TICKET-07 (Frontend Proposal Submission & Verification Portal)
        |
        v
TICKET-08 (Frontend Page-Level ACL Rule Configurator & Public PDF Viewer)
```

---

### TICKET-01: Asynchronous Streaming & Disk-Storage File Ingestion for Batch Import
* **What to build:** Refactor `import.service.ts` upload handler agar menyimpan file ke disk lokal (`/uploads/imports/`) alih-alih me-load seluruh text ke memori `batch.metadata.fileContent`. Tambahkan background worker parsing menggunakan streaming reader (`readline` / `csv-parser`) sehingga mampu memproses file CSV 50.000+ baris tanpa OOM.
* **Blocked by:** None — can start immediately.
* **Acceptance Criteria:**
  - File upload CSV berukuran > 15MB tidak menyebabkan heap spike atau server crash.
  - Status batch bertransisi secara asynchronous: `uploading` $\rightarrow$ `parsing` $\rightarrow$ `validating`.
  - Progress counter (`processedRows`, `totalRows`) ter-update berkala ke database selama streaming.

---

### TICKET-02: Resilient Chunked Database Transactions & Error Isolation
* **What to build:** Implementasikan mekanisme atomic chunk processing (50-100 baris per transaksi) pada `approveBibliographyChunk` dan `approveItemChunk`. Jika 1 baris dalam chunk mengalami integrity error, tangkap error ke tabel `import_errors` dengan nomor baris yang presisi dan izinkan baris valid lainnya tetap tersimpan.
* **Blocked by:** TICKET-01.
* **Acceptance Criteria:**
  - Import 1.000 baris dengan 5 baris korup tetap meng-commit 995 baris valid (`PARTIAL_ERROR` status).
  - Admin dapat men-download file `errors.csv` yang memuat nomor baris, kolom bermasalah, dan pesan error.
  - Endpoint `GET /api/import/batches/:id/progress` mengembalikan persentase dan ETA akurat.

---

### TICKET-03: Repository Proposal & PDF Page Rule Database Schema
* **What to build:** Buat tabel `repository_proposals`, `repository_document_page_rules`, dan `proposal_review_logs` di `src/db/schema.ts`. Eksekusi migrasi Drizzle ORM dan update relasi database.
* **Blocked by:** None — can start immediately.
* **Acceptance Criteria:**
  - Migrasi Drizzle berhasil dieksekusi tanpa breaking changes pada modul existing.
  - Seed dummy proposal data dan default page rules berjalan normal di test database.

---

### TICKET-04: Student Proposal Submission Service & Private Document Storage
* **What to build:** Endpoint `POST /api/repository/proposals` untuk mahasiswa. Mengambil identitas mahasiswa (NIM & Nama) otomatis dari authenticated JWT payload. Menyimpan dokumen PDF di directory terisolasi (`/storage/proposals/`), menghitung SHA-256 file checksum, dan mendeteksi total halaman file PDF menggunakan `pdf-lib`.
* **Blocked by:** TICKET-03.
* **Acceptance Criteria:**
  - Mahasiswa yang login dapat mengunggah file PDF (maksimal 25MB) dengan metadata lengkap.
  - Mencegah duplikasi file yang sama via verifikasi `file_hash_sha256`.
  - Proposal tersimpan dengan status awal `SUBMITTED`.

---

### TICKET-05: Reviewer Verification Hub & Multi-Channel Notification Workflow
* **What to build:** Endpoint review untuk Pustakawan/Admin (`GET /api/repository/proposals`, `PATCH /api/repository/proposals/:id/review`). Memicu notifikasi in-app ke admin saat ada proposal baru, dan notifikasi email via `mailer.ts` (Resend) serta in-app notification ke mahasiswa ketika proposal disetujui (`APPROVED`) atau diminta perbaikan (`REVISION_REQUIRED`).
* **Blocked by:** TICKET-04.
* **Acceptance Criteria:**
  - Pustakawan dapat menyaring pengajuan proposal berdasarkan Program Studi dan Status.
  - Pustakawan dapat memberikan catatan revisi jika proposal tidak valid.
  - Mahasiswa menerima email notifikasi resmi ketika status proposal diperbarui.

---

### TICKET-06: Dynamic On-the-Fly PDF Slicing Engine & Role-Based Access Control
* **What to build:** Service PDF Slicing menggunakan `pdf-lib`. Endpoint `GET /api/repository/proposals/:id/view-pdf` yang memeriksa otentikasi requester. Jika Guest/Public (no login), server mengambil konfigurasi halaman dari `repository_document_page_rules` (misal Halaman 1 s/d 7), memotong PDF secara instan di memori, dan mengalirkan stream PDF terpotong ke response header `Content-Type: application/pdf`. Jika Mahasiswa/Admin login, mengalirkan seluruh halaman dokumen atau sesuai hak aksesnya.
* **Blocked by:** TICKET-03, TICKET-04.
* **Acceptance Criteria:**
  - Public/Guest yang mengakses endpoint hanya menerima PDF berisi Cover s/d Abstrak (Halaman 1–7).
  - Mahasiswa/Admin yang terautentikasi dapat melihat seluruh isi proposal.
  - URL storage fisik asli dokumen PDF tidak pernah diekspos ke klien.

---

### TICKET-07: Frontend Student Proposal Submission & Verification Management Portal
* **What to build:** Halaman antarmuka Frontend pada `library-fe`:
  1. Halaman Mahasiswa: Form upload proposal/skripsi dengan drag-and-drop PDF, indikator progres, dan kartu riwayat status pengajuan.
  2. Halaman Admin/Pustakawan: Menu sidebar baru **Repositori Karya Ilmiah**, tabel verifikasi proposal dengan preview ringkasan, dialog revisi, dan tombol persetujuan.
* **Blocked by:** TICKET-04, TICKET-05.
* **Acceptance Criteria:**
  - Mahasiswa dapat melakukan submit dan melihat catatan revisi dari admin.
  - Admin dapat memfilter, membaca catatan, dan mengubah status pengajuan langsung dari dashboard.

---

### TICKET-08: Frontend Page ACL Configurator & Secure Embedded PDF Viewer
* **What to build:** Antarmuka Super Admin untuk mengatur rentang halaman PDF yang terbuka untuk publik (input `allowed_start_page` & `allowed_end_page`). Serta komponen PDF Viewer interaktif di katalog publik perpustakaan yang menampilkan preview dokumen terpotong dengan aman.
* **Blocked by:** TICKET-06, TICKET-07.
* **Acceptance Criteria:**
  - Super Admin dapat mengubah rentang halaman publik (misal 1-5 atau 1-10) dengan validasi tidak melebihi total halaman PDF.
  - Katalog publik menampilkan preview viewer dengan navigasi halaman sesuai batas ACL yang ditentukan.

---

## 5. Verification & TDD Testing Strategy

1. **Unit Test (`pdf-slicing.service.spec.ts`)**:
   - Memastikan pemotongan halaman 1-7 dari dummy PDF 20 halaman menghasilkan PDF valid dengan tepat 7 halaman.
   - Guard out-of-bounds page range: jika user meminta halaman di luar batas file, kembalikan HTTP 400 Bad Request.
2. **Integration Test (`import-stream.spec.ts`)**:
   - Menjalankan mock upload 5.000 baris CSV. Memastikan memory usage stabil (< 150MB RSS increase) dan data selesai diproses ke DB.
3. **E2E Role Guard Test (`proposal-lifecycle.spec.ts`)**:
   - Mahasiswa login $\rightarrow$ Upload proposal $\rightarrow$ Admin login $\rightarrow$ Return with notes $\rightarrow$ Mahasiswa resubmit $\rightarrow$ Admin approve $\rightarrow$ Public request PDF (verify hanya menerima 7 halaman).
