# 07: Audit reservasi dan pembatalan

**Spec:** docs/specs/audit-log-hardening.md

**Blocked by:** 01

**Status:** planned

**What to build:** Inventaris transisi manual dan scheduler; actor sistem diberi identitas eksplisit tanpa mengarang user; satu event per transisi committed; atomicity, redaksi dan detail UI diuji.

- [ ] Kontrak perilaku diverifikasi dari kode sebelum implementasi.
- [ ] Test RED dijalankan dan gagal karena perilaku yang belum tersedia.
- [ ] Implementasi minimum membuat test GREEN; mock tidak menjadi bukti persistensi.
- [ ] UI/pembaca mendukung event domain ini serta log legacy.
- [ ] Typecheck, tes relevan dan review selesai dengan bukti nyata.

Tidak ada izin reset database produksi, penghapusan log, dependency baru, atau klaim sertifikasi. Status hanya menjadi ready-for-agent setelah plan domain siap.
