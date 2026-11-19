# Petunjuk & Konvensi Proyek Perpustakaan UMC (Library UMC)

Dokumen ini berisi aturan dan panduan desain antarmuka serta arsitektur yang disimpan secara permanen untuk memandu setiap interaksi dan pengembangan fitur pada repositori ini.

---

## 1. Aturan Tampilan Resi, Bukti Sirkulasi & Dokumen Bukti (Floating Popup Dialog)

Setiap tampilan resi pengembalian buku (*return receipt*), bukti serah-terima, slip denda, kartu sirkulasi, atau dokumen bukti sah lainnya **WAJIB** disajikan dalam bentuk **Popup Dialog Mengambang (*Floating Modal Dialog*)** di semua layar/halaman aplikasi (baik Dashboard Admin/Pustakawan, Halaman Verifikasi Fisik/Berita Acara, maupun Portal Riwayat Peminjaman Mahasiswa).

### Karakteristik & Desain Dialog:
- **Menggunakan Komponen Standar Proyek:** Wajib menggunakan komponen `Modal` dari `@/components/ui/modal` yang sudah terintegrasi portal, animasi spring, backdrop blur, dan header standar dengan tombol silang `X`.
- **Floating di Tengah Layar:** Menggunakan overlay fixed dengan efek latar belakang gelap buram (`backdrop-blur-sm bg-black/60 dark:bg-black/80`).
- **Rapi & Terisolasi:** Konten resi tidak boleh ditempel secara *flat/inline* langsung di dalam aliran kolom halaman web utama agar tampilan tetap bersih, konsisten, dan rapi.
- **Interaksi Penutupan Fleksibel:**
  - Tombol silang `X` di pojok kanan atas header.
  - Tombol `Tutup` / `Batal` di bagian kanan bawah modal.
  - Menutup otomatis saat menekan tombol keyboard `Escape`.
  - Menutup saat pengguna mengklik area backdrop di luar kartu dialog (*click outside*).
- **Aksi Cetak Langsung (Direct Print):**
  - Tombol aksi utama: **"Cetak Resi"** (tombol maroon `bg-primary text-primary-foreground`) yang langsung memicu dialog pencetakan printer bawaan peramban (*native browser print dialog*) tanpa memaksa pengunduhan file berkas.
  - Tombol aksi sekunder: **"Unduh PDF"** sebagai alternatif dokumen arsip digital.

---

## 2. Kelengkapan Informasi Pemustaka pada Resi & Dokumen Sirkulasi

Setiap resi dan bukti sirkulasi **WAJIB** menyertakan informasi identitas pemustaka secara rinci dalam baris terpisah:
1. **Nama Peminjam / Pemustaka**
2. **NIM / NIDN / No. Kartu Anggota**
3. **Kategori / Peran:** Mahasiswa, Dosen, Tenaga Kependidikan, atau Anggota Luar.
4. **Fakultas:** Wajib ditampilkan secara eksplisit dalam baris khusus tersendiri (misal: *Fakultas Teknik*, *Fakultas Ekonomi dan Bisnis*, dsb., atau strip `-` jika belum terisi).
5. **Program Studi:** Ditampilkan bila tersedia.
6. **Institusi:** Ditampilkan bila anggota berasal dari instansi luar.

---

## 3. Format Struk Thermal Sirkulasi (80mm)

- Resi dicetak dalam format struk sirkulasi standar 80mm menggunakan tipografi *monospace* klasik.
- Memuat kop resmi: **UNIVERSITAS MUHAMMADIYAH CIREBON - UPT PERPUSTAKAAN**.
- Memuat nomor berita acara / resi unik, tanggal & jam serah-terima (WIB), identitas bahan pustaka (Judul, No. Inventaris, Call Number, Tgl Pinjam, Batas Kembali, Tgl Kembali, Kondisi Koleksi), rincian denda (Bebas Denda / Lunas), stempel verifikasi sah, serta nama dan tanda tangan digital petugas pemeriksa.
