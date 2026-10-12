# Software Requirements Specification (SRS)

## Sistem Perpustakaan Perguruan Tinggi

**Tanggal:** 26 November 2025

## 1\. Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen SRS ini menjelaskan kebutuhan fungsional dan non-fungsional untuk pembangunan _Sistem Perpustakaan_ pada sebuah perguruan tinggi. Sasaran pembaca meliputi pemangku kepentingan perguruan tinggi (pustakawan, dosen, mahasiswa, staf IT), analis sistem, pengembang, dan penguji.

### 1.2 Ruang Lingkup Sistem

Sistem Perpustakaan akan menyediakan layanan manajemen koleksi (buku, e-book, jurnal, tesis), layanan peminjaman/pengembalian, manajemen anggota, katalog online, reservasi bahan, sirkulasi, laporan, serta integrasi dengan layanan identitas kampus (SSO) dan sistem administratif (mis. ERP akademik). Sistem dapat diakses via web (desktop & mobile responsive) dan mendukung peran: Administrator, Pustakawan, Dosen/Staff, Mahasiswa, dan Pengunjung (tamu).

### 1.3 Definisi, Akronim, dan Singkatan

- SSO: Single Sign-On
- API: Application Programming Interface
- RFID: Radio Frequency Identification
- OPAC: Online Public Access Catalog
- CSV: Comma-Separated Values

## 2\. Gambaran Umum

### 2.1 Produk Perspektif

Sistem berbasis web yang dapat berintegrasi dengan LDAP/Active Directory atau SSO kampus. Menyediakan RESTful API untuk integrasi eksternal (mis. sistem keuangan, ERP, repositori institusi).

### 2.2 Fungsi Sistem (Ringkasan)

- Manajemen Koleksi: tambah/ubah/hapus data buku dan sumber lain, kategori, klasifikasi (DDC/LC/Custom), metadata (ISBN, penulis, penerbit, tahun, sinopsis, lokasi fisik).
- OPAC/Katalog: pencarian sederhana dan lanjutan, filter, hasil paginasi.
- Sirkulasi: pinjam, perpanjang, kembalikan, denda keterlambatan.
- Manajemen Anggota: pendaftaran anggota, verifikasi, peran, histori peminjaman.
- Reservasi/Booking: pemesanan ruang baca, peminjaman koleksi khusus.
- Layanan Elektronik: akses e-book, link ke repositori, akses remote (dengan autentikasi).
- Laporan & Statistik: peminjaman per periode, koleksi populer, anggota aktif, denda terhutang.
- Notifikasi: email/SMS/push untuk pengingat jatuh tempo, persetujuan reservasi.
- Keamanan & Audit: peran & hak akses, log aktivitas, enkripsi data sensitif.

### 2.3 Karakteristik Pengguna

- **Administrator IT:** konfigurasi sistem, backup/restore, integrasi.
- **Pustakawan:** manajemen koleksi, sirkulasi, laporan.
- **Dosen/Staff:** meminjam, mencari, merekomendasikan koleksi, akses e-resource.
- **Mahasiswa:** meminjam, mencari, melihat histori, memperpanjang pinjaman.
- **Pengunjung:** melihat katalog (beberapa fitur terbatas).

### 2.4 Batasan

- Sistem harus mematuhi kebijakan privasi kampus.
- Integrasi SSO tergantung pada ketersediaan endpoint SSO kampus.
- Fitur pengiriman SMS bergantung pada penyedia layanan pihak ketiga.

## 3\. Kebutuhan Fungsional (Functional Requirements)

Setiap kebutuhan diberi ID, prioritas, deskripsi, prekondisi, dan kriteria penerimaan.

### FR-01: Manajemen Pengguna & Otentikasi

- **Prioritas:** Tinggi
- **Deskripsi:** Sistem harus memungkinkan login melalui SSO kampus; jika SSO tidak tersedia, mendukung autentikasi lokal (email + password). Administrator dapat mengelola akun pengguna dan peran.
- **Prekondisi:** Endpoint SSO tersedia atau admin telah mengaktifkan akun lokal.
- **Kriteria Penerimaan:** Pengguna dapat login menggunakan akun kampus; admin dapat menambah/mematikan akun; hak akses diterapkan.

### FR-02: Pencatatan Koleksi

- **Prioritas:** Tinggi
- **Deskripsi:** Pustakawan dapat menambah, mengubah, menghapus metadata koleksi (buku fisik, e-book, jurnal, tesis). Mendukung impor massal via CSV/Excel dan pemindaian ISBN/RFID.
- **Kriteria Penerimaan:** Koleksi muncul di OPAC setelah ditambahkan; impor CSV berhasil untuk dataset uji.

### FR-03: OPAC - Pencarian & Browsing

- **Prioritas:** Tinggi
- **Deskripsi:** Pengguna dapat melakukan pencarian sederhana dan lanjutan (judul, penulis, ISBN, subjek, tahun, lokasi). Hasil bisa diurutkan dan difilter.
- **Kriteria Penerimaan:** Pencarian mengembalikan hasil relevan dalam batas waktu respons (lihat NFR terkait).

### FR-04: Sirkulasi (Pinjam/Perpanjang/Kembali)

- **Prioritas:** Tinggi
- **Deskripsi:** Sistem mengelola alur pinjam/pengembalian, memvalidasi batas pinjaman per peran, menghitung denda keterlambatan, dan mendukung perpanjangan online (jika tidak ada pemesanan lain).
- **Kriteria Penerimaan:** Proses pinjam/kembali menyimpan histori, menghitung denda yang sesuai, dan menolak perpanjangan jika ada reservasi.

### FR-05: Reservasi Koleksi & Ruang

- **Prioritas:** Sedang
- **Deskripsi:** Anggota dapat mereservasi koleksi yang sedang dipinjam atau memesan ruang baca/studi.
- **Kriteria Penerimaan:** Reservasi tercatat, notifikasi dikirim ke peminjam/pustakawan.

### FR-06: Manajemen Denda & Pembayaran

- **Prioritas:** Sedang
- **Deskripsi:** Sistem menghitung denda otomatis; mendukung pencatatan pembayaran secara manual di loket dan integrasi dengan gateway pembayaran (opsional).
- **Kriteria Penerimaan:** Denda tampil di akun anggota; pembayaran tercatat di sistem.

### FR-07: Laporan & Statistik

- **Prioritas:** Sedang
- **Deskripsi:** Pustakawan/Administrator dapat menghasilkan laporan (pemakaian koleksi, denda, kartu anggota, statistik akses e-resource) dengan rentang tanggal.
- **Kriteria Penerimaan:** Laporan dapat diunduh sebagai PDF/Excel.

### FR-08: Notifikasi & Pengingat

- **Prioritas:** Sedang
- **Deskripsi:** Sistem mengirim pengingat jatuh tempo, pemberitahuan reservasi siap, dan pemberitahuan denda melalui email (wajib) dan SMS (opsional).
- **Kriteria Penerimaan:** Email terkirim untuk skenario uji; template notifikasi dapat dikonfigurasi.

### FR-09: Hak Akses & Audit

- **Prioritas:** Tinggi
- **Deskripsi:** Implementasi RBAC (Role-Based Access Control). Semua aksi krusial (tambah/hapus koleksi, pembayaran denda) harus tercatat pada log audit.
- **Kriteria Penerimaan:** Log aktivitas menyimpan informasi pengguna, waktu, dan jenis aksi.

### FR-10: Integrasi Eksternal

- **Prioritas:** Rendah
- **Deskripsi:** API untuk integrasi dengan sistem kampus (SSO, ERP, repositori thesis) dan eksport/import data standar (CSV, MARC21, Dublin Core).
- **Kriteria Penerimaan:** Endpoint API dasar mendukung autentikasi token dan operasi CRUD untuk koleksi.

## 4\. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### NFR-01: Kinerja

- Sistem harus mampu melayani 500 pengguna simultan pada jam sibuk tanpa waktu respon pencarian lebih dari 2 detik untuk kueri umum.

### NFR-02: Skalabilitas

- Arsitektur harus mendukung skalabilitas horizontal (menambah instance aplikasi) dan penyimpanan terpisah untuk file / e-book.

### NFR-03: Keamanan

- Semua komunikasi harus melalui HTTPS.
- Data sensitif (password) harus disimpan menggunakan hashing yang kuat (mis. bcrypt/argon2).
- Sistem harus mendukung enkripsi data sensitif at-rest jika diperlukan.
- Implementasi proteksi terhadap serangan umum (SQL injection, XSS, CSRF).

### NFR-04: Ketersediaan & Backup

- Target ketersediaan: minimal 99% selama jam operasional (08:00-22:00).
- Backup harian database dan backup file mingguan; prosedur restore didokumentasikan.

### NFR-05: Portabilitas & Browser Support

- Mendukung browser modern (Chrome, Firefox, Edge, Safari) dan tampilan responsif untuk layar mobile.

### NFR-06: Usability

- Antarmuka harus intuitif; waktu onboarding pustakawan baru tidak lebih dari 2 jam dengan dokumentasi dan video singkat.

### NFR-07: Lokalisasi

- Bahasa utama: Bahasa Indonesia; mendukung multi-bahasa (opsional) untuk antarmuka.

### NFR-08: Audit & Kepatuhan

- Retensi log minimal 1 tahun; sistem harus mematuhi kebijakan privasi institusi.

## 5\. Antarmuka Eksternal

### 5.1 Antarmuka Pengguna (UI)

- Dashboard peran: ringkasan pinjaman, notifikasi, statistik.
- Form manajemen koleksi: metadata lengkap, pengunggahan sampul, upload file e-book.
- Halaman OPAC: pencarian, detail koleksi, tombol pinjam/reservasi, status ketersediaan.
- Halaman akun anggota: histori pinjaman, denda, data pribadi, perpanjangan.

### 5.2 Antarmuka Perangkat Keras

- Pembaca barcode/RFID untuk checkout cepat.
- Printer (label ISBN/label lokasi), scanner dokumen untuk digitalisasi tesis.

### 5.3 Antarmuka Perangkat Lunak

- SSO (OAuth2/SAML/LDAP) untuk otentikasi.
- Gateway email SMTP untuk pengiriman notifikasi.
- (Opsional) Gateway SMS pihak ketiga.
- Integrasi storage (NAS / cloud storage) untuk file e-book.

### 5.4 Antarmuka Komunikasi

- API RESTful (JSON) dengan dokumentasi OpenAPI/Swagger.
- Autentikasi API berbasis token (JWT/OAuth2).

## 6\. Model Data (Ringkasan)

- Entitas utama: Users, Roles, Members, Collections, Items (eksemplar fisik), Loans, Reservations, Fines, Transactions, Acquisitions, Vendors, Locations, Logs.
- Relasi penting: Member - Loan (1..n), Collection - Item (1..n), Item - Location (1..1), Loan - Fine (0..1).

**Catatan:** Lampiran ERD bisa ditambahkan pada fase desain; di sini sediakan skema awal untuk referensi pengembang.

## 7\. Kasus Penggunaan (Use Cases) - Ringkasan

- **Login menggunakan SSO** - Mahasiswa login ke OPAC.
- **Pencarian buku** - Pengguna mencari dan melihat detail koleksi.
- **Pinjam buku** - Pustakawan memproses peminjaman di loket (atau pengguna pinjam melalui self-checkout/RFID).
- **Perpanjang pinjaman** - Anggota meminta perpanjangan via akun online.
- **Reservasi koleksi** - Anggota memesan koleksi yang sedang dipinjam.
- **Generate laporan** - Pustakawan menghasilkan laporan peminjaman bulanan.

Untuk tiap use case, pada fase pengembangan akan dibuat diagram aktor/use case dan skenario langkah demi langkah.

## 8\. Kriteria Penerimaan & Pengujian

- Skenario pengujian fungsional: login SSO, tambah koleksi, pencarian, pinjam/perpanjang/kembali, impor CSV, pengiriman email.
- Pengujian non-fungsional: beban (stress/load), keamanan (vulnerability scan), kompatibilitas browser, uji REST API.
- Definisi selesai: Semua FR dengan prioritas Tinggi lulus pengujian fungsional; NFR kritikal (keamanan, backup) divalidasi.

## 9\. Batasan, Asumsi, dan Dependensi

- Asumsi: Infrastruktur jaringan kampus tersedia dan memadai; pustakawan menyediakan data awal koleksi digital.
- Dependensi: Layanan SSO kampus, penyedia SMTP, (opsional) penyedia SMS, storage untuk e-book.
- Batasan: Integrasi penuh dengan perpustakaan nasional (mis. ISBN lookup otomatis) tergantung pada akses API pihak ketiga.

## 10\. Risiko dan Mitigasi

- **Risiko:** Keterlambatan integrasi SSO => **Mitigasi:** Sediakan autentikasi lokal sementara.
- **Risiko:** Data koleksi tidak konsisten => **Mitigasi:** Validasi saat impor, dan pelatihan pustakawan.
- **Risiko:** Volume pengguna puncak melebihi ekspektasi => **Mitigasi:** Rancang arsitektur terukur dan monitoring performa.

## 11\. Lampiran

- Contoh template CSV untuk impor koleksi.
- Template notifikasi email.
- Checklist pengujian penerimaan pengguna (UAT).

## 12\. Glossary

- **OPAC:** Online Public Access Catalog
- **Sirkulasi:** Proses peminjaman dan pengembalian bahan perpustakaan
- **RBAC:** Role-Based Access Control

## 13\. Rekomendasi Lanjutan (Untuk Fase Desain & Implementasi)

- Buat ERD lengkap dan diagram arsitektur (deployment + component).
- Spesifikasi API dengan OpenAPI/Swagger.
- Rancang modul backup/restore dan disaster recovery.
- Siapkan modul audit & reporting yang fleksibel (query builder untuk pustakawan).
- Rencanakan migrasi data dari sistem lama (jika ada) termasuk mapping MARC21.

**Catatan:** Dokumen ini adalah SRS tingkat menengah - dapat disesuaikan lebih jauh dengan kebutuhan institusi (mis. kebijakan pustaka khusus, aturan pinjaman untuk koleksi khusus, integrasi layanan kampus lain). Untuk iterasi berikutnya saya bisa bantu membuat ERD, diagram use-case, dan template CSV impor.