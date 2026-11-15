# Spec: Perbaikan audit log library

Status: disetujui pengguna; rencana tahap pertama disusun, belum diimplementasikan.
Baseline kode: 7a67218.
Acuan: OWASP Logging Cheat Sheet, bukan klaim sertifikasi compliance.

## Problem Statement

Super admin belum dapat merekonstruksi perubahan penting dengan andal. Event role memakai entity Users, detail tidak seragam, identitas actor mengikuti profil terkini, pencarian UI terbatas pada 100 log, dan kegagalan penulisan audit dapat diabaikan setelah mutasi berhasil.

Bukti baseline berasal dari pembacaan kode. Row database produksi belum diperiksa. Dua tes audit login sebelumnya lulus dengan mock; ini tidak membuktikan persistensi atau rollback database.

## Solution

Pertahankan tabel logs dan pola Express, Drizzle, React, Zod, serta Vitest yang tersedia. Perluas format secara kompatibel. Mulai dari satu alur lengkap perubahan role/permission sampai tampil di detail audit, kemudian perluas ke aktivitas perpustakaan. Tidak menambah dependency atau layanan baru.

Keberhasilan berarti admin dapat menjawab siapa, melakukan apa, terhadap objek mana, kapan, hasilnya, dan nilai relevan yang berubah. Riwayat tetap terbaca setelah profil atau objek berubah.

## User Stories

1. Sebagai super admin, saya ingin mengetahui role mana yang dibuat, diubah, atau dihapus agar target aktivitas tidak tertukar dengan user.
2. Sebagai super admin, saya ingin melihat permission sebelum dan sesudah perubahan agar pemberian akses dapat ditelusuri.
3. Sebagai pemeriksa, saya ingin identitas actor saat kejadian tetap tersedia setelah profil berubah.
4. Sebagai pemeriksa, saya ingin objek yang dihapus tetap memiliki label historis minimum.
5. Sebagai operator, saya ingin mutasi penting dibatalkan jika audit gagal disimpan agar tidak ada perubahan berhasil tanpa riwayat.
6. Sebagai pemeriksa, saya ingin approval dan rejection dapat dibedakan tanpa menafsirkan teks bebas.
7. Sebagai super admin, saya ingin menelusuri seluruh log melalui pencarian, filter, dan pagination server.
8. Sebagai super admin, saya ingin membuka detail perubahan tanpa UUID atau JSON panjang memenuhi tabel.
9. Sebagai pemilik data, saya ingin password, token, cookie, dan secret tidak disimpan dalam audit.
10. Sebagai pemeriksa, saya ingin log lama tetap terbaca dengan penanda bahwa snapshot historis tidak tersedia.
11. Sebagai pemilik sistem, saya ingin akses riwayat dibatasi dan aplikasi tidak menyediakan operasi edit/hapus audit.
12. Sebagai pemeriksa, saya ingin event peminjaman, pengembalian, perpanjangan, denda, reservasi, dan keanggotaan tercatat sesuai transisi bisnis yang benar-benar tersedia.

## Implementation Decisions

### Kontrak event

- Pertahankan id, userId, action, entity, entityId, detail, ipAddress, userAgent, dan createdAt untuk kompatibilitas penulis lama.
- Tambahkan eventType stabil, outcome, actorSnapshot, targetSnapshot, changes, dan metadata terstruktur. Gunakan kolom JSONB untuk struktur, dengan validasi aplikasi.
- eventType membedakan role.created, role.updated, role.deleted, dan role.permissions_updated. Action tetap kategori umum create/update/delete. Entity role harus menunjuk ID role, bukan Users.
- Actor berasal dari autentikasi server; client tidak boleh menetapkan actor, outcome, snapshot, atau waktu audit.
- Snapshot actor hanya ID, nama, dan role saat kejadian. Email tidak disalin secara default. Snapshot target berisi ID, tipe, dan label minimum yang diperlukan.
- changes hanya field yang benar-benar berubah dan diizinkan per event. Untuk permission, catat menuKey dan boolean sebelum/sesudah; jangan menyalin seluruh request.
- Ringkasan dibentuk server dari event terstruktur, bukan payload bebas client. Detail lama tetap dapat ditampilkan sebagai teks.
- Gunakan outcome success/failure/denied bila relevan. Penolakan permintaan bisnis yang sah adalah aksi reject dengan outcome success; akses terlarang adalah denied.
- Tidak ada perubahan nilai berarti tidak menghasilkan event mutasi berhasil. Penolakan keamanan dan kegagalan penting dapat menghasilkan event terpisah.

### Konsistensi transaksi

- Penulisan audit untuk mutasi bisnis penting memakai transaksi database yang sama dan meneruskan error, bukan helper yang menelan error.
- Pembacaan nilai before dan perubahan harus memakai transaksi serta penguncian atau kontrol concurrency yang sesuai agar before benar-benar nilai yang diubah.
- Setiap mutasi menghasilkan satu event keberhasilan. Controller tidak lagi menulis event kedua setelah service berhasil.
- Kegagalan autentikasi/otorisasi dicatat di luar transaksi bisnis yang gagal. Kegagalan pencatatan keamanan tidak boleh mengubah hasil autentikasi menjadi berhasil; gunakan logger operasional yang sudah ada tanpa secret.
- Jangan mengubah kebijakan semua pemanggil helper lama sekaligus. Migrasikan per alur dan buktikan atomicity pada setiap alur yang dimigrasikan.

### Perlindungan dan batas jaminan

- Metadata memakai allowlist per event, batas ukuran string/objek, serta normalisasi control character untuk ringkasan. UI merender nilai sebagai teks, bukan HTML.
- Jangan simpan password/hash, OTP, token, cookie, authorization header, connection string, atau request/response utuh. Redaksi berlaku juga untuk pesan error.
- Gunakan req.ip sesuai konfigurasi trusted proxy yang benar-benar dipakai deployment; jangan percaya X-Forwarded-For mentah.
- Akses daftar dan detail tetap hanya super_admin melalui middleware server. Tidak menambah endpoint update/delete log.
- Periksa privilege role database aplikasi; terapkan INSERT/SELECT tanpa UPDATE/DELETE pada logs jika pemisahan kredensial migrasi tersedia. Bila tidak, catat keterbatasan deployment secara eksplisit.
- Ini belum menjamin bukti tahan perubahan oleh pemilik database. Hash chain, WORM, SIEM, dan layanan eksternal tidak masuk scope.

### Migrasi dan kompatibilitas

- Gunakan expand–migrate: kolom terstruktur baru nullable untuk row lama. Pembaca mendukung format lama dan baru selama penulis dimigrasikan.
- Jangan menebak snapshot dari profil sekarang dan menyebutnya identitas historis. Untuk legacy, labeli identitas hasil join sebagai profil saat ini dan snapshot sebagai tidak tersedia.
- Tidak mengubah entity Users pada row lama menjadi role tanpa bukti. Tidak menghapus log atau melakukan reset database.
- Waktu event baru wajib berasal dari server/database dan disimpan dengan timezone. Sebelum konversi timestamp lama, pastikan interpretasi timezone deployment dengan bukti; jika tidak diketahui, pertahankan nilai lama tanpa asumsi konversi.
- Migrasi timezone dan NOT NULL harus didahului pemeriksaan row null serta penanganan yang terdokumentasi. Jangan mengisi tanggal historis kosong dengan waktu migrasi seolah waktu kejadian.
- Tambahkan indeks untuk urutan waktu/id serta filter actor atau entity berdasarkan query yang diterapkan; hindari indeks setiap kolom tanpa kebutuhan.

### API dan tabel

- Pertahankan data berupa array dan tambahkan pagination berisi limit, offset, total, dan hasMore. Filter tersedia untuk action, entity, eventType, actorId, entityId, q, from, dan to.
- Default limit 20, maksimum 100. limit harus integer 1–100; offset integer nonnegatif; q maksimal 200 karakter; tanggal ISO dengan timezone dan from <= to. Input invalid menghasilkan 400, bukan error database.
- Rentang waktu memakai from inklusif dan to eksklusif. API menerima instant ISO; UI mengonversi pilihan tanggal lokal secara eksplisit dan menampilkan timezone.
- Pencarian mencakup ringkasan, label snapshot, ID actor/target, dan detail legacy. Nilai pencarian di-parameterize; wildcard diperlakukan sesuai kontrak literal.
- Urutan createdAt DESC, id DESC. Row legacy tanpa waktu ditempatkan terakhir. Total mengikuti filter yang sama dengan data.
- Offset pagination menjamin urutan deterministik untuk dataset tetap; event baru dapat menggeser halaman saat refresh. Cursor pagination ditunda kecuali kebutuhan konsistensi lintas halaman mengharuskannya.
- Tabel menampilkan waktu, pelaku, aktivitas, objek, ringkasan, dan tombol detail. Panel detail menampilkan before/after, outcome, ID, IP, serta user agent sesuai hak akses.
- UI mempertahankan komponen proyek, dengan loading, error/retry, empty state, fokus keyboard, label input, dan detail yang dapat ditutup lewat keyboard. Filter baru mengembalikan halaman ke awal.

## Testing Decisions

Gunakan perilaku pada batas HTTP sebagai bukti utama: lakukan mutasi melalui endpoint yang tersedia, baca audit melalui endpoint, dan periksa state database uji. Gunakan Supertest/Vitest serta PostgreSQL uji terisolasi yang sudah disediakan proyek. Jangan menjalankan failure injection atau fixture terhadap database produksi.

Mock helper hanya mendukung tes cepat; tidak boleh menjadi bukti atomicity. Tes UI memeriksa interaksi dan hasil terlihat, bukan nama fungsi internal.

### Acceptance scenarios

- S01: Buat role custom; satu event role.created muncul dengan target role dan snapshot actor yang benar.
- S02: Ubah nama/deskripsi role; detail menunjukkan hanya field berubah beserta nilai before/after.
- S03: Ubah satu permission; event role.permissions_updated menunjukkan menu dan boolean yang tepat. Permission lain tidak diklaim berubah.
- S04: Paksa insert audit gagal pada database uji; role/permission tidak berubah dan endpoint tidak mengembalikan sukses.
- S05: Dua perubahan concurrent tidak menghasilkan before yang stale. Setiap event sesuai perubahan yang committed.
- S06: Ubah nama actor setelah event; snapshot lama tetap sama. Hapus target role custom yang boleh dihapus; event historis tetap terbaca.
- S07: Kirim mutasi tanpa perubahan; tidak ada event keberhasilan palsu. Request invalid atau forbidden tidak menghasilkan event mutasi sukses.
- S08: Request daftar/detail tanpa login menghasilkan 401; role selain super_admin menghasilkan 403. UUID event tidak dapat dipakai untuk melewati kontrol akses.
- S09: Seed lebih dari 100 log di database uji, termasuk timestamp sama; filter/search menemukan event lama, total benar, dan urutan stabil pada dataset tetap.
- S10: Limit negatif, desimal, NaN, terlalu besar, query array, tanggal invalid, dan rentang terbalik menghasilkan 400.
- S11: Payload berisi field password/token/cookie dan teks HTML/control character tidak membocorkan secret; teks ditampilkan aman tanpa eksekusi HTML.
- S12: Log legacy tanpa metadata tetap terbaca dan ditandai tanpa snapshot historis, tidak dipoles sebagai data lengkap.
- S13: Approval dan rejection pada kartu/perpanjangan dapat dibedakan; entityId sesuai tipe objek yang dicatat.
- S14: Setiap transisi penting loan/return/fine/reservation yang tercantum dalam matriks event mempunyai tes mutasi dan pembacaan audit; kegagalan bisnis tidak tercatat sebagai sukses.
- S15: UI membuka detail perubahan, menerapkan filter server, berpindah halaman, dan pulih dari error; penggunaan keyboard tetap berfungsi.

## Usulan Urutan Tiket

Ini rancangan urutan, belum tiket yang dipublikasikan. Tiap tiket menyertakan penyimpanan/API/UI/tes yang diperlukan untuk perilakunya, bukan pemisahan backend dan frontend.

1. Role dan permission dapat diaudit end-to-end. Tanpa blocker. Perluasan schema, writer transaksi, pembaca kompatibel, detail UI minimum; S01–S08, S11–S12. Menjadi pola bagi migrasi berikutnya.
2. Seluruh riwayat dapat dicari dan dipaginasi. Diblokir tiket 1 karena memakai kontrak pembaca baru; S09–S10, S15, indeks sesuai query.
3. User, anggota, dan kartu member memiliki event yang akurat. Diblokir tiket 1; matriks transisi, snapshot, serta approval/rejection; S13 dan tes regresi auth. Dapat dikerjakan terpisah dari tiket 2.
4. Transaksi perpustakaan penting memiliki audit lengkap. Diblokir tiket 1; inventaris transisi loan/return/extension/fine/reservation dahulu, lalu pecah per domain bila tidak muat satu sesi; S14.
5. Verifikasi integrasi dan privilege deployment. Diblokir tiket 2–4; suite regresi, migration rehearsal, pemeriksaan akses/privilege, serta bukti UI akhir.

## Out of Scope

Sertifikasi compliance, retensi/penghapusan otomatis, ekspor audit, hash chain, WORM, SIEM, antrean baru, perubahan permission bisnis di luar kebutuhan audit, dan rekonstruksi data historis yang tidak pernah disimpan.

## Further Notes

- Acuan: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- Tes penuh, typecheck, serta pemeriksaan UI dijalankan saat implementasi; penyusunan spec tidak mengklaim hasil tersebut.
- Sebelum implementasi, review spec, batas pengujian HTTP + database uji, dan pembagian tiket. Setelah disetujui, susun rencana eksekusi terperinci dan jalankan TDD per skenario.
- Semua proses pengujian yang dimulai harus dihentikan setelah selesai. Jangan menghentikan runtime Hermes atau 9router.
