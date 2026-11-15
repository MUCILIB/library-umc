# 04: Audit peminjaman dan pengembalian

**Spec:** docs/specs/audit-log-hardening.md

**Blocked by:** 01

**Status:** planned

**What to build:** Petakan transisi nyata peminjaman/pengembalian; satu event per mutasi sukses; actor dan target tepat; snapshot/diff; rollback dan detail UI dibuktikan melalui HTTP+DB.

- [ ] Kontrak perilaku diverifikasi dari kode sebelum implementasi.
- [ ] Test RED dijalankan dan gagal karena perilaku yang belum tersedia.
- [ ] Implementasi minimum membuat test GREEN; mock tidak menjadi bukti persistensi.
- [ ] UI/pembaca mendukung event domain ini serta log legacy.
- [ ] Typecheck, tes relevan dan review selesai dengan bukti nyata.

Tidak ada izin reset database produksi, penghapusan log, dependency baru, atau klaim sertifikasi. Status hanya menjadi ready-for-agent setelah plan domain siap.
