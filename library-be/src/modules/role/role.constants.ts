export interface SidebarMenuItem {
  key: string;
  label: string;
  group: string;
  description: string;
}

export const SIDEBAR_MENUS: SidebarMenuItem[] = [
  // Utama
  {
    key: "dashboard",
    label: "Dashboard",
    group: "Utama",
    description: "Statistik umum, grafik pengunjung, dan ringkasan perpustakaan",
  },

  // Sirkulasi & Layanan
  {
    key: "circulation",
    label: "Sirkulasi & Scan",
    group: "Sirkulasi & Layanan",
    description: "Peminjaman cepat dengan pemindai barcode / RFID",
  },
  {
    key: "loans",
    label: "Peminjaman & Persetujuan",
    group: "Sirkulasi & Layanan",
    description: "Daftar peminjaman aktif, riwayat, dan perpanjangan",
  },
  {
    key: "returnApprovals",
    label: "Konfirmasi Pengembalian",
    group: "Sirkulasi & Layanan",
    description: "Verifikasi berita acara pengembalian buku dan tanda tangan",
  },
  {
    key: "fines",
    label: "Manajemen Denda",
    group: "Sirkulasi & Layanan",
    description: "Pencatatan dan verifikasi pembayaran denda keterlambatan",
  },
  {
    key: "cardApprovals",
    label: "Persetujuan Kartu",
    group: "Sirkulasi & Layanan",
    description: "Persetujuan penerbitan kartu baru dan perpanjangan masa aktif",
  },

  // Manajemen Koleksi
  {
    key: "bibliographies",
    label: "Bibliografi (Buku)",
    group: "Manajemen Koleksi",
    description: "Katalog judul buku, pengarang, penerbit, dan klasifikasi",
  },
  {
    key: "items",
    label: "Item Eksemplar",
    group: "Manajemen Koleksi",
    description: "Manajemen fisik eksemplar buku, barcode, dan nomor inventaris",
  },
  {
    key: "ebooks",
    label: "E-Book Digital",
    group: "Manajemen Koleksi",
    description: "Koleksi buku elektronik dan viewer digital",
  },
  {
    key: "repository",
    label: "Repositori Skripsi",
    group: "Manajemen Koleksi",
    description: "Karya ilmiah, skripsi, dan kontrol akses dokumen",
  },
  {
    key: "recommendations",
    label: "Rekomendasi Buku",
    group: "Manajemen Koleksi",
    description: "Daftar usulan pengadaan buku baru dari civitas akademika",
  },
  {
    key: "importData",
    label: "Import Data",
    group: "Manajemen Koleksi",
    description: "Import massal bibliografi dan eksemplar format CSV / SLiMS",
  },
  {
    key: "exportData",
    label: "Export Data",
    group: "Manajemen Koleksi",
    description: "Export data koleksi, anggota, dan log ke CSV atau PDF ber-kop",
  },

  // Master Data
  {
    key: "fakultas",
    label: "Fakultas",
    group: "Master Data",
    description: "Data master fakultas di lingkungan universitas",
  },
  {
    key: "prodi",
    label: "Program Studi",
    group: "Master Data",
    description: "Data master program studi per fakultas",
  },
  {
    key: "locations",
    label: "Lokasi Rak",
    group: "Master Data",
    description: "Data master lokasi rak dan penempatan fisik buku",
  },

  // Pengaturan & Audit
  {
    key: "guests",
    label: "Data Pengunjung",
    group: "Pengaturan & Audit",
    description: "Buku tamu dan pencatatan presensi pengunjung perpustakaan",
  },
  {
    key: "users",
    label: "Manajemen User & Role",
    group: "Pengaturan & Audit",
    description: "Kelola akun pengguna, penetapan role, dan hak akses matriks",
  },
  {
    key: "audit",
    label: "Audit Log",
    group: "Pengaturan & Audit",
    description: "Rekam jejak aktivitas sensitif dan perubahan data sistem",
  },
  {
    key: "reports",
    label: "Laporan & Statistik",
    group: "Pengaturan & Audit",
    description: "Laporan analitik sirkulasi, pengunjung, dan keterlambatan",
  },
];

export const SYSTEM_ROLE_IDS = [
  "super_admin",
  "staff",
  "lecturer",
  "student",
] as const;

export type SystemRoleId = (typeof SYSTEM_ROLE_IDS)[number];

export const DEFAULT_SYSTEM_ROLES = [
  {
    id: "super_admin",
    name: "Super Admin",
    description: "Akses penuh tanpa batas ke seluruh modul dan konfigurasi sistem",
    isSystem: true,
  },
  {
    id: "staff",
    name: "Staf Perpustakaan",
    description: "Pengelolaan operasional sirkulasi, katalog koleksi, dan pelayanan peminjam",
    isSystem: true,
  },
  {
    id: "lecturer",
    name: "Dosen",
    description: "Akses peminjaman civitas akademika, repositori skripsi, dan usulan buku",
    isSystem: true,
  },
  {
    id: "student",
    name: "Mahasiswa",
    description: "Peminjaman buku umum, pencarian katalog, dan kartu anggota digital",
    isSystem: true,
  },
];
