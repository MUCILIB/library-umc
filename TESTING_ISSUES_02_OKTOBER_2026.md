# Backlog & Technical Specification: 10 Issue Testing Library UMC
**Tanggal**: 02 Oktober 2026
**Repository**: `janfdev/library-umc`
**Sumber Masukan**: Hasil Testing Lapangan Mandiri

---

### [LIB-01] Persistensi & Tampilan Catatan Member pada Konfirmasi Peminjaman Admin
- **Komponen**: `library-fe/src/components/LoanRequestForm.tsx`, `library-fe/src/pages/KatalogDetail.tsx`, `library-be/src/db/schema.ts`, `library-be/src/modules/loan/`
- **Gejala / Bug**: Member mengisi catatan (notes) saat meminjam buku di katalog, namun saat admin membuka halaman persetujuan/konfirmasi sirkulasi, catatan tersebut kosong / tidak muncul.
- **Root Cause Teknis**: Kolom `notes` pada tabel `loans` di database tidak ada / tidak tersimpan saat mutasi create loan, atau payload `notes` diabaikan oleh `loan.service.ts` dan tidak di-return pada response query admin loan approval.
- **Target Perbaikan**:
  1. Pastikan skema tabel `loans` memiliki kolom `notes text`.
  2. Pastikan service peminjaman menyimpan `notes` dari input user.
  3. Tampilkan field catatan ini secara jelas di modal/tabel konfirmasi sirkulasi admin.

---

### [LIB-02] Responsivitas & Horizontal Scroll Tabel Riwayat Peminjaman di Profil User
- **Komponen**: `library-fe/src/components/RiwayatPeminjaman.tsx`, `library-fe/src/pages/Profile.tsx`
- **Gejala / Bug**: Pada halaman profil user tab riwayat peminjaman, tabel data terpotong di layar mobile/tablet dan tidak dapat di-scroll secara horizontal (*horizontal scroll lock*).
- **Root Cause Teknis**: Container pembungkus tabel kehilangan class `overflow-x-auto` atau terpotong oleh parent yang menerapkan `overflow-hidden` tanpa min-width pada elemen `<table>`.
- **Target Perbaikan**:
  1. Bungkus elemen `<table>` dengan `<div className="w-full overflow-x-auto">`.
  2. Berikan `min-w-[640px]` atau `min-w-[768px]` pada elemen `table` agar kolom tidak bertumpuk di layar kecil.

---

### [LIB-03] Standardisasi & Penyelarasan Icon Aksi Reservasi di Katalog Buku
- **Komponen**: `library-fe/src/components/BookList.tsx`, `library-fe/src/pages/Katalog.tsx`
- **Gejala / Bug**: Icon tombol "Lakukan Reservasi" pada kartu katalog buku tidak konsisten/selaras dengan icon desain sistem utama (misal: ukuran icon, jenis glyph, atau alignment tombol).
- **Root Cause Teknis**: Perbedaan penggunaan icon set atau styling inline yang tidak seragam antara status "Tersedia" (Pinjam) vs "Dipinjam" (Reservasi).
- **Target Perbaikan**:
  1. Gunakan icon Lucide resmi yang konsisten (misal: `CalendarCheck` atau `BookmarkPlus`).
  2. Samakan padding, variant badge, dan alignment flex dengan tombol aksi lainnya.

---

### [LIB-04] Perbaikan Navigasi Tombol Edit & Tombol Kembali (Inverted Event Handler)
- **Komponen**: Halaman admin/katalog detail / form manajemen buku
- **Gejala / Bug**: Icon Edit tidak merespons klik, sedangkan mengklik tombol/icon Kembali (Back) justru membuka mode Edit.
- **Root Cause Teknis**: Event handler tertukar (*inverted handlers*): `onClick={handleEdit}` terpasang pada tombol Back/Kembali, sedangkan tombol Edit tidak memiliki handler aktif atau pointer-events disabled.
- **Target Perbaikan**:
  1. Petakan kembali `onClick={handleBack}` pada icon/tombol Kembali (`navigate(-1)` atau router back).
  2. Petakan `onClick={handleEdit}` pada icon/tombol Edit.

---

### [LIB-05] Perubahan Icon Arsip Bibliografi & Definisi Alur Pasca-Arsip (Archiving Lifecycle)
- **Komponen**: Modul Bibliografi Admin (`BibliographySection.tsx`, `library-be/src/modules/bibliography/`)
- **Gejala / Pertanyaan UX**: Icon aksi arsip kurang representatif, dan user/admin bingung buku yang telah diarsipkan berpindah ke mana.
- **Target Perbaikan**:
  1. Ganti icon dengan `Archive` dari Lucide React.
  2. Buat tab / filter khusus: `Semua | Aktif | Diarsipkan` pada daftar bibliografi admin, sehingga buku arsip tidak hilang dari pantauan dan dapat di-restore kapan saja.

---

### [LIB-06] Perbaikan Tautan Informasi Lokasi Perpustakaan pada Landing Page
- **Komponen**: `library-fe/src/pages/LandingPage.tsx` / `Footer.tsx` / Navbar link
- **Gejala / Bug**: Mengklik menu / tombol "Informasi Lokasi" di landing page tidak membuka halaman atau menghasilkan error / blank.
- **Root Cause Teknis**: Tautan mengarah ke anchor `#location` yang tidak ada elemen targetnya, atau rute belum terdaftar di React Router.
- **Target Perbaikan**:
  1. Pastikan rute atau target section lokasi (Google Maps embed / detail lantai dan gedung UMC) terpasang dengan id yang benar dan navigasi bekerja mulus.

---

### [LIB-07] Sinkronisasi & Penampilan Antrean Reservasi Buku di Dashboard Admin
- **Komponen**: `library-fe/src/components/ReservationList.tsx`, `library-be/src/modules/reservation/`
- **Gejala / Bug**: Member berhasil membuat reservasi di frontend, tetapi data reservasi tidak muncul pada daftar reservasi admin.
- **Root Cause Teknis**:
  - Filter query di endpoint admin reservasi mencari status tertentu atau soft-delete default.
  - Atau relasi join antara tabel `reservations` dengan `members` dan `bibliographies` menghasilkan null pada field tertentu sehingga di-skip oleh handler.
- **Target Perbaikan**:
  1. Audit endpoint `GET /api/reservations` di backend.
  2. Pastikan tabel admin menampilkan seluruh antrean reservasi masuk beserta aksi konfirmasi/pembatalan.

---

### [LIB-08] Pembetulan Routing "Cek Status" (Redirect Salah Sasaran)
- **Komponen**: Navigasi atau banner status peminjaman di frontend
- **Gejala / Bug**: Mengklik tombol "Cek Status" (misal status pengajuan/reservasi) langsung dilempar ke "Peminjaman Saya" tanpa konteks filter yang relevan.
- **Target Perbaikan**:
  1. Arahkan tombol "Cek Status" ke tab atau query param yang spesifik (misal: `/loans?tab=pending` atau `/profile?view=reservations`).

---

### [LIB-09] Generator & Tampilan QR Code di Detail Salinan Buku
- **Komponen**: `library-fe/src/pages/KatalogDetail.tsx` (komponen dialog QR code item buku)
- **Gejala / Bug**: Saat membuka dialog QR Code untuk salinan buku (`selectedItemForQr`), gambar/canvas QR code tidak muncul (kosong/blank).
- **Root Cause Teknis**: Komponen QR Code (misal `qrcode.react` atau library canvas) tidak menerima prop value yang valid (misal `item.itemCode` undefined saat modal render pertama kali) atau masalah styling z-index/canvas size.
- **Target Perbaikan**:
  1. Validasi prop string ke generator QR (`itemCode` atau URL item).
  2. Tambahkan fallback loading dan render SVG/Canvas QR code yang stabil.

---

### [LIB-10] Tampilan Selected Value pada Filter Fakultas Pencarian Mobile
- **Komponen**: `library-fe/src/pages/Katalog.tsx` (Mobile filter sheet / drawer)
- **Gejala / Bug**: Di tampilan mobile, ketika user memilih opsi Fakultas di filter, teks opsi terpilih tidak muncul / tidak ter-update di antarmuka depan.
- **Root Cause Teknis**: State binding antara mobile sheet filter dengan controlled input tidak tersinkronisasi, atau badge counter tidak menampilkan nama fakultas yang sedang aktif.
- **Target Perbaikan**:
  1. Pastikan value `selectedFaculty` langsung terikat (*two-way binding*) ke trigger dropdown/drawer di mobile view.
  2. Tampilkan chip / label filter aktif di atas daftar buku.
