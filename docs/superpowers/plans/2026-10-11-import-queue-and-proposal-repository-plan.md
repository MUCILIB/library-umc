# Implementation Plan: Batch Import Queue & Proposal Repository with Page-Level PDF ACL

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun pipeline antrean import data batch yang tangguh (streaming & asynchronous) serta sistem repositori proposal/skripsi mahasiswa dengan alur persetujuan pustakawan, notifikasi multi-channel, dan proteksi hak cipta berbasis pembatasan halaman PDF dinamis (Page-Level Dynamic ACL).

**Architecture:** 
- **Initiative A (Import):** Streaming ingestion via disk storage, chunked Drizzle ORM transactions (50-100 rows), serta isolasi error per baris ke `import_errors` untuk mencegah OOM dan timeout pada file besar.
- **Initiative B (Repository & PDF ACL):** Model relasional `repository_proposals` + `repository_document_page_rules`, private storage backend, notifikasi via In-App DB dan Resend Email (`mailer.ts`), serta streaming slice PDF on-the-fly via `pdf-lib` tanpa mengekspos file master asli.

**Tech Stack:** Express.js v5, TypeScript, Drizzle ORM, PostgreSQL, pdf-lib, Multer, Next.js (App Router), Tailwind CSS, Lucide Icons, Shadcn UI.  
**Spec:** `docs/superpowers/specs/2026-10-11-import-queue-and-proposal-repository-prd.md`

---

## Global Constraints
- Express.js v5 route and middleware standard.
- Drizzle ORM PostgreSQL type-safety; no raw unescaped SQL.
- File master PDF disimpan di direktori privat (DILARANG static serve direct URL).
- PDF Slicing WAJIB on-the-fly menggunakan buffer / stream `pdf-lib`.
- Role guard: Mahasiswa (`STUDENT`), Pustakawan/Admin (`ADMIN`), Super Admin (`SUPER_ADMIN`), dan Pengunjung Publik (`PUBLIC/GUEST`).

---

## Review Focus
1. **Memory Leak pada PDF Slicing Concurrent:** Beban heap jika 50 user simultan meminta preview PDF bersamaan -> batasi buffer di memori & destroy stream.
2. **Page Range Out-of-Bounds:** Jika Super Admin mengeset halaman 1-15 pada dokumen yang hanya memiliki 8 halaman -> fallback otomatis ke `Math.min(rule.allowedEndPage, doc.getPageCount())`.
3. **Partial Import Row Rollback:** Jika row 42 dalam chunk 1-50 gagal constraint unique -> jangan rollback row 1-41; isolasi row 42 dan log error.
4. **MIME & Magic Bytes Sniffing:** Verifikasi file proposal adalah PDF valid via binary magic bytes (`%PDF-`), bukan sekadar ekstensi nama file.
5. **Unauthorized Full-Document Exfiltration:** Endpoint `view-pdf` harus secara ketat memverifikasi session token sebelum memberikan akses melebihi batas publik.

---

### Task 1: Database Migration - Repository & Page ACL Tables

**Files:**
- Modify: `library-be/src/db/schema.ts`
- Test: `library-be/src/modules/repository/__tests__/schema.spec.ts`

- [ ] **Step 1: Write schema test for repository models**
- [ ] **Step 2: Define `repositoryProposals`, `repositoryDocumentPageRules`, dan `proposalReviewLogs` di `schema.ts`**
- [ ] **Step 3: Run drizzle migration / generate schema**
- [ ] **Step 4: Commit**
```bash
git add library-be/src/db/schema.ts
git commit -m "feat(db): add repository proposals and page-level pdf acl schema"
```

---

### Task 2: Core PDF Slicing Engine (`pdf-lib`)

**Files:**
- Create: `library-be/src/modules/repository/service/pdf-slicing.service.ts`
- Test: `library-be/src/modules/repository/__tests__/pdf-slicing.service.spec.ts`

- [ ] **Step 1: Write unit test testing slicing range 1-7 from 20-page sample PDF**
- [ ] **Step 2: Implement `slicePdf(inputBuffer: Buffer, startPage: number, endPage: number): Promise<Buffer>`**
- [ ] **Step 3: Add guard for out-of-bounds page range**
- [ ] **Step 4: Run unit tests and verify passing**
- [ ] **Step 5: Commit**
```bash
git add library-be/src/modules/repository/service/pdf-slicing.service.ts
git commit -m "feat(repository): implement dynamic pdf slicing engine with page bounds guard"
```

---

### Task 3: Proposal Submission & Storage Handler

**Files:**
- Create: `library-be/src/modules/repository/controller/proposal.controller.ts`
- Create: `library-be/src/modules/repository/service/proposal.service.ts`
- Create: `library-be/src/modules/repository/route/proposal.route.ts`
- Modify: `library-be/src/index.ts` (register route `/api/repository`)

- [ ] **Step 1: Write integration test for student upload proposal endpoint**
- [ ] **Step 2: Implement Multer diskStorage with SHA-256 calculation and page count extraction**
- [ ] **Step 3: Implement `createProposal` service method with duplicate hash detection**
- [ ] **Step 4: Run test and ensure 201 Created on valid upload**
- [ ] **Step 5: Commit**
```bash
git add library-be/src/modules/repository/
git commit -m "feat(repository): add proposal upload endpoint with sha256 checksum and page detection"
```

---

### Task 4: Librarian Review Workflow & Multi-Channel Notification

**Files:**
- Modify: `library-be/src/modules/repository/service/proposal.service.ts`
- Modify: `library-be/src/modules/repository/controller/proposal.controller.ts`
- Modify: `library-be/src/config/mailer.ts`

- [ ] **Step 1: Write tests for review state transitions (`SUBMITTED` -> `APPROVED` / `REVISION_REQUIRED`)**
- [ ] **Step 2: Implement review endpoint (`PATCH /api/repository/proposals/:id/review`)**
- [ ] **Step 3: Wire mailer & in-app notification trigger on status change**
- [ ] **Step 4: Verify test passes**
- [ ] **Step 5: Commit**
```bash
git add library-be/src/modules/repository/
git commit -m "feat(repository): implement review workflow with in-app and email notification"
```

---

### Task 5: Dynamic Page-Level PDF Delivery Endpoint

**Files:**
- Modify: `library-be/src/modules/repository/controller/proposal.controller.ts`
- Modify: `library-be/src/modules/repository/route/proposal.route.ts`

- [ ] **Step 1: Write test verifying guest requester receives only pages 1-7, while admin/student gets full pages**
- [ ] **Step 2: Implement `viewPdf` handler with role detection & dynamic slicing stream**
- [ ] **Step 3: Implement Super Admin page rule configuration endpoint (`POST /api/repository/proposals/:id/page-rules`)**
- [ ] **Step 4: Test end-to-end streaming output**
- [ ] **Step 5: Commit**
```bash
git add library-be/src/modules/repository/
git commit -m "feat(repository): add role-based dynamic pdf delivery endpoint"
```

---

### Task 6: Resilient Batch Import Engine Refactor (Streaming & Chunking)

**Files:**
- Modify: `library-be/src/modules/import/service/import.service.ts`
- Modify: `library-be/src/modules/import/controller/import.controller.ts`
- Test: `library-be/src/modules/import/__tests__/import-resilience.spec.ts`

- [ ] **Step 1: Write test for streaming large CSV file without metadata memory buffer**
- [ ] **Step 2: Refactor file upload handler to write directly to disk storage**
- [ ] **Step 3: Implement chunked atomic commit (50 rows per batch) with row-level error isolation**
- [ ] **Step 4: Verify large CSV import succeeds with memory under 150MB**
- [ ] **Step 5: Commit**
```bash
git add library-be/src/modules/import/
git commit -m "refactor(import): implement streaming parser and chunked error-resilient db commit"
```
