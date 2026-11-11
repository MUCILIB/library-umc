# Repositori Redesign & Anti-Slop Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the UMC digital repository into a high-craft academic research repository at `/repositori`, removing fake data slop, upgrading route architecture, and integrating dynamic official UMC faculties and study programs.

**Architecture:** Refactor `EResoucePage.tsx` into a modern, accessible `RepositoriPage.tsx` at route `/repositori`, setting `/e-resource` as a permanent redirect. Clean fake statistical metrics (modulo views/downloads) in favor of real student metadata, wire dynamic academic filters against the live backend, and implement clean semantic states.

**Tech Stack:** React 19, TypeScript, React Router v7, TailwindCSS v4, Radix UI Primitives, Lucide Icons, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-repositori-redesign-design.md`

## Global Constraints

- Rute kanonikal: `/repositori`. Akses ke `/e-resource` harus redirect ke `/repositori` via `<Navigate replace />`.
- Larangan em dash (`—`) pada seluruh teks antarmuka (R-02).
- Larangan data statistik palsu tanpa sumber nyata (R-17 & R-36): hapus rumus views/downloads acak.
- Seluruh elemen kontrol interaktif harus berfungsi nyata, termasuk tombol submit form pencarian (R-26 & R-39).
- Kontras teks wajib memenuhi standar WCAG AA (R-25).
- Tiga state antarmuka (Loading, Empty, Error) wajib tersedia (R-27).
- Dials Liveliness: ENERGY 1 / RHYTHM 2 / MOTION 1 (R-37).

## Review Focus

1. **Redirect Backward Compatibility**: Akses ke `/e-resource` harus mengarahkan pengguna ke `/repositori` tanpa loop atau blank screen.
2. **Filtering Resiliency**: Filter kombinasi (Pencarian teks + Kategori + Fakultas + Rentang Tahun) tidak boleh melempar runtime exception saat data naskah kosong.
3. **Faculty & Program Alignment**: Pemilihan fakultas harus secara konsisten membatasi opsi prodi hanya untuk yang terdaftar di fakultas tersebut.
4. **Form Keyboard Accessibility**: Menekan tombol `Enter` pada input pencarian harus memicu eksekusi filter form secara konsisten.
5. **No Slop Numbers in DOM**: Elemen kartu naskah tidak boleh me-render teks atau ikon views/downloads buatan.

---

### Task 1: Route & Navigation Alignment

**Files:**
- Create: `library-fe/src/pages/RepositoriPage.tsx` (inisiasi awal dari wrapper/komponen)
- Modify: `library-fe/src/routes/index.tsx`
- Modify: `library-fe/src/components/ui/navbar.tsx`
- Modify: `library-fe/src/pages/Home.tsx`
- Modify: `library-fe/src/pages/RepositoryDetailPage.tsx`
- Test: `library-fe/src/routes/__tests__/repositori-route.test.tsx`

**Interfaces:**
- Produces: `RepositoriPage` default export component mounted at `/repositori`.
- Redirect: `/e-resource` -> `<Navigate to="/repositori" replace />`.

- [ ] **Step 1: Write the failing test for `/repositori` and `/e-resource` routing**
  Buat test yang memverifikasi bahwa:
  1. Akses rute `/repositori` merender heading repositori mahasiswa.
  2. Akses rute `/e-resource` ter-redirect ke `/repositori`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test -- library-fe/src/routes/__tests__/repositori-route.test.tsx --run`
  Expected: FAIL (route /repositori belum mengarah ke RepositoriPage atau RepositoriPage belum dibuat).
- [ ] **Step 3: Setup `RepositoriPage.tsx` and configure routes & navbar**
  - Buat `RepositoriPage.tsx`.
  - Daftarkan `<Route path="/repositori" element={<NonAdminRoute><RepositoriPage /></NonAdminRoute>} />` di `routes/index.tsx`.
  - Atur redirect `<Route path="/e-resource" element={<Navigate to="/repositori" replace />} />`.
  - Perbarui navbar: `{ name: "Repositori", href: "/repositori" }` dan cek `location.pathname.startsWith("/repositori")`.
  - Sesuaikan tautan kembali di `RepositoryDetailPage.tsx` dan CTA di `Home.tsx`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test -- library-fe/src/routes/__tests__/repositori-route.test.tsx --run`
  Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add library-fe/src/pages/RepositoriPage.tsx library-fe/src/routes/index.tsx library-fe/src/components/ui/navbar.tsx library-fe/src/pages/Home.tsx library-fe/src/pages/RepositoryDetailPage.tsx library-fe/src/routes/__tests__/repositori-route.test.tsx
  git commit -m "feat(routes): establish /repositori canonical route and update navigation"
  ```

---

### Task 2: Academic Search Header & Dynamic Master Filtering

**Files:**
- Modify: `library-fe/src/pages/RepositoriPage.tsx`
- Test: `library-fe/src/pages/__tests__/RepositoriPage.test.tsx`

**Interfaces:**
- Consumes: `repositoryService.getPublishedProposals()`, `facultyApi.list()`.
- Produces: Search form with scope dropdown, 7 official faculties filter, dynamic study program mapping, year range filter, and active filter chips with removal buttons.

- [ ] **Step 1: Write the failing test for search bar & filter controls**
  Buat test di `library-fe/src/pages/__tests__/RepositoriPage.test.tsx` untuk:
  - Form pencarian dengan tombol submit aktif.
  - Dropdown fakultas yang merender daftar fakultas resmi.
  - Reset button yang mengembalikan semua input filter ke kondisi awal.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test -- library-fe/src/pages/__tests__/RepositoriPage.test.tsx --run`
  Expected: FAIL.
- [ ] **Step 3: Implement clean Academic Search Header & dynamic filter sidebar**
  - Buat header berlatar bersih dengan `<h1>Repositori Karya Ilmiah Mahasiswa</h1>`.
  - Bungkus input pencarian di dalam tag semantik `<form onSubmit={handleSearchSubmit}>`.
  - Integrasikan pengambilan data 7 Fakultas & Prodi dari `facultyApi.list()`.
  - Tambahkan filter tahun naskah dan filter kategori naskah terstruktur.
  - Tambahkan chip filter aktif yang interaktif (dapat di-dismiss satu per satu).
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test -- library-fe/src/pages/__tests__/RepositoriPage.test.tsx --run`
  Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add library-fe/src/pages/RepositoriPage.tsx library-fe/src/pages/__tests__/RepositoriPage.test.tsx
  git commit -m "feat(repositori): add clean academic search header and dynamic faculty filters"
  ```

---

### Task 3: Anti-Slop Paper Cards & Metadata Integrity

**Files:**
- Modify: `library-fe/src/pages/RepositoriPage.tsx`
- Test: `library-fe/src/pages/__tests__/RepositoriPage.test.tsx`

**Interfaces:**
- Produces: Clean academic cards displaying Real Author Name, NIM, Study Program, Faculty, Publication Date, Verified Librarian Badge, PDF File Size, Registration Number, Abstract excerpt, and Action button to `/repository/:id`.
- Enforces: 0 fake views or downloads rendered in the card.

- [ ] **Step 1: Write the failing test for paper cards and absence of fake stats**
  - Pastikan test memeriksa keberadaan metadata riil: Nama Penulis, NIM, Fakultas, Prodi, Badge Terverifikasi.
  - Asersi bahwa teks atau ikon views/downloads acak TIDAK ada dalam elemen kartu.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test -- library-fe/src/pages/__tests__/RepositoriPage.test.tsx --run`
  Expected: FAIL.
- [ ] **Step 3: Implement clean paper cards adhering to Anti-Slop standards**
  - Hapus formula acak modulo `140 + ...` dan `380 + ...`.
  - Susun kartu naskah dengan hierarki visual terarah (Judul H3 tebal dengan tautan ke detail, identitas penulis & NIM dengan font mono, tag kategori netral, badge terverifikasi pustakawan).
  - Tampilkan cuplikan abstrak 3 baris (`line-clamp-3`).
  - Tombol aksi jelas: *"Lihat Abstrak & Naskah"* menuju `/repository/:id`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test -- library-fe/src/pages/__tests__/RepositoriPage.test.tsx --run`
  Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add library-fe/src/pages/RepositoriPage.tsx library-fe/src/pages/__tests__/RepositoriPage.test.tsx
  git commit -m "feat(repositori): craft anti-slop academic paper cards with verifiable metadata"
  ```

---

### Task 4: Complete UI States (Loading Skeleton, Empty State & Error Recovery)

**Files:**
- Modify: `library-fe/src/pages/RepositoriPage.tsx`
- Test: `library-fe/src/pages/__tests__/RepositoriPage.test.tsx`

**Interfaces:**
- Enforces R-27: Loading state with card skeletons, Empty state with search reset action, and Error state with retry action.

- [ ] **Step 1: Write the failing test for all 3 UI states**
  - Test loading skeleton render saat state `loading: true`.
  - Test empty state saat filter tidak menghasilkan data (menampilkan pesan informatif dan tombol reset).
  - Test error state saat request API gagal (menampilkan tombol coba lagi).
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test -- library-fe/src/pages/__tests__/RepositoriPage.test.tsx --run`
  Expected: FAIL.
- [ ] **Step 3: Implement loading skeleton, empty state, and error recovery**
  - Tambahkan skeleton placeholder kartu naskah.
  - Buat komponen empty state yang bersih dengan tombol *"Reset Semua Filter"*.
  - Buat komponen error state dengan tombol *"Coba Lagi"* yang memicu refetch data.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test -- library-fe/src/pages/__tests__/RepositoriPage.test.tsx --run`
  Expected: PASS.
- [ ] **Step 5: Commit**
  ```bash
  git add library-fe/src/pages/RepositoriPage.tsx library-fe/src/pages/__tests__/RepositoriPage.test.tsx
  git commit -m "feat(repositori): implement complete loading skeleton, empty, and error states"
  ```

---

### Task 5: Cleanup Stale Files & Comprehensive Verification

**Files:**
- Delete: `library-fe/src/pages/EResoucePage.tsx`
- Modify: Any lingering imports
- Test: Full frontend test suite (`npm run test -- --run`) and TypeScript check (`npx tsc -b`)

- [ ] **Step 1: Remove stale `EResoucePage.tsx` file**
  - Hapus berkas lama `library-fe/src/pages/EResoucePage.tsx` setelah seluruh fungsionalitas dipindahkan ke `RepositoriPage.tsx`.
- [ ] **Step 2: Run typecheck and full test suite**
  Run: `cd library-fe && npx tsc -b && npm run test -- --run`
  Expected: 0 type errors, 100% tests passing.
- [ ] **Step 3: Commit and push**
  ```bash
  git add -A
  git commit -m "refactor(repositori): remove deprecated EResoucePage and finalize /repositori refactoring"
  ```
