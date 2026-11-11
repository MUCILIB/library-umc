# UMC Library Management System
> Sistem Informasi Perpustakaan & Repositori Digital Universitas Muhammadiyah Cirebon (UMC) berbasis arsitektur monorepo modern (Express.js TypeScript + React Vite).

---

## 📌 Daftar Isi
- [Ringkasan Proyek](#-ringkasan-proyek)
- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Struktur Monorepo](#-struktur-monorepo)
- [Panduan Memulai (Quick Start)](#-panduan-memulai-quick-start)
  - [Prasyarat](#prasyarat)
  - [Instalasi Dependensi](#1-instalasi-dependensi)
  - [Konfigurasi Environment](#2-konfigurasi-environment)
  - [Setup Database & Seeding](#3-setup-database--seeding)
  - [Menjalankan Aplikasi](#4-menjalankan-aplikasi-development)
- [Pengujian & Kualitas Kode](#-pengujian--kualitas-kode)
- [Deployment](#-deployment)
- [Keamanan & Best Practices](#-keamanan--best-practices)

---

## 📖 Ringkasan Proyek
UMC Library adalah platform terpadu untuk otomasi layanan perpustakaan fisik, pembacaan e-book, repositori karya ilmiah/tugas akhir mahasiswa, serta pencatatan buku tamu mandiri di lingkungan Universitas Muhammadiyah Cirebon.

Platform ini mengintegrasikan struktur akademik resmi UMC (7 Fakultas dan 21 Program Studi) ke dalam katalog koleksi, klasifikasi subjek, dan alur persetujuan repositori akademik.

---

## ✨ Fitur Utama

### 1. Portal Pemustaka (Katalog & Layanan Mandiri)
- **Katalog Cerdas**: Pencarian real-time berdasarkan judul, pengarang, ISBN, atau subjek.
- **Filtering Multi-Kategori**: Penyaringan berdasarkan ketersediaan eksemplar fisik, jenis koleksi (Buku Fisik / E-Book), serta fakultas terafiliasi.
- **Detail Bibliografi & Stok**: Menampilkan nomor panggil DDC, rak penempatan, status ketersediaan eksemplar per item, dan QR code inventaris.
- **E-Book Reader Terproteksi**: Pembacaan dokumen PDF digital langsung di peramban dengan proteksi stream token.

### 2. Sirkulasi & Eksemplar
- **Peminjaman & Pengembalian**: Validasi peminjaman berbasis QR scanner kartu anggota dan barcode eksemplar.
- **Manajemen Denda & Perpanjangan**: Perhitungan denda keterlambatan otomatis dan alur konfirmasi pengembalian fisik.
- **Pelacakan Eksemplar**: Manajemen status inventaris buku (`available`, `borrowed`, `lost`, `maintenance`, `damaged`).

### 3. Repositori Digital Karya Ilmiah
- **Unggah Tugas Akhir & Skripsi**: Mahasiswa dapat mengajukan dokumen skripsi/jurnal berdasarkan prodi dan fakultas.
- **Alur Verifikasi Bertingkat**: Persetujuan oleh admin/pustakawan sebelum karya ilmiah dipublikasikan ke publik.
- **Secure Watermark & Access Control**: Pembatasan preview publik (maksimal 10 halaman) dan autentikasi penuh untuk dokumen lengkap.

### 4. Buku Tamu Mandiri (Visitor Kiosk)
- Presensi mandiri untuk Mahasiswa UMC (input NIM), Dosen/Tendik (NIP/NIDN), serta Tamu Umum/Instansi luar.
- Dashboard metrik statistik lalu lintas pengunjung harian dan bulanan.

### 5. CMS Situs & Pengaturan Mandiri
- Panel pengaturan banner pengumuman beranda, jam operasional perpustakaan, tautan media sosial, serta manajemen konten profil tanpa deploy ulang.

---

## 🛠 Tech Stack

### Backend (`library-be`)
- **Runtime**: Node.js (TypeScript)
- **Framework**: Express.js v5
- **Database & ORM**: PostgreSQL via Drizzle ORM
- **Autentikasi**: Better Auth (Session Cookie, MFA, Role-Based Access Control)
- **Validasi Data**: Zod
- **Media & Dokumen**: S3 Storage (AWS / MinIO) + Cloudinary
- **Ekspor & Laporan**: ExcelJS (Spreadsheet) & PDFKit (Kwitansi & Berita Acara)
- **Email Service**: Resend API

### Frontend (`library-fe`)
- **Framework**: React 19 + TypeScript
- **Routing**: React Router v7
- **Build Tool**: Vite 7
- **Styling**: TailwindCSS v4, Radix UI Primitives, Lucide Icons, Tabler Icons
- **Animasi & Interaksi**: Motion / Framer Motion
- **Data Visualization**: Recharts
- **Toast Notifications**: Sonner

### Quality & Testing
- **Unit & Integration Testing**: Vitest (FE & BE)
- **End-to-End (E2E) Testing**: Playwright Test Suite
- **Linter & Type Checking**: ESLint 9 + TypeScript strict mode

---

## 📁 Struktur Monorepo

```text
library-umc/
├── library-be/                      # Backend REST API Service
│   ├── src/
│   │   ├── db/                      # Skema Drizzle ORM, koneksi, & seeder
│   │   ├── modules/                 # Modul fitur (auth, bibliography, item, loan, repo, cms, dll.)
│   │   ├── middleware/              # Auth guard, rate limit, upload multer
│   │   └── utils/                   # Helper S3, formatter, validator
│   ├── scripts/                     # Script operasional database & migrasi
│   ├── package.json
│   └── tsconfig.json
│
├── library-fe/                      # Frontend SPA Client
│   ├── public/                      # Aset statis publik (cover buku SVG, logo)
│   ├── src/
│   │   ├── api/                     # HTTP client & service caller
│   │   ├── components/              # Komponen UI modular (katalog, dialog, reader, navbar)
│   │   ├── hooks/                   # Custom React hooks (useBookList, useAuth, dll.)
│   │   ├── pages/                   # Halaman publik & panel dashboard admin
│   │   └── utils/                   # Helper URL gambar, formattings
│   ├── e2e/                         # Playwright E2E test specs
│   ├── package.json
│   └── vite.config.ts
│
├── .github/workflows/               # GitHub Actions CI/CD Pipeline
└── README.md
```

---

## 🚀 Panduan Memulai (Quick Start)

### Prasyarat
- **Node.js**: versi `20.x` atau lebih baru
- **npm**: versi `10.x` atau lebih baru
- **PostgreSQL**: versi `15+` (lokal atau cloud instance)

### 1. Instalasi Dependensi

```bash
# Clone repository
git clone https://github.com/MUCILIB/library-umc.git
cd library-umc

# Pasang dependensi Backend
cd library-be
npm install

# Pasang dependensi Frontend
cd ../library-fe
npm install
```

### 2. Konfigurasi Environment

Salin contoh berkas konfigurasi pada masing-masing direktori:

#### Backend (`library-be/.env`)
```bash
cd library-be
cp .env.example .env
```
Isi konfigurasi penting:
- `DATABASE_URL`: Connection string PostgreSQL (`postgresql://user:pass@host:5432/dbname`)
- `PORT`: Port server backend (default: `4000`)
- `BETTER_AUTH_SECRET`: Secret hash autentikasi
- `BETTER_AUTH_URL`: Base URL backend (`http://localhost:4000` atau URL production)
- `CORS_ORIGIN`: Domain frontend yang diizinkan (`http://localhost:5173`)
- `S3_*` / `CLOUDINARY_*`: Kredensial penyimpanan berkas dokumen & sampul buku

#### Frontend (`library-fe/.env`)
```bash
cd ../library-fe
cp .env.example .env
```
Isi konfigurasi penting:
- `VITE_API_URL`: Alamat API backend (`http://localhost:4000` atau URL live backend)
- `VITE_BETTER_AUTH_URL`: Alamat Better Auth (`http://localhost:4000`)

---

### 3. Setup Database & Seeding

Jalankan perintah berikut di direktori `library-be/`:

```bash
cd library-be

# Jalankan migrasi skema ke database PostgreSQL
npm run db:migrate

# Jalankan seeding data awal (7 Fakultas, 21 Prodi UMC, akun awal)
npm run db:seed
```

> **Catatan Seeding Riil**:  
> Data fakultas dan program studi resmi UMC telah terdaftar otomatis pada master seed (`FEB`, `FISIP`, `FT`, `FKIP`, `FH`, `FIKES`, `FAI`).

---

### 4. Menjalankan Aplikasi (Development)

Buka 2 terminal terpisah:

**Terminal 1 — Backend:**
```bash
cd library-be
npm run dev
# API Service berjalan di http://localhost:4000
# Dokumentasi Swagger UI: http://localhost:4000/api/docs
```

**Terminal 2 — Frontend:**
```bash
cd library-fe
npm run dev
# Antarmuka web berjalan di http://localhost:5173
```

---

## 🧪 Pengujian & Kualitas Kode

Platform ini dilengkapi dengan pengujian menyeluruh di sisi frontend dan backend:

### Menjalankan Unit & Integration Test
```bash
# Test Backend (Vitest - 55 test files, 350+ tests)
cd library-be
npm run test

# Test Frontend (Vitest - 25 test files, 130+ tests)
cd library-fe
npm run test
```

### Typecheck & Linting
```bash
# Backend
cd library-be
npm run build     # tsc typecheck
npm run lint

# Frontend
cd library-fe
npm run build     # tsc -b && vite build
npm run lint
```

### Menjalankan E2E Test (Playwright)
```bash
cd library-fe

# Jalankan seluruh test E2E pada environment lokal
npx playwright test

# Jalankan test verifikasi katalog pada environment live production
npx playwright test --config=playwright.prod.config.ts --project=catalog-prod
```

---

## 🌐 Deployment

| Komponen | Platform Rekomendasi | Konfigurasi Utama |
|---|---|---|
| **Frontend (`library-fe`)** | Vercel | Single-Page Application (SPA) routing + API rewrite proxy via `vercel.json` |
| **Backend (`library-be`)** | VPS / Coolify / Railway | Node.js process manager (PM2 / Docker container) dengan port forwarding |
| **Database** | PostgreSQL Managed (Supabase/Neon/Self-hosted) | Connection pooling direkomendasikan |
| **File Storage** | Dahono S3 / AWS S3 / Cloudinary | Bucket terproteksi untuk dokumen repositori |

---

## 🔒 Keamanan & Best Practices

- **Transitive Dependency Overrides**: Seluruh package-lock diproteksi dari celah keamanan (`minimatch`, `glob`, `uuid`) dengan audit 0 vulnerabilities.
- **Strict Input Validation**: Seluruh endpoint backend divalidasi via skema Zod (mencegah request tampering dan injection).
- **CORS Protection**: Hanya menerima request dari origin resmi yang terdaftar di konfigurasi backend.
- **Sanitasi File Upload**: Validasi MIME type, ekstensi, dan batas ukuran file ketat pada middleware Multer sebelum dialirkan ke S3.
- **Audit Logging**: Setiap aksi penting admin (perubahan katalog, persetujuan repositori, sirkulasi) tercatat dalam tabel audit trail.

---

## 📄 Lisensi & Kontributor
Dikelola oleh Tim Pengembang Perpustakaan Universitas Muhammadiyah Cirebon (**MUCILIB**).
Didistribusikan untuk keperluan operasional akademik internal UMC.
