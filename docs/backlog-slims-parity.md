# Backlog SLiMS Library

Sisa agar export/import Library setara SLiMS penuh. Belum dikerjakan; jangan diklaim selesai.

## Basis terverifikasi

- Export SLiMS 18/19 kolom, header cocok file sumber, delimiter `;`/`,`, BOM, quoting, urutan penulis + `Dkk`.
- Import baca CSV SLiMS, tolak konflik kode/judul, laporan kelengkapan pasangan hilang vs ekstra.
- Preview CSV nyata: 38 valid / 58 konflik; 56 bibliografi + 127 item utuh.
- Commit lokal: `5a49cb0`, `458dba3`, `bcaf967`, `f48d0b2`.

## Sisa

1. **File sumber SLiMS lengkap dan konsisten**
   - Kloter 5 hanya 96 dari 127 kode; 32 kode hilang: S250193211–219 (9), S250193503–509 (7), S250193703–705 (3), S250194810 (1), S250196702/703 (2), S250196903/904 (2), S250197302–307 (6), S250197402/403 (2).
   - 58 baris konflik judul/call-number vs bibliografi; `S250197401` dipakai dua judul (`Landasan Pendidikan` vs `Mengenal Dan Memahami Paud`, baris 74–75 file item).
   - Butuh export item SLiMS lengkap di waktu sama dengan export bibliografi + keputusan pustakawan atas konflik.

2. **Preservasi detail sumber penuh**
   - Baru `site/source/invoice` yang dilengkapi. Harga, tanggal, supplier, lokasi rak, tipe koleksi masih raw evidence.
   - Butuh migrasi aditif + contract test; status/QR/loan tidak tersentuh.

3. **Dedup dan pasangan penuh**
   - Identitas bibliografi tidak boleh judul saja; auto-create pasangan penuh belum ada.

4. **Bukti dua arah**
   - Import pasangan penuh di DB uji → export ulang → banding data pasca-parsing.
   - Import balik ke salinan SLiMS + E2E browser live.

## Aturan

- Hanya DB uji terisolasi; tanpa tulis production/SLiMS asli.
- Konflik tetap ditahan, tidak ditimpa diam-diam.
