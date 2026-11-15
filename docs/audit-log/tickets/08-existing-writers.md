# 08: Selaraskan penulis audit yang sudah ada

**Spec:** docs/specs/audit-log-hardening.md

**Blocked by:** 01

**Status:** planned

**What to build:** Inventaris semua helper dan insert logs langsung; migrasikan bibliography/category/faculty/study_program/item/QR yang sudah mencatat. Jangan menghasilkan event ganda. Pertahankan transaksi QR. Masing-masing domain diuji dan ditinjau; pecah lagi jika terlalu besar.

- [ ] Kontrak perilaku diverifikasi dari kode sebelum implementasi.
- [ ] Test RED dijalankan dan gagal karena perilaku yang belum tersedia.
- [ ] Implementasi minimum membuat test GREEN; mock tidak menjadi bukti persistensi.
- [ ] UI/pembaca mendukung event domain ini serta log legacy.
- [ ] Typecheck, tes relevan dan review selesai dengan bukti nyata.

Tidak ada izin reset database produksi, penghapusan log, dependency baru, atau klaim sertifikasi. Status hanya menjadi ready-for-agent setelah plan domain siap.
