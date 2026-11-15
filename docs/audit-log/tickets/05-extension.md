# 05: Audit keputusan perpanjangan

**Spec:** docs/specs/audit-log-hardening.md

**Blocked by:** 04

**Status:** planned

**What to build:** Permintaan/approval/rejection dibedakan; tanggal sebelum/sesudah tepat; penolakan bisnis berbeda dari kegagalan sistem; atomicity dan detail UI diuji.

- [ ] Kontrak perilaku diverifikasi dari kode sebelum implementasi.
- [ ] Test RED dijalankan dan gagal karena perilaku yang belum tersedia.
- [ ] Implementasi minimum membuat test GREEN; mock tidak menjadi bukti persistensi.
- [ ] UI/pembaca mendukung event domain ini serta log legacy.
- [ ] Typecheck, tes relevan dan review selesai dengan bukti nyata.

Tidak ada izin reset database produksi, penghapusan log, dependency baru, atau klaim sertifikasi. Status hanya menjadi ready-for-agent setelah plan domain siap.
