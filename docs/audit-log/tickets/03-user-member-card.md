# 03: Audit user, anggota dan kartu

**Spec:** docs/specs/audit-log-hardening.md

**Blocked by:** 01

**Status:** planned

**What to build:** Inventaris mutasi dan transisi yang tersedia; entity dan ID target sesuai; approval/rejection dibedakan; snapshot dan diff allowlist; rollback mutasi penting; detail tampil di UI; regresi auth.

- [ ] Kontrak perilaku diverifikasi dari kode sebelum implementasi.
- [ ] Test RED dijalankan dan gagal karena perilaku yang belum tersedia.
- [ ] Implementasi minimum membuat test GREEN; mock tidak menjadi bukti persistensi.
- [ ] UI/pembaca mendukung event domain ini serta log legacy.
- [ ] Typecheck, tes relevan dan review selesai dengan bukti nyata.

Tidak ada izin reset database produksi, penghapusan log, dependency baru, atau klaim sertifikasi. Status hanya menjadi ready-for-agent setelah plan domain siap.
