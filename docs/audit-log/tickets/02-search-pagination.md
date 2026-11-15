# 02: Telusuri seluruh riwayat

**Spec:** docs/specs/audit-log-hardening.md

**Blocked by:** 01

**Status:** planned

**What to build:** S09–S10 dan S15: pencarian/filter server, limit 1–100 default 20, total/hasMore, urutan stabil, timezone eksplisit, literal wildcard, query invalid 400, indeks dan UI pagination.

- [ ] Kontrak perilaku diverifikasi dari kode sebelum implementasi.
- [ ] Test RED dijalankan dan gagal karena perilaku yang belum tersedia.
- [ ] Implementasi minimum membuat test GREEN; mock tidak menjadi bukti persistensi.
- [ ] UI/pembaca mendukung event domain ini serta log legacy.
- [ ] Typecheck, tes relevan dan review selesai dengan bukti nyata.

Tidak ada izin reset database produksi, penghapusan log, dependency baru, atau klaim sertifikasi. Status hanya menjadi ready-for-agent setelah plan domain siap.
