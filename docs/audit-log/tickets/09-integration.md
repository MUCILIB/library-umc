# 09: Verifikasi integrasi dan deployment

**Spec:** docs/specs/audit-log-hardening.md

**Blocked by:** 02, 03, 04, 05, 06, 07, 08

**Status:** planned

**What to build:** Migration rehearsal mempertahankan row legacy; suite penuh dan build; verifikasi UI; periksa timezone/trusted proxy/privilege aplikasi berdasarkan deployment nyata; catat keterbatasan tanpa klaim compliance; proses uji ditutup.

- [ ] Kontrak perilaku diverifikasi dari kode sebelum implementasi.
- [ ] Test RED dijalankan dan gagal karena perilaku yang belum tersedia.
- [ ] Implementasi minimum membuat test GREEN; mock tidak menjadi bukti persistensi.
- [ ] UI/pembaca mendukung event domain ini serta log legacy.
- [ ] Typecheck, tes relevan dan review selesai dengan bukti nyata.

Tidak ada izin reset database produksi, penghapusan log, dependency baru, atau klaim sertifikasi. Status hanya menjadi ready-for-agent setelah plan domain siap.
