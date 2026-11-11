# Rencana Implementasi: Perbaikan Mobile PDF Viewer & Input Kuantitas Bulk Item

> **Untuk Agentic Worker:** Gunakan alur kerja TDD dan verifikasi bertahap. Pastikan setiap langkah dieksekusi secara native, minimalis (ponytail), dan lolos pengujian `npm run test` serta `npx tsc -b`.

**Goal:** Memperbaiki kendala penampil PDF repositori & e-book pada perangkat seluler (mobile view) dan mengubah field kuantitas bulk item menjadi input teks numerik yang dapat menerima angka kustom secara bebas.

**Arsitektur:** 
- Mobile Adaptive Document Viewer di `SecurePdfViewer` dan `EbookReaderModal`: menyembunyikan iframe yang rusak pada mobile dan menghadirkan kartu aksi pembuka dokumen native.
- Controlled Numeric Text Input di `ItemSection` dan `BibliographySection`: state berbasis string dengan filter regex `\D` dan validasi batas aman saat submit/blur.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-11-mobile-pdf-and-bulk-item-quantity-design.md`

---

## Global Constraints
- Tidak merusak fungsionalitas desktop viewer yang sudah berjalan.
- Standar Anti-Slop: tidak ada tombol mati, layout rapi, label jelas.
- Ponytail: solusi native tanpa dependensi eksternal baru.

---

### Task 1: Ubah Input Kuantitas Bulk Item Menjadi Text Numerik (`ItemSection.tsx`)

**Files:**
- Modify: `library-fe/src/components/dashboard/ItemSection.tsx:1042,1062-1070,1208-1218`
- Test: `library-fe/src/components/dashboard/__tests__/ItemSectionBulk.test.tsx`

- [ ] **Step 1: Tulis unit test untuk input kuantitas bulk item**
  - Menguji bahwa input berjenis `type="text"`.
  - Menguji bahwa karakter non-angka disaring otomatis.
  - Menguji bahwa pengguna dapat menghapus input hingga kosong lalu mengetik angka kustom (misal `15`).

- [ ] **Step 2: Jalankan test untuk memverifikasi kegagalan**
  `npx vitest run src/components/dashboard/__tests__/ItemSectionBulk.test.tsx`

- [ ] **Step 3: Implementasikan controlled text input dengan filter `\D` di `ItemSection.tsx`**
  - Ubah state `quantity` menjadi string: `const [quantityInput, setQuantityInput] = useState("1");`
  - Sanitasi `e.target.value.replace(/\D/g, "")` pada `onChange`.
  - Atur `onBlur` untuk mengembalikan ke `1` jika kosong/0 atau membatasi ke `1000`.
  - Parse `parseInt(quantityInput, 10)` pada `generateItems` dan submit.

- [ ] **Step 4: Jalankan test dan pastikan lulus**
  `npx vitest run src/components/dashboard/__tests__/ItemSectionBulk.test.tsx`

---

### Task 2: Ubah Input Kuantitas Eksemplar Fisik Menjadi Text Numerik (`BibliographySection.tsx`)

**Files:**
- Modify: `library-fe/src/components/dashboard/BibliographySection.tsx:855-875,955-975`

- [ ] **Step 1: Implementasikan controlled text input di `AddPhysicalItemsModal`**
  - Ganti `type="number"` menjadi `type="text"`, tambahkan `inputMode="numeric"` dan `pattern="[0-9]*"`.
  - Sanitasi hanya angka dengan regex `replace(/\D/g, "")`.
  - Batasi maksimal 50 eksemplar pada `onBlur` dan `handleSubmit`.

- [ ] **Step 2: Jalankan test yang ada untuk memastikan tidak ada regresi**
  `npx vitest run src/components/dashboard/__tests__/BibliographySection.test.tsx`

---

### Task 3: Implementasikan Kartu Aksi Mobile & Native PDF Handler (`SecurePdfViewer.tsx`)

**Files:**
- Modify: `library-fe/src/components/SecurePdfViewer.tsx`
- Test: `library-fe/src/components/__tests__/SecurePdfViewer.test.tsx`

- [ ] **Step 1: Tulis test untuk verifikasi elemen mobile reader**
  - Menguji keberadaan tombol aksi buka/baca naskah PDF pada tampilan mobile.
  - Memverifikasi trigger handler pembuka dokumen Blob.

- [ ] **Step 2: Modifikasi `SecurePdfViewer.tsx`**
  - Buat fungsi `handleOpenMobilePdf` yang memicu native open/download via Blob URL.
  - Pada layar `< md`, sembunyikan container iframe yang tidak didukung browser seluler dan tampilkan kartu baca responsif "Naskah Siap Dibaca di Ponsel" dengan tombol "Buka & Baca Dokumen PDF".
  - Sediakan fallback link langsung ke endpoint stream backend.

- [ ] **Step 3: Jalankan test `SecurePdfViewer.test.tsx`**
  `npx vitest run src/components/__tests__/SecurePdfViewer.test.tsx`

---

### Task 4: Implementasikan Mobile Reader Action di `EbookReaderModal.tsx`

**Files:**
- Modify: `library-fe/src/components/EbookReaderModal.tsx`

- [ ] **Step 1: Modifikasi `EbookReaderModal.tsx`**
  - Tambahkan fungsi `handleOpenMobileEbook` untuk trigger pembuka Blob aman.
  - Hadirkan kartu baca khusus mobile saat modal dibuka di ponsel, memastikan pembaca dapat langsung membuka berkas e-book di aplikasi penampil PDF perangkat mereka.

---

### Task 5: Verifikasi Komprehensif Monorepo & Push ke Upstream

- [ ] **Step 1: Jalankan TypeScript typecheck**
  `npx tsc -b` di `library-fe` dan `npm run build` di `library-be`.

- [ ] **Step 2: Jalankan seluruh test suite**
  `npm run test -- --run` di `library-fe`.

- [ ] **Step 3: Buat branch, commit, push ke origin `janfdev`, buat PR ke `MUCILIB/library-umc`, dan merge**
