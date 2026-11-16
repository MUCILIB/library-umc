# Kompatibilitas migrasi CSV SLiMS

## Tujuan
Pustakawan mengimpor bibliografi dan eksemplar dari SLiMS tanpa input ulang, dengan preview konflik dan export format SLiMS yang mempertahankan informasi sumber.

## Referensi
- SLiMS lokal: C:/laragon/www/slims9/admin/modules/bibliography/{export,item_export}.php.
- CSV repo: senayan_biblio_export (2).csv dan senayan_item_export_kloter 5.csv.
- Baseline nyata: 56 bibliografi berhasil, 127 item otomatis; 96 detail item seluruhnya dilewati sebagai duplicate. Sumber sendiri memiliki 57 konflik judul/call number dan kode S250197401 dipakai dua judul.

## Kontrak
- Bibliografi SLiMS memiliki 18 kolom; item 19 kolom. Format Library yang diperluas tetap tersedia.
- Pertahankan urutan penulis dan penanda Dkk/et al.; kolom multivalue menggunakan <nilai>.
- Parser menerima delimiter koma/titik koma, BOM, quotes dan multiline. Normalisasi newline literal SLiMS harus eksplisit.
- Mode import pasangan menunda auto-create item sampai detail item diproses. Alur bibliografi-only lama tetap kompatibel.
- Kode item menjadi identitas eksemplar. Pengisian ulang hanya pada identitas bibliografi yang cocok dan melalui preview; jangan menimpa item aktif/loaned atau data lama diam-diam.
- Kode sama untuk judul berbeda, judul ambigu, serta konflik dua CSV ditahan sebagai konflik dengan nomor baris dan alasan.
- Nilai sumber, khususnya kosong/0/harga/tanggal/supplier/lokasi, tidak hilang karena default aplikasi. Tanggal sumber terpisah dari timestamp internal.
- Import ulang tidak menggandakan bibliografi/item. Identitas bibliografi tidak boleh ditentukan hanya oleh judul.
- Kode bibliografi tanpa detail item dilaporkan sebagai belum lengkap dalam mode pasangan.
- Persetujuan dan laporan menyajikan inserted/updated/unchanged/conflict/failed, dapat dilanjutkan setelah kegagalan tanpa retry tak berujung.

## Pengujian
Boundary: public ImportService -> DB PostgreSQL terisolasi -> public ExportService. Unit export memanggil service nyata dengan mock boundary query DB. Jangan menyalin algoritma serializer sebagai test.
- Uji satu perubahan per RED -> GREEN.
- Bandingkan data hasil parse, bukan byte CSV atau urutan baris.
- Jangan menonaktifkan perlindungan formula spreadsheet demi kesamaan byte.
- DB production dan DB SLiMS asli tidak digunakan untuk fixture/mutasi pengujian.
- Uji import balik ke salinan database SLiMS sebelum klaim kompatibilitas dua arah penuh.

## Tahapan
1. Pelestarian penulis saat export: urutan dan Dkk; regression test service serta verifikasi DB uji nyata.
2. Export format SLiMS 18/19 kolom melalui API dan UI, tanpa mengubah default format Library.
3. Import pasangan, validasi konflik dan laporan preview; idempotensi dan pengisian detail item aman.
4. Penyimpanan detail sumber dan mapping seluruh kolom; migrasi aditif bila dibutuhkan.
5. Alur UI upload pasangan dan laporan, uji browser serta import balik SLiMS salinan.
