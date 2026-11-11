# Alur Full Sub-Menu Sistem Dashboard Perpustakaan UMC

Portal manajemen perpustakaan terbagi ke dalam 5 grup besar navigasi dengan total 21 sub-menu utama dan 4 sub-tab CMS.

---

## 1. Grup Utama

### 1.1 Dashboard (`tab=dashboard`)
- **Tujuan**: Menampilkan ringkasan metrik operasional perpustakaan secara real-time.
- **Komponen Utama**:
  - Kartu statistik: Total Bibliografi, Total Eksemplar Fisik, Peminjaman Aktif, dan Pengunjung Hari Ini.
  - Grafik tren sirkulasi & tren kunjungan.
  - Shortcut aksi cepat untuk navigasi ke peminjaman pending.

---

## 2. Grup Sirkulasi & Layanan

### 2.1 Sirkulasi & Scan (`tab=circulation`)
- **Tujuan**: Operasional meja sirkulasi front-desk menggunakan scanner barcode / QR token atau input manual.
- **Alur Interaksi**:
  1. Input `itemCode` / `inventoryCode` / QR Token.
  2. Pilih mode transaksi:
     - **Inspect**: Cek ketersediaan dan detail riwayat buku.
     - **Loan**: Peminjaman langsung dengan memasukkan ID/NIM anggota.
     - **Return**: Pengembalian buku, inspeksi kondisi fisik (Bagus / Rusak / Hilang).
  3. Konfirmasi transaksi dan pencetakan bukti transaksi (jika diperlukan).

### 2.2 Peminjaman & Persetujuan (`tab=loans`)
- **Tujuan**: Manajemen daftar transaksi peminjaman buku dari anggota.
- **Fitur & Filter**:
  - Filter status: Semua (`all`), Pending (`pending`), Disetujui/Aktif (`approved`), Selesai (`returned`), Pengajuan Perpanjangan (`pending_extension`), dan Antrean Reservasi (`reservations`).
  - Aksi admin: Approve peminjaman, Reject peminjaman (dengan alasan modal), Setujui perpanjangan masa pinjam.
  - Ekspor riwayat peminjaman ke format CSV.

### 2.3 Konfirmasi Pengembalian (`tab=returnApprovals`)
- **Tujuan**: Memproses dan memverifikasi pengembalian buku fisik yang diajukan oleh peminjam.
- **Alur**:
  1. Daftar antrean pengembalian pending.
  2. Verifikasi kesesuaian fisik buku.
  3. Konfirmasi pengembalian (status item otomatis kembali menjadi `available`).
  4. Perhitungan keterlambatan otomatis masuk ke antrean denda.

### 2.4 Manajemen Denda (`tab=fines`)
- **Tujuan**: Pencatatan, penghitungan, dan penyelesaian denda keterlambatan atau kerusakan buku.
- **Fitur**:
  - Daftar denda per anggota dengan rincian hari keterlambatan x tarif denda harian.
  - Aksi pelunasan (Mark as Paid) dengan pencatatan metode pembayaran (tunai / transfer).
  - Cetak tanda terima denda.

### 2.5 Persetujuan Kartu (`tab=cardApprovals`)
- **Tujuan**: Verifikasi pengajuan aktivasi dan cetak kartu anggota perpustakaan (KTM / Kartu Anggota).
- **Alur**:
  - Review data identitas anggota baru (NIM, Nama, Fakultas, Prodi, Foto).
  - Aksi: Setujui pengajuan, Generate nomor kartu & barcode anggota, Tolak pengajuan dengan catatan alasan.

---

## 3. Grup Manajemen Koleksi

### 3.1 Bibliografi / Buku (`tab=bibliographies`)
- **Tujuan**: Manajemen master judul katalog buku perpustakaan.
- **Fitur**:
  - Pencarian live (Judul, Penulis, ISBN/ISSN).
  - Form Tambah & Edit Bibliografi (Judul, ISBN, Pengarang, Penerbit, Tahun Terbit, Klasifikasi DDC, Call Number, Upload Cover ke S3).
  - Tombol Quick Add Item (+ Eksemplar) langsung pada baris tabel katalog.
  - Tombol Lihat Eksemplar: langsung membuka sub-menu Item terfilter judul buku tersebut.

### 3.2 Item Eksemplar (`tab=items`)
- **Tujuan**: Manajemen fisik eksemplar buku per unit barcode.
- **Fitur**:
  - Form penambahan eksemplar satuan atau massal (bulk generator).
  - Penetapan Nomor Barcode / Item Code (`UMC-XXXXXX-XX`), Nomor Inventaris, dan Lokasi Rak.
  - Status unit: `available`, `loaned`, `repair`, `lost`.
  - Cetak label barcode / QR Code eksemplar untuk ditempel di fisik buku.

### 3.3 E-Book Digital (`tab=ebooks`)
- **Tujuan**: Pengelolaan koleksi buku digital / elektronik.
- **Fitur**:
  - Upload file e-book (PDF / EPUB) ke storage terproteksi S3.
  - Atur cover e-book, deskripsi, dan metadata publikasi.
  - Hak akses baca online (terintegrasi dengan PDF reader in-app).

### 3.4 Repositori Skripsi (`tab=repository`)
- **Tujuan**: Manajemen karya ilmiah, skripsi, tesis, dan tugas akhir mahasiswa.
- **Fitur**:
  - Review draft pengajuan unggah skripsi dari mahasiswa.
  - Verifikasi berkas bab skripsi (Bab 1-5 / Naskah Publikasi).
  - Pengaturan Access Control List (ACL): Publik (Open Access) atau Terbatas Kampus.
  - Approval repositori untuk dipublikasikan ke katalog umum.

### 3.5 Rekomendasi Buku (`tab=recommendations`)
- **Tujuan**: Mengelola usulan pengadaan buku baru yang diajukan oleh mahasiswa dan dosen.
- **Fitur**:
  - Tabel usulan judul buku, penulis, penerbit, dan pemohon.
  - Status usulan: Pending review, Disetujui (masuk pengadaan), Ditolak.

### 3.6 Import Data (`tab=importData`)
- **Tujuan**: Impor massal data koleksi dari file spreadsheet.
- **Fitur**:
  - Unduh template CSV/Excel resmi (Bibliografi, Item, Anggota).
  - Upload file dengan validasi baris & pelaporan error detail jika terjadi duplikasi / salah format.

### 3.7 Export Data (`tab=exportData`)
- **Tujuan**: Ekspor data koleksi dan sirkulasi untuk keperluan backup atau akreditasi.
- **Fitur**:
  - Ekspor Bibliografi (CSV/Excel).
  - Ekspor Eksemplar Item.
  - Ekspor Riwayat Sirkulasi & Tamu.

---

## 4. Grup Master Data

### 4.1 Fakultas (`tab=fakultas`)
- **Tujuan**: Manajemen data fakultas di lingkungan Universitas Muhammadiyah Cirebon.
- **Fitur**:
  - Tambah Fakultas (Nama Fakultas, Kode Fakultas).
  - Edit dan Hapus Fakultas (dengan validasi relasi prodi).

### 4.2 Program Studi (`tab=prodi`)
- **Tujuan**: Manajemen program studi yang berada di bawah fakultas.
- **Fitur**:
  - Tambah Prodi (Nama Prodi, Kode, Pemilihan Relasi Fakultas).
  - Edit & Hapus Program Studi.

### 4.3 Lokasi Rak (`tab=locations`)
- **Tujuan**: Pemetaan fisik tata letak buku di gedung perpustakaan.
- **Fitur**:
  - Tambah Lokasi (Lantai / Ruangan, Rak Buku, Baris / Shelf).
  - Edit & Hapus Lokasi.
  - Relasi ke pencarian item eksemplar untuk memudahkan pustakawan dan pemustaka menemukan buku fisik.

---

## 5. Grup Pengaturan, Audit & CMS

### 5.1 Data Pengunjung (`tab=guests`)
- **Tujuan**: Buku tamu digital pengunjung harian perpustakaan.
- **Fitur**:
  - Tab Pengunjung Anggota (NIM/Email) & Pengunjung Non-Anggota (Tamu Luar).
  - Tombol modal Input Pengunjung manual (Nama, Instansi, Tujuan Kunjungan).
  - Shortcut ke halaman presensi mandiri (Kiosk `/input-kunjungan`).
  - Ekspor daftar pengunjung harian/bulanan ke format CSV.

### 5.2 Manajemen User (`tab=users`) *(Super Admin Only)*
- **Tujuan**: Manajemen akun pengguna sistem perpustakaan.
- **Fitur**:
  - Tabel daftar user dengan filter role (`super_admin`, `staff` / `librarian`, `member`).
  - Tambah User baru dan edit hak akses / status aktif.
  - Pengaturan role permissions granular.

### 5.3 Audit Log (`tab=audit`) *(Super Admin Only)*
- **Tujuan**: Pelacakan jejak audit kepatuhan dan keamanan aktivitas sistem.
- **Fitur**:
  - Tabel log riwayat mutasi data (CREATE, UPDATE, DELETE).
  - Detail data yang diubah, aktor pelaksana, alamat IP, dan timestamp transaksi.

### 5.4 Laporan & Statistik (`tab=reports`)
- **Tujuan**: Pembuatan laporan statistik berkala untuk evaluasi pimpinan dan akreditasi perpustakaan.
- **Fitur**:
  - Filter rentang tanggal / periode (Harian, Bulanan, Tahunan).
  - Statistik peminjaman terpopuler, kategori buku paling sering dipinjam, dan tren pembaca per prodi.
  - Tombol Ekspor Laporan PDF & spreadsheet.

### 5.5 Manajemen Konten (CMS) (`tab=cms`)
- **Tujuan**: Mengatur tampilan publik portal perpustakaan tanpa mengubah kode sumber.
- **Sub-Tab CMS**:
  1. **Banner Siaran (`cms-banner`)**: Konfigurasi teks bilah pengumuman siaran darurat/informasi penting di bagian atas website serta switch toggle aktif/nonaktif.
  2. **Identitas & Logo (`cms-branding`)**: Konfigurasi nama portal, slogan, upload logo resmi kampus ke S3, dan favicon.
  3. **Hero Landing Page (`cms-hero`)**: Konfigurasi headline teks sambutan, call-to-action (CTA), dan gambar latar hero landing page.
  4. **Peta Lokasi & Footer (`cms-location`)**: Konfigurasi alamat perpustakaan kampus, jam operasional, tautan media sosial, kontak email/telepon, dan embed peta Google Maps.
