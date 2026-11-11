# Desain Teknis: Perbaikan Mobile PDF Viewer & Input Kuantitas Bulk Item

**Tanggal:** 11 November 2026  
**Status:** Draf Perancangan (Menunggu Konfirmasi Eksekusi / 'Gas')  
**Area Terkait:**  
1. Penampil Dokumen PDF di Tampilan Mobile (`SecurePdfViewer.tsx` & `EbookReaderModal.tsx`)  
2. Input Kuantitas Bulk Item Eksemplar (`ItemSection.tsx` & `BibliographySection.tsx`)  

---

## 1. Latar Belakang & Identifikasi Masalah

### Masalah 1: Mobile View Tidak Bisa Melihat PDF Repositori atau E-Book
- **Akar Penyebab:**
  1. Peramban seluler (Mobile Safari di iOS dan Mobile Chrome di Android) tidak mendukung rendering dokumen PDF melalui elemen `<object type="application/pdf">` atau `<iframe>`. Halaman hanya menampilkan kotak abu-abu kosong/rusak.
  2. Banner tautan darurat mobile saat ini menggunakan tag `<a href={blobUrl} target="_blank">`. Pada sistem operasi seluler (iOS Safari & Android Chrome), membuka URL memori lokal (`blob:`) ke dalam tab/jendela baru (`target="_blank"`) dicegah oleh sandbox keamanan browser, menghasilkan halaman kosong (`about:blank`) atau gagal dibuka oleh aplikasi PDF eksternal.
  3. Frame penampil berukuran statis (`h-[620px]` / `h-[85vh]`) mendominasi layar ponsel dengan ruang mati kosong, membingungkan pemustaka.

- **Solusi yang Dirancang:**
  1. **Deteksi Tampilan Ponsel (Mobile Adaptive Layout):**
     - Pada perangkat mobile/layar kecil (`< 768px` atau deteksi sentuh/mobile viewport), sembunyikan iframe kosong yang tidak didukung browser seluler.
     - Tampilkan **Kartu Baca Dokumen Mobile (Dedicated Mobile PDF Viewer Hub)** yang bersih, responsif, dan anti-slop.
  2. **Mekanisme Pembuka Dokumen Naskah Andal (Dual Action Native Handling):**
     - **Aksi 1 (Buka / Baca PDF Bawaan Perangkat):** Memanfaatkan trigger pembuka Blob aman via native anchor download/open. Pada Android, file langsung terbuka di Google PDF Viewer / Drive Viewer / Adobe Reader. Pada iOS Safari, file terbuka di penampil PDF bawaan Safari (QuickLook).
     - **Aksi 2 (Akses Langsung / Tab Baru):** Tautan langsung ke endpoint stream backend resmi (`/api/repository/proposals/:id/view-pdf` dan `/api/ebooks/:id/stream`) yang mengirimkan header `Content-Type: application/pdf` dan `Content-Disposition: inline`.
  3. **Penyelarasan pada `EbookReaderModal`:**
     - Menghadirkan banner aksi baca mobile langsung di bagian atas modal dan memastikan tombol aksi eksternal memicu handler Blob download/view native, bukan tautan mati `target="_blank"`.

---

### Masalah 2: Input Bulk Item Terkunci di Angka 1 & Tidak Bisa Custom Angka
- **Akar Penyebab:**
  - Komponen `BulkCreateModal` (`ItemSection.tsx`) dan `AddPhysicalItemsModal` (`BibliographySection.tsx`) menggunakan `<input type="number">` dengan handler reaktif:
    ```tsx
    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
    ```
  - Ketika pengguna menekan tombol Backspace untuk menghapus angka `1`, nilai input menjadi string kosong `""`. Ekspresi `parseInt("") || 1` seketika mengevaluasi ke angka `1`, sehingga input otomatis kembali ke angka 1 sebelum pengguna sempat mengetik angka baru. Pengguna tidak bisa mengetik angka seperti `5`, `10`, atau `25` secara wajar.

- **Solusi yang Dirancang:**
  - Mengubah tipe input dari `type="number"` menjadi `type="text"`.
  - Menggunakan atribut aksesibilitas seluler: `inputMode="numeric"` dan `pattern="[0-9]*"`.
  - State kuantitas disimpan sebagai string (`quantityInput: string`), sehingga pengguna leluasa menghapus (`backspace`) hingga kosong dan mengetik angka berapa pun.
  - Sanitasi karakter ketat secara instan pada event `onChange`:
    ```tsx
    onChange={(e) => {
      const onlyDigits = e.target.value.replace(/\D/g, "");
      setQuantityInput(onlyDigits);
    }}
    ```
  - Pada event `onBlur` dan saat `handleSubmit` / `generateItems`:
    - Mengonversi string ke integer `parseInt(quantityInput, 10)`.
    - Jika kosong atau `0`, kembalikan ke batas minimal `1`.
    - Menjaga batas maksimal (`1000` pada `ItemSection`, `50` pada `BibliographySection`).

---

## 2. Rencana Berkas yang Dimodifikasi & Dibuat

1. `library-fe/src/components/SecurePdfViewer.tsx`:
   - Penambahan layout mobile card adaptif.
   - Fungsi `handleOpenMobileDocument` untuk unduh/buka naskah secara native di Android dan iOS.
   - Sembunyikan iframe yang rusak pada mobile viewport, tampilkan action hub dokumen yang fungsional.
2. `library-fe/src/components/EbookReaderModal.tsx`:
   - Penambahan action card mobile reader khusus untuk tampilan e-book.
   - Handler pembuka naskah mobile yang aman.
3. `library-fe/src/components/dashboard/ItemSection.tsx`:
   - Ubah field `quantity` pada `BulkCreateModal` menjadi `type="text"`, hanya menerima digit angka `[0-9]`, mendukung penghapusan dan pengisian angka bebas.
4. `library-fe/src/components/dashboard/BibliographySection.tsx`:
   - Ubah field `quantity` pada `AddPhysicalItemsModal` menjadi `type="text"`, sanitasi regex digit angka `\D`, mendukung input bebas.
5. Unit Tests:
   - `library-fe/src/components/__tests__/SecurePdfViewer.test.tsx` (uji mobile action & fallback).
   - `library-fe/src/components/dashboard/__tests__/ItemSectionBulk.test.tsx` (uji input kuantitas text-only-digits).

---

## 3. Matriks Pengujian & Verifikasi

1. **Uji Fungsional Mobile PDF:**
   - Verifikasi kartu mobile muncul dan iframe diabaikan/disembunyikan saat mode mobile.
   - Verifikasi tombol "Baca / Buka PDF" memicu handler Blob tanpa melempar error `about:blank`.
2. **Uji Fungsional Input Bulk Item:**
   - Input dapat dikosongkan dengan Backspace tanpa otomatis mental kembali ke angka 1.
   - Input hanya menerima karakter numerik (huruf dan simbol otomatis disaring).
   - Nilai angka custom seperti `12`, `25`, `50` dapat diinput dan berhasil mengenerate kode eksemplar.
3. **CI & Regresi:**
   - `npx tsc -b` bebas error tipe.
   - `npm run test -- --run` seluruh suite lulus 100%.
