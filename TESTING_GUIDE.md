# 📖 Panduan Pengujian Fitur Perpustakaan (UMC Library)

Panduan ini memandu Anda melakukan pengujian end-to-end (E2E) terhadap seluruh fitur baru yang diminta oleh stakeholder perpustakaan UMC.

---

## 🚀 1. Persiapan Menjalankan Sistem Lokal

### A. Menjalankan Backend (`library-be`)
1. Buka terminal di direktori backend:
   ```bash
   cd /root/library-umc/library-be
   ```
2. Pastikan file `.env` sudah terisi dengan `DATABASE_URL` PostgreSQL yang valid.
3. Jalankan aplikasi:
   ```bash
   npm run dev
   # Backend berjalan di http://localhost:4000
   ```

### B. Menjalankan Frontend (`library-fe`)
1. Buka terminal di direktori frontend:
   ```bash
   cd /root/library-umc/library-fe
   ```
2. Pastikan file `.env` mengarah ke backend:
   ```env
   VITE_API_URL=http://localhost:4000
   ```
3. Jalankan server frontend:
   ```bash
   npm run dev
   # Frontend berjalan di http://localhost:5173
   ```

---

## 🧪 2. Panduan Pengujian per Fitur

### 📌 Fitur 1: Filter & Export Buku Berdasarkan Fakultas
**Tujuan:** Memastikan admin dapat memfilter katalog berdasarkan fakultas dan mengunduh data CSV yang hanya berisi buku fakultas tersebut.

1. Buka browser dan login sebagai **Admin / Staff**:
   - Masuk ke menu **Dashboard Super Admin** (`/dashboard/super-admin`).
   - Pilih tab menu **Bibliografi** atau **Export Data**.
2. **Uji di Tab Bibliografi (`BibliographySection`)**:
   - Pada toolbar tabel katalog, klik dropdown **Fakultas** (misal pilih: *Fakultas Teknik*).
   - Pastikan tabel hanya menampilkan buku-buku yang berkaitan dengan Fakultas Teknik.
   - Klik tombol **"Export CSV"** di samping dropdown.
   - Buka file CSV yang terunduh: periksa bahwa baris buku yang muncul hanya berasal dari Fakultas Teknik.
3. **Uji di Tab Export Data (`ExportSection`)**:
   - Pilih opsi filter Fakultas & Program Studi.
   - Klik tombol **"Export Bibliografi"**.
   - Verifikasi isi CSV terformat rapi dengan encoding UTF-8 BOM dan delimiter titik koma (`;`).

---

### 📌 Fitur 2: Universal Import & Export (Pengunjung, Peminjaman, User)
**Tujuan:** Memastikan staf dapat mengunduh template, mengimpor data massal, dan mengekspor data ke format CSV.

1. **Pengujian pada Menu Pengunjung (Buku Tamu)**:
   - Buka menu **Buku Tamu / Pengunjung** (`GuestsSection`).
   - Klik tombol **"Export CSV"**: pastikan daftar absensi terunduh sesuai tanggal/filter aktif.
   - Klik tombol **"Import Data"**:
     - Klik link/tombol **"Download Template CSV"**.
     - Isi template contoh data pengunjung.
     - Upload file CSV tersebut dan klik **Upload & Import**.
     - Pastikan muncul notifikasi sukses dan jumlah baris yang berhasil diimpor masuk ke tabel.
2. **Pengujian pada Menu Peminjaman (Sirkulasi)**:
   - Buka menu **Peminjaman** (`LoansSection`).
   - Coba filter status (misal: *Menunggu Persetujuan* atau *Sedang Dipinjam*).
   - Klik tombol **"Export CSV"**: file CSV berisi rekapan peminjaman berhasil diunduh.
3. **Pengujian pada Menu Manajemen Pengguna (Users)**:
   - Buka menu **Manajemen Pengguna** (`UsersSection`).
   - Klik tombol **"Export CSV"**: file data seluruh user terunduh.
   - Klik tombol **"Import User CSV"**:
     - Unduh template CSV user.
     - Isi data akun dummy (Nama, Email, Role, dsb).
     - Upload file dan verifikasi akun baru berhasil dibuat.

---

### 📌 Fitur 3: Kiosk Scan Presensi Member & Tamu Non-Member
**Tujuan:** Memastikan halaman absensi memiliki mode kiosk cepat untuk scan kartu member dan form terpisah untuk tamu umum.

1. Buka halaman absensi publik di browser:
   - Akses URL: `http://localhost:5173/absensi`
2. **Uji Tab 1: Scan Kartu Anggota (Member)**:
   - Input teks otomatis fokus (*auto-focus*).
   - Ketikkan salah satu **NIM** atau nomor kartu anggota yang sudah terdaftar di database, lalu tekan **Enter** (menyimulasikan scan barcode gun USB).
   - **Hasil yang diharapkan:**
     - Bunyi audio *beep* pendek berbunyi.
     - Muncul visual pop-up **Kartu Anggota Digital** berisi Nama Mahasiswa, Foto/Inisial, Program Studi, Fakultas, dan Jam Masuk.
     - Terdapat hitung mundur (countdown 5 detik) sebelum pop-up menutup otomatis dan input siap melakukan scan berikutnya.
     - Jika dicoba scan ulang di hari yang sama, sistem menampilkan status bahwa member sudah tercatat hadir hari ini.
   - **Uji Kartu Tidak Ditemukan:** Masukkan NIM acak yang belum terdaftar. Sistem akan menampilkan badge merah *"Member tidak ditemukan"* dan menyediakan tombol cepat *"Isi Form Tamu Umum"*.
3. **Uji Tab 2: Pengunjung Non-Member (Tamu Umum)**:
   - Klik tab **"Tamu Non-Member"**.
   - Isi form: Nama Lengkap, Institusi/Kampus Asal, No HP/WhatsApp, dan Keperluan Kunjungan.
   - Klik tombol **"Catat Kunjungan"**.
   - Muncul notifikasi sukses dan data berhasil disimpan.
4. **Verifikasi di Dashboard Admin (`GuestsSection`)**:
   - Buka `/dashboard/super-admin` menu **Buku Tamu**.
   - Coba filter dropdown:
     - **Tipe:** Pilih *Member UMC* atau *Tamu Non-Member*.
     - **Program Studi:** Pilih salah satu prodi.
   - Pastikan data absensi dari Kiosk muncul sesuai filter yang dipilih.

---

### 📌 Fitur 4: Auto-Cancel Booking 20 Menit & Notifikasi
**Tujuan:** Memastikan pemesanan/booking buku otomatis hangus jika tidak diambil dalam 20 menit, kuota buku kembali, dan member menerima notifikasi.

1. **Uji Countdown Timer di Sisi Pengguna (Member)**:
   - Login sebagai akun member/mahasiswa biasa.
   - Buka menu **Katalog** (`/katalog`), pilih salah satu buku yang memiliki stok eksemplar tersedia.
   - Klik **"Ajukan Peminjaman"** (status peminjaman menjadi `pending`).
   - Masuk ke menu **Peminjaman Saya** (`/my-loans` atau tab di `/profile`).
   - **Hasil yang diharapkan:**
     - Pada kartu buku status `pending`, muncul badge **Countdown Timer** berwarna kuning (*Sisa Waktu: 19:59...*).
     - Di sampingnya terdapat tombol merah **"Batalkan Pemesanan"**.
2. **Uji Pembatalan Mandiri**:
   - Klik tombol **"Batalkan Pemesanan"**.
   - Konfirmasi pembatalan: status tiket langsung berubah menjadi `DITOLAK / DIBATALKAN`, dan stok eksemplar buku di katalog langsung kembali tersedia.
3. **Uji Auto-Cancel 20 Menit (Background Scheduler)**:
   - Ajukan peminjaman buku baru.
   - *Simulasi Cepat via Database (Opsional tanpa menunggu 20 menit)*:
     Anda dapat memundurkan timestamp kolom `created_at` atau `verification_expires_at` pada baris pinjaman tersebut di database agar melewati batas 20 menit:
     ```sql
     UPDATE loans SET verification_expires_at = NOW() - INTERVAL '1 minute' WHERE status = 'pending';
     ```
   - Tunggu maksimal 1 menit (karena `bookingCancelScheduler` berjalan setiap 60 detik).
   - **Hasil yang diharapkan:**
     - Background cron log Express mencetak pembatalan expired booking.
     - Status loan di database otomatis berubah menjadi `rejected` dengan alasan pembatalan waktu habis.
     - Stok eksemplar buku otomatis bertambah kembali (`syncCollectionAvailableStock`).
     - Jika member memiliki email aktif, sistem mengirimkan email notifikasi pembatalan booking.
     - Saat halaman `/my-loans` di-refresh, countdown timer menampilkan badge merah *"Batas Waktu Habis (Expired)"*.

---

## ⚡ 3. Menjalankan Automated Test Suite

Untuk memastikan seluruh logika backend dan frontend valid secara programmatic:

```bash
# Uji semua unit test backend (31 files, 207 tests)
cd /root/library-umc/library-be
npm test -- --run

# Uji semua unit test frontend (7 files, 53 tests)
cd /root/library-umc/library-fe
npm test -- --run
```
