# Specification: Sidebar Accordion Tree for CMS Content Management

## 1. Background & Problem Statement
Sebelumnya, pengaturan CMS mandiri MUCILIB (Bilah Pengumuman, Identitas & SEO, Hero Landing, dan Peta & Footer) dikelompokkan dalam satu halaman dashboard monolitik dengan 4 tab horizontal (`Tabs` dari Radix UI).
Meskipun berkas kode telah didekomposisi menjadi sub-modul terpisah (`BannerTab`, `BrandingTab`, `HeroTab`, `FooterLocationTab`), navigasi tab horizontal memiliki keterbatasan:
1. **Navigasi Dangkal**: Tidak memanfaatkan hierarki sidebar utama aplikasi yang kaya.
2. **Keterbatasan Skalabilitas**: Jika di kemudian hari ditambahkan modul CMS baru (misalnya *FAQ Interaktif*, *Galeri Kampus*, atau *Agenda Perpustakaan*), bilah tab horizontal akan sesak (*cramped*).
3. **Ketiadaan Deep Routing**: Pengguna tidak dapat melompat langsung ke sub-halaman tertentu dari sidebar utama.

## 2. Proposed Architecture & Solution (Opsi 2: Sidebar Accordion Tree)
Mengubah entri menu **"Manajemen Konten (CMS)"** di sidebar dashboard `SuperAdminDashboard.tsx` menjadi item menu **Collapsible/Accordion** dengan sub-menu anak (*child items*).

### 2.1 Struktur Menu Sidebar
Di dalam kelompok menu **"Pengaturan & Audit"**:
- 📂 **Manajemen Konten (CMS)** (Parent Item dengan chevron toggle)
  - 📣 **Bilah Pengumuman** (`cms-banner`)
  - 🌐 **Identitas & SEO** (`cms-branding`)
  - 🖼️ **Hero Landing Page** (`cms-hero`)
  - 📍 **Peta & Footer** (`cms-location`)

### 2.2 Perilaku Navigasi (Interactions)
1. **Auto-Expand**: Jika `activeMenu` diawali dengan `cms-` (misal `cms-branding`), accordion menu CMS secara otomatis dalam keadaan terbuka (*expanded*).
2. **Toggle Manual**: Mengklik panah chevron atau nama parent akan membuka/menutup daftar sub-menu. Jika parent diklik saat tertutup, sistem secara default mengarahkan ke sub-menu pertama (`cms-banner`).
3. **Highlight State**:
   - Sub-menu yang sedang aktif mendapatkan visual highlight primer.
   - Parent CMS menu menampilkan indikator aktif lembut (*subtle active indicator*) jika salah satu sub-itemnya sedang aktif.
4. **Mobile & Collapsed Mode**:
   - Dalam mode sidebar mengecil (icon-only), mengklik ikon CMS akan membuka flyout atau beralih ke sub-menu aktif.

### 2.3 Perubahan di Area Konten (Page View)
1. Menghapus horizontal tab bar di atas konten CMS.
2. Setiap sub-menu dirender langsung secara mandiri (*full-width focused view*) dengan header yang sesuai:
   - `cms-banner` -> Merender pratinjau langsung + form kontrol bilah siaran sticky.
   - `cms-branding` -> Merender upload logo resmi S3, upload favicon S3, judul situs, tagline, dan SEO meta.
   - `cms-hero` -> Merender upload hero background S3, judul hero, subjudul, kata kunci cepat, dan search placeholder.
   - `cms-location` -> Merender form Google Maps embed/direct link, gedung perpustakaan, kontak, motto, dan tautan sosial media.
3. Tetap mempertahankan tombol *"Segarkan Data"* di header halaman untuk sinkronisasi live data.

### 2.4 Kompatibilitas RBAC & Keamanan
- `useRolePermissions`: Pengecekan izin untuk sub-kunci `cms-*` otomatis mewarisi (*fallback*) izin dari menu payung `cms`.
- Tidak ada breaking change pada database schema, Drizzle ORM, maupun endpoint API backend yang sudah berjalan.

## 3. Success Metrics & Verification
- Unit test Vitest FE memvalidasi rendering sub-menu accordion dan seleksi item.
- Build frontend (`bun run build`) berhasil tanpa error TypeScript.
- Test E2E Playwright memverifikasi klik navigasi sidebar accordion hingga form ter-render sempurna.
