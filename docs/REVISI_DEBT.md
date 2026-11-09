# Status Revisi & Technical Debt Proyek MUCILIB

Dokumentasi pelacakan status tiket revisi: fitur yang sudah 100% selesai di-deploy vs sisa technical debt yang siap didiskusikan & dikerjakan.

---

## 1. Fitur Revisi yang Telah Selesai (DONE)

- [x] **ISBN fleksibel (hingga 6 digit) & ISSN opsional** (PR #112 / REV-1):
  - Validasi Zod diperbarui `min(4)` karakter dan opsional.
  - Tampil di katalog publik dan detail buku (`KatalogDetail.tsx`).
- [x] **Perbaikan Navigasi Item Eksemplar 404** (PR #112 / REV-1):
  - Route aliases `/items`, `/exemplar`, `/eksemplar` terarah ke query tab dashboard (`/dashboard/super-admin?tab=items`).
- [x] **Import SLiMS (Senayan CSV Parser) & Export Delimiter** (PR #112 / REV-3):
  - Parser RFC-4180 titik koma + multi-value tag sudut `<author>`, `<topic>`, `<item_code>`.
  - Dialog pemilihan pemisah delimiter koma (`,`) vs titik koma (`;`) di `ExportSection.tsx`.
- [x] **Filter Koleksi Per Fakultas & Prodi untuk Bahan Borang PDF** (PR #112 / REV-4):
  - Filter query `facultyId` & `studyProgramId` pada endpoint `/api/export/collections/pdf`.
  - Output PDF resmi ber-kop surat Perpustakaan UMC untuk akreditasi.
- [x] **Rename Label "Pendapatan" Menjadi "Denda"** (PR #112 / REV-1):
  - Label kartu statistik di `ReportsSection.tsx` disesuaikan menjadi "Denda" / "Denda Bulanan".
- [x] **Judul Buku pada Export Laporan Statistik** (PR #112 / REV-1):
  - Memperbaiki join relasi buku pada `report.controller.ts` agar judul selalu muncul.
- [x] **Penomoran Eksemplar Berjenjang & Standarisasi No. Inventaris** (PR #112 / REV-2):
  - Generator pola berjenjang `PND-01-01` di `item.service.ts` dan standarisasi istilah "No. Inventaris".
- [x] **Badge Klasifikasi DDC di Detail Buku** (PR #112 / REV-1):
  - Tampil rapi pada halaman publik `KatalogDetail.tsx`.
- [x] **Informasi Media Sosial di Halaman Tentang** (PR #112 / REV-1):
  - Akun media sosial resmi (Instagram, YouTube, email) terpasang di `TentangPage.tsx`.
- [x] **Fitur Perpanjangan Masa Aktif Kartu Anggota (Card Renewal)** (PR #112 / REV-6):
  - Pengajuan perpanjangan di `Profile.tsx` dan antarmuka persetujuan admin di `CardApprovalsSection.tsx`.
- [x] **Bukti Pengembalian Buku Sah (Digital Signature Pad & Resi)** (PR #112 / REV-5):
  - Halaman berita acara fisik di `/dashboard/return-confirmation/:loanId` dengan canvas TTD digital dan cetak PDF tanda terima.
- [x] **RBAC & Role Dinamis** (PR #115, #117, #118 / REV-7):
  - Tabel `roles` & `role_permissions` di database.
  - Matriks hak akses untuk 20 sub-menu admin di `RolePermissionsManager.tsx`.
  - Pendaftaran role bawaan `external` (Anggota Luar) serta dukungan role kustom tanpa error 400.

---

## 2. Daftar Technical Debt (Ready for Discussion & Implementation)

### Debt-1: Tampilan Identitas Mahasiswa (Nama, NIM, No. HP, Fakultas) di Tabel Admin
* **Akar Masalah:**
  - `UserService.getAllUsers` di BE saat ini hanya mengambil data dari tabel `users` dan sebagian kecil status kartu dari tabel `members`.
  - Kolom `nim_nidn`, `phone`, dan `faculty` dari tabel `members` belum di-select ke response API.
  - Komponen FE `UsersSection.tsx` belum menampilkan kolom atau popover detail identitas akademik ini.
* **Solusi Rencana:**
  1. Patch `UserService.getAllUsers` di backend untuk menambahkan field `memberNimNidn: members.nimNidn`, `memberPhone: members.phone`, `memberFaculty: members.faculty`.
  2. Tambahkan sub-informasi pada kolom User di `UsersSection.tsx` atau sediakan dialog popover detail profil anggota.

### Debt-2: Otomatisasi Deteksi Status Mahasiswa dari NIM (Aktif vs Lulus)
* **Akar Masalah:**
  - Sistem hanya menerima string NIM tanpa memvalidasi atau memprediksi status kelulusan / masa aktif studi.
* **Solusi Rencana:**
  1. Parsing pola tahun angkatan dari NIM UMC (misal 2 digit / 4 digit awal).
  2. Tentukan batas toleransi masa studi reguler (misal: S1 maksimal 14 semester / 7 tahun).
  3. Berikan status badge visual: `Mahasiswa Aktif` atau `Alumni / Potensi Lulus` di profil dan admin review.

### Debt-3: Pengaturan Alur Persetujuan Dinamis oleh Admin (Workflow Approval Policy)
* **Akar Masalah:**
  - Alur persetujuan peminjaman masih fixed/hardcoded: setiap request peminjaman selalu butuh approval manual pustakawan.
* **Solusi Rencana:**
  1. Buat tabel konfigurasi sistem / kebijakan sirkulasi (`system_settings` atau `circulation_policies`).
  2. Opsi toggle alur:
     - *Auto-Approve Loan:* Peminjaman langsung disetujui jika stok eksemplar tersedia & peminjam tidak memiliki denda tertunggak.
     - *Require Librarian Approval:* Verifikasi manual sebelum buku diambil.
     - *Instant Renewal:* Perpanjangan mandiri langsung aktif jika belum lewat tenggat waktu.

### Debt-4: Integrasi Form Registrasi Cepat di Buku Tamu (`GuestsSection`)
* **Akar Masalah:**
  - Di `AddMemberModal.tsx` pada menu Buku Tamu, tombol submit masih menggunakan `setTimeout` (mock) dan `alert("Demo: Berhasil...")`.
* **Solusi Rencana:**
  - Hubungkan form submit ke `usersManagementService.createUser` (`POST /api/users`) yang sudah tersedia di backend agar data anggota tamu tersimpan ke database.
