# Design Spec: Redesign Repositori Digital UMC (/repositori) & Anti-Slop Modernization

- **Tanggal**: 11 November 2026
- **Status**: Draft - In Review
- **Target Platform**: Frontend (`library-fe`)
- **Rute Baru**: `/repositori` (Kanonikal Utama)
- **Rute Dialihkan**: `/e-resource` -> `/repositori` (Redirect 301/Replace)

---

## 1. Konteks & Latar Belakang

Halaman repositori digital kampus sebelumnya menggunakan nama rute `/e-resource`, yang kurang intuitif bagi mahasiswa dan sivitas akademika Universitas Muhammadiyah Cirebon yang terbiasa dengan terminologi resmi "Repositori Institusi / Repositori Karya Ilmiah".

Selain masalah penamaan rute, halaman eksisting (`EResoucePage.tsx`) memiliki sejumlah kelemahan desain dan pelanggaran standar craftmanship (*Anti-Slop*):
1. **Statistik Palsu (Pelanggaran R-17 & R-36)**: Angka *views* dan *downloads* dihasilkan dari perhitungan aritmatika modulo acak pada string judul (`140 + (p.title.length * 3) % 250`).
2. **Hero Banner Berat & Klise (Pelanggaran R-01)**: Gradien gelap pekat (`from-red-950 via-slate-900 to-red-900`) yang mendominasi layar tanpa fungsi hierarki yang jelas.
3. **Kontrol Interaktif Tidak Berfungsi Penuh (Pelanggaran R-26)**: Tombol "Cari" di dalam bilah pencarian tidak diikat ke *form submit* asli.
4. **Data Fakultas Statis (Pelanggaran C-5)**: Fallback fakultas berisi daftar hardcoded yang tidak selaras dengan master data 7 Fakultas & 21 Program Studi UMC.
5. **Kekacauan Warna Badge (Pelanggaran R-29)**: Beragam warna badge kategori yang kontras tanpa sistem desain yang terpadu.

Tujuan proyek ini adalah merombak total halaman repositori menjadi **Search Engine Karya Ilmiah Akademik** yang bersih, fungsional, dan bermartabat, dengan rute `/repositori` sebagai entri utama.

---

## 2. Parameter Desain Anti-Slop (Liveliness Dials)

- **Design Read**:
  > *Academic Research Repository untuk sivitas akademika UMC, bernuansa formal, terpercaya, dan fungsional.*
- **Declared Dials**:
  - **ENERGY: 1 (Calm)**: Nuansa bersih, berorientasi riset, tipografi akademik yang jernih, tanpa ornamen berlebihan.
  - **RHYTHM: 2 (Balanced)**: Susunan search header, filter multifaset samping, dan kartu naskah yang teratur dengan spasi fungsional.
  - **MOTION: 1 (Subtle)**: Transisi hover halus pada kartu dan kontrol filter, tanpa animasi melompat-lompat atau *fade-up* bertumpuk.
- **Focal Point**:
  - Bilah pencarian naskah akademik di bagian atas, langsung memfokuskan pengguna ke penelusuran naskah.
- **Palet Warna Terbatas (R-29)**:
  - Latar belakang: Warna netral berbasis tema (`bg-background`, `bg-muted/40`, `bg-card`).
  - Teks: Kontras tinggi memenuhi standar WCAG AA (R-25).
  - Aksen Tunggal: Merah primer UMC (`text-primary`, `bg-primary`, `border-primary/20`) untuk penanda status penting dan tautan aktif.

---

## 3. Arsitektur Rute & Navigasi

### 3.1 Pembaruan Rute (`library-fe/src/routes/index.tsx`)
1. **Rute Kanonikal Baru**:
   ```tsx
   <Route path="/repositori" element={<NonAdminRoute><RepositoriPage /></NonAdminRoute>} />
   ```
2. **Redirect Rute Lama**:
   ```tsx
   <Route path="/e-resource" element={<Navigate to="/repositori" replace />} />
   ```
3. **Penyelarasan Rute Terkait**:
   - `/repository/:id` tetap dipertahankan untuk halaman detail naskah.
   - Tombol kembali pada `RepositoryDetailPage.tsx` diarahkan ke `/repositori`.

### 3.2 Pembaruan Navigasi Global
1. **`library-fe/src/components/ui/navbar.tsx`**:
   - Nav item: `{ name: "Repositori", href: "/repositori" }`.
   - Active state check: `location.pathname.startsWith("/repositori")`.
2. **`library-fe/src/pages/Home.tsx`**:
   - Tautan CTA repositori: diarahkan ke `/repositori`.

---

## 4. Spesifikasi Komponen & Antarmuka (`RepositoriPage.tsx`)

### 4.1 Header Halaman (Clean Academic Search Header)
- Menggantikan hero gradien gelap dengan header bersih berlatar `bg-card` atau `bg-muted/30` berborder tipis:
  - Judul Halaman: `h1` **Repositori Karya Ilmiah Mahasiswa**.
  - Subjudul: Deskripsi lugas mengenai arsip tugas akhir, skripsi, dan riset sivitas akademika UMC.
  - Bilah Pencarian Form:
    - Elemen semantik `<form onSubmit={handleSearchSubmit}>` (R-39).
    - Input teks pencarian dengan placeholder informatif: *"Cari berdasarkan judul, penulis, NIM, atau abstrak..."*.
    - Dropdown cakupan pencarian: `[Semua Cakupan, Judul Naskah, Nama Penulis, Kata Kunci]`.
    - Tombol Submit "Cari": Menjalankan trigger pencarian aktif dengan feedback visual (R-26).

### 4.2 Sidebar Filter Multifaset (Fakultas & Prodi Dinamis)
- Mengambil daftar **7 Fakultas UMC** langsung via `facultyApi.list()`:
  - Fakultas Teknik (FT)
  - Fakultas Ekonomi dan Bisnis (FEB)
  - Fakultas Keguruan dan Ilmu Pendidikan (FKIP)
  - Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)
  - Fakultas Hukum (FH)
  - Fakultas Ilmu Kesehatan (FIKES)
  - Fakultas Agama Islam (FAI)
- **Filter Program Studi Dinamis**:
  - Saat fakultas tertentu dipilih, filter Program Studi hanya memunculkan prodi yang bernaung di bawah fakultas tersebut.
- **Filter Jenis Naskah**:
  - `Skripsi`, `Proposal Skripsi / TA`, `Laporan Riset / PKL`, `Tesis`, `Jurnal`.
- **Filter Rentang Tahun**:
  - Input tahun awal dan tahun akhir (misal: 2020 – 2026).
- **Tombol Reset Filter**:
  - Mengembalikan parameter ke default dalam satu kali klik.
- **Tag Filter Aktif**:
  - Chip filter aktif yang dapat dihapus secara individual (ada tombol silang `x`).

### 4.3 Daftar Kartu Naskah Akademik
- **Pembersihan Data Palsu (R-17 & R-36)**:
  - **Hapus sepenuhnya** kolom *views* dan *downloads* yang sebelumnya di-generate dari string modulo.
- **Metadata Riil yang Ditampilkan**:
  - **Kategori Naskah**: Badge elegan dengan gaya netral (`bg-muted text-muted-foreground border-border`).
  - **Badge Validasi**: Tag *"Terverifikasi Pustakawan UMC"* dengan ikon centang terverifikasi.
  - **Nomor Registrasi**: Nomor proposal / repositori naskah (jika ada).
  - **Judul Naskah**: Elemen link heading yang dapat diklik membuka `/repository/:id`.
  - **Identitas Penulis**:
    - Nama Lengkap Penulis.
    - NIM Mahasiswa (dengan format font mono yang bersih).
  - **Afiliasi Akademik**: Program Studi dan Fakultas UMC.
  - **Waktu & Dokumen**:
    - Tanggal publikasi resmi (format lokal bahasa Indonesia).
    - Ukuran berkas PDF riil & jumlah halaman.
  - **Ringkasan Abstrak**: Cuplikan 2–3 baris (`line-clamp-3`) dari abstrak naskah asli.
  - **Aksi Cepat**: Tombol sekunder outline *"Baca Abstrak & Detail"* yang mengarah ke `/repository/:id`.

### 4.4 State Antarmuka (R-27)
1. **Loading State**:
   - Menampilkan skeleton card (3 baris naskah) dengan shimmer effect halus, bukan spinner kosong.
2. **Empty State**:
   - Tampilan bersih jika pencarian/filter tidak menghasilkan data, menyertakan tombol *"Reset Filter Pencarian"*.
3. **Error State**:
   - Tampilan pesan kesalahan jaringan/server dengan tombol *"Coba Lagi"*.

---

## 5. Rencana Pengujian (Testing Plan)

### 5.1 Unit Tests (Vitest)
1. **Verifikasi Rute & Navigasi**:
   - Uji routing bahwa `/repositori` merender halaman `RepositoriPage`.
   - Uji bahwa akses ke `/e-resource` mengalihkan pengguna ke `/repositori`.
2. **Verifikasi Pencarian & Filter**:
   - Uji input pencarian judul menyaring daftar naskah.
   - Uji penyaringan berdasarkan fakultas dan kategori naskah.
   - Uji pembersihan filter saat tombol reset diklik.
3. **Verifikasi Integritas Data (Anti-Slop)**:
   - Memastikan tidak ada render angka views/downloads palsu di dalam DOM kartu.

### 5.2 Build & Typecheck
- Menjalankan `tsc -b` dan `npm run test` untuk memastikan 100% lulus.

---

## 6. Spec Self-Review Check
- [x] **Placeholder Scan**: Tidak ada tag TODO/TBD yang menggantung; seluruh nama komponen, file, dan endpoint sudah definitif.
- [x] **Internal Consistency**: Rute `/repositori` konsisten di seluruh navigasi; struktur fakultas mengacu pada 7 fakultas resmi UMC.
- [x] **Scope Check**: Terfokus pada refactor halaman publik Repositori (`RepositoriPage.tsx`), routing, dan navbar tanpa merusak skema backend.
- [x] **Ambiguity Check**: Redirect `/e-resource` menggunakan `<Navigate replace />` untuk backward compatibility.
