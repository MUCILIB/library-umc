# Specification: E-Book Management & Reader Platform

## Problem Statement

Perpustakaan Universitas Muhammadiyah Cirebon (UMC) saat ini memiliki sistem otomasi perpustakaan fisik (peminjaman buku fisik, barcode, rak) dan repositori karya ilmiah (skripsi/ta), namun belum memiliki fasilitas pengelolaan dan pembacaan buku digital (E-Book) yang terintegrasi secara aman. 

Akibatnya:
1. Koleksi e-book kampus belum bisa dipublikasikan secara terstruktur kepada mahasiswa dan dosen.
2. Pengguna yang mengakses katalog online tidak dapat langsung membaca buku digital di browser.
3. Administrator perpustakaan tidak memiliki modul khusus untuk mengunggah berkas PDF e-book ke penyimpanan cloud (S3) serta menentukan kebijakan akses baca (apakah buku boleh dibaca penuh atau hanya bab pratinjau tertentu untuk melindungi hak cipta penerbit).

## Solution

Membangun modul **E-Book Management** di Super Admin Dashboard dan fitur **E-Book Reader** di antarmuka publik:
1. **Super Admin**: Modul mandiri di sidebar bernama **"E-Book"** di bawah grup *Manajemen Koleksi*. Admin dapat mengunggah file PDF e-book ke S3 (Dahono S3), menentukan sampul, mengisi metadata buku, serta mengatur kebijakan akses baca (Akses Penuh / Akses Terbatas dengan Pratinjau Halaman).
2. **Katalog & Beranda Publik**: E-book ditampilkan secara alami berdampingan dengan buku fisik. Pada kartu buku terdapat badge penanda "E-Book". Di halaman detail buku (`/katalog/:id`), informasi stok rak fisik disembunyikan dan tombol aksi otomatis berubah menjadi **"Baca E-Book"**.
3. **Pembaca Digital Aman (Secure Reader)**: Menggunakan viewer berbasis streaming dengan dukungan pemotongan halaman dinamis (`pdfSlicingService`), mencegah unduhan ilegal, serta memberikan banner peringatan ketika pembaca tamu mencapai batas halaman pratinjau.

## User Stories

### Super Admin / Pengelola Perpustakaan
1. As an admin, I want to access a dedicated "E-Book" menu in the dashboard sidebar, so that I can manage digital books separately from physical barcode inventory.
2. As an admin, I want to upload an e-book PDF file to cloud storage (S3), so that digital assets are securely hosted without burdening the application web server.
3. As an admin, I want to see automatic calculation of total pages and file size upon uploading a PDF, so that the metadata is accurate.
4. As an admin, I want to choose the reading access mode: "Full Access" or "Limited Preview", so that I can protect copyrighted books while sharing open-access books freely.
5. As an admin, I want to configure the start page and end page for the public preview when "Limited Preview" is selected, so that guests only see introductory chapters.
6. As an admin, I want to update e-book metadata (title, author, publisher, year, category, description, and cover image), so that catalog information remains up to date.
7. As an admin, I want to delete or archive an e-book, so that obsolete or revoked editions are removed from public view.

### Mahasiswa, Dosen & Pengunjung Publik
8. As a student, I want to filter the catalog specifically for "E-Book", so that I can quickly find digital textbooks for remote study.
9. As a library visitor, I want to see e-books in the latest collection carousel on the landing page, so that I can discover newly acquired digital books.
10. As a visitor on the book detail page (`/katalog/:id`), I want to see a prominent "Baca E-Book" button instead of physical borrowing buttons, so that I understand this resource is read online.
11. As a reader, I want to open the e-book in a clean, responsive in-browser PDF viewer, so that I can read seamlessly on both desktop and mobile devices.
12. As a guest user reading a preview-limited e-book, I want to see a clear notification when reaching the preview limit explaining how to log in for full access, so that I can proceed to authenticate.
13. As an authenticated student or lecturer, I want to access the complete pages of licensed e-books, so that I can complete my coursework and research.

## Implementation Decisions

### 1. Database & Schema Alignment
- **Collection Type**: Memanfaatkan enum `collection_type` yang sudah bernilai `'ebook'` pada tabel `bibliographies`.
- **Digital Asset Storage (`bibliography_contents`)**: Mengaktifkan dan memperkaya tabel `bibliography_contents` yang terhubung ke `bibliographies.id`:
  - `contentType`: Enum `'pdf'` | `'url'`.
  - `contentUrl`: Kunci file di S3 atau link eksternal.
  - `fileSize`: Ukuran berkas dalam byte.
  - `pageCount`: Total halaman fisik PDF.
  - `isFullAccess`: Boolean (true jika bisa dibaca penuh oleh publik).
  - `previewStartPage`: Integer (default 1).
  - `previewEndPage`: Integer (misal halaman 10 atau 15 jika akses terbatas).
  - `allowDownload`: Boolean (default false untuk melindungi hak cipta).

### 2. Backend Architecture (`library-be`)
- **Modul Baru**: Membuat modul `ebook` di bawah `src/modules/ebook`:
  - `route/ebook.route.ts`: Endpoint publik & admin.
  - `controller/ebook.controller.ts`: Handler request.
  - `service/ebook.service.ts`: Logika bisnis dan integrasi database Drizzle.
  - `validation/ebook.validation.ts`: Skema validasi Zod.
- **Storage & Streaming**:
  - Menggunakan `StorageService` S3 Dahono untuk upload (`PutObjectCommand`) dan download stream (`GetObjectCommand`).
  - Mengintegrasikan `PdfSlicingService` (`pdf-lib`) untuk memotong buffer PDF jika pemustaka belum login dan buku memiliki aturan pratinjau halaman.
- **Endpoints**:
  - `POST /api/ebooks`: Upload dan buat e-book (Admin only).
  - `GET /api/ebooks`: Daftar e-book dengan filter dan pagination.
  - `GET /api/ebooks/:id`: Detail metadata e-book.
  - `PUT /api/ebooks/:id`: Perbarui metadata dan aturan akses (Admin only).
  - `DELETE /api/ebooks/:id`: Hapus e-book (Admin only).
  - `GET /api/ebooks/:id/stream-pdf`: Streaming file PDF (terpotong atau penuh sesuai otentikasi pengguna).

### 3. Frontend Architecture (`library-fe`)
- **Admin Section**: Membuat `EbookSection.tsx` di `src/components/dashboard/` dan mendaftarkan kunci `"ebooks"` di `SuperAdminDashboard.tsx` dengan label **"E-Book"** di bawah *Manajemen Koleksi*.
- **Katalog & Landing Page**:
  - Di `KatalogDetail.tsx`: Kondisional rendering berbasis `bibliography.type === "ebook"`. Menyembunyikan tabel status stok barcode fisik, mengganti tombol aksi menjadi modal atau trigger pembaca **"Baca E-Book"**.
  - Di `Home.tsx` & `BookList.tsx`: Memastikan kartu koleksi e-book memiliki lencana visual yang selaras dan transisi halus ke halaman detail.
- **Reader Component**:
  - Mengadaptasi komponen `SecurePdfViewer.tsx` untuk menampilkan aliran stream PDF e-book, proteksi klik kanan, dan pembatasan pratinjau.

## Testing Decisions

### Backend Testing (`Vitest`)
- Unit test validasi Zod untuk payload pembuatan e-book (validasi rentang halaman, tipe file PDF, metadata).
- Integration test endpoint streaming:
  - Memverifikasi pengembalian header `Content-Type: application/pdf`.
  - Memverifikasi pemotongan halaman (`pdfSlicingService`) saat pengguna tidak memiliki sesi login pada buku dengan mode pratinjau terbatas.
  - Memverifikasi akses penuh ketika pengguna login sebagai mahasiswa/dosen.

### Frontend Testing (`Vite / Vitest / Playwright`)
- Component test pada `KatalogDetail.tsx`: memastikan tombol "Baca E-Book" muncul saat `type === 'ebook'` dan tombol pinjam fisik disembunyikan.
- Verifikasi visual: form admin E-Book di dashboard responsif dan mendukung upload drag-and-drop.

## Out of Scope
- DRM terenkripsi biner proprietary (cukup proteksi berbasis ACL server-side stream slicing dan disbled right-click/toolbar browser).
- Fitur highlight atau catatan pribadi dalam PDF (bisa dikembangkan pada fase berikutnya).
- Pembelian/monetisasi berbayar per judul e-book (seluruh e-book adalah inventaris akademik kampus).
