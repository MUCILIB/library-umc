# Audit Role dan Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Perubahan role dan permission menghasilkan audit terstruktur yang tersimpan atomik dan dapat diperiksa melalui UI.

**Architecture:** Perluas logs secara kompatibel dan pertahankan helper legacy. Service role menulis event dalam transaksi yang sama dengan mutasi, menggunakan konteks actor dari autentikasi server. UI membaca format lama dan baru melalui endpoint logs yang sudah tersedia.

**Tech Stack:** Express 5, Drizzle/PostgreSQL, Zod 4, React 19, Supertest, Vitest dan Testing Library yang sudah terpasang.

**Spec:** docs/specs/audit-log-hardening.md, disetujui pengguna. Plan ini hanya tahap role/permission; tahap pagination dan domain lain mengikuti tiket terpisah.

## Global Constraints

- Tidak menambah dependency atau layanan baru.
- Tidak menghapus log atau melakukan reset database.
- Akses daftar dan detail tetap hanya super_admin melalui middleware server.
- Actor berasal dari autentikasi server; client tidak boleh menetapkan actor, outcome, snapshot, atau waktu audit.
- Mock helper hanya mendukung tes cepat; tidak boleh menjadi bukti atomicity.
- Jangan menjalankan failure injection atau fixture terhadap database produksi.
- Semua proses pengujian yang dimulai harus dihentikan setelah selesai. Jangan menghentikan runtime Hermes atau 9router.

## Review Focus

- Permission berbeda urutan tetapi nilainya sama tidak boleh menghasilkan event perubahan palsu; test pada task 3.
- Actor atau target berganti nama setelah event tidak boleh mengubah snapshot; test pada task 2.
- Kegagalan insert audit harus membatalkan seluruh perubahan role/permission; test pada task 2 dan 3.
- Text HTML, control character, atau field rahasia tidak boleh dieksekusi atau disalin ke audit; test pada task 1 dan 4.
- Row legacy dengan waktu/detail null harus tetap dapat dibaca tanpa mengarang snapshot; test pada task 1 dan 4.

## File map dan antarmuka

Modifikasi schema logs pada `library-be/src/db/schema.ts`; migration generated mengikuti mekanisme Drizzle repo, bukan nama nomor buatan. Tambah `library-be/src/modules/audit/audit.types.ts` untuk kontrak bersama backend dan `audit.validation.ts` untuk payload event terstruktur. Perluas service audit yang ada, jangan membuat repository/factory baru.

Kontrak backend:
- `AuditContext = { actorId: string; ipAddress?: string; userAgent?: string }` hanya dibentuk controller dari identitas terautentikasi.
- `ActorSnapshot = { id: string; name: string; role: string }` dibaca service dari database, bukan request body.
- `TargetSnapshot = { id: string; type: 'role'; label: string }`.
- `changes: Record<string, { before: string | boolean | null; after: string | boolean | null }>`; permission memakai key `permissions.<menuKey>.<canView|canAdd|canEdit|canDelete>`.
- Event baru memiliki eventType, outcome, actorSnapshot, targetSnapshot, changes dan metadata; field lama tetap tersedia. Untuk tahap ini metadata hanya schemaVersion: 1, outcome success, eventType empat event role dalam spec.
- `AuditTx` diturunkan dari callback `db.transaction`, bukan ditulis dengan any.
- `auditService.recordEvent(tx: AuditTx, event: StructuredAuditEvent): Promise<void>` meneruskan error. Helper `createLog` legacy tidak diubah perilakunya.
- `createRole(data, context)`, `updateRole(roleId, data, context)`, `deleteRole(roleId, context)`, dan `updateRolePermissions(roleId, permissions, context)` menambahkan AuditContext sebagai parameter wajib pada mutasi HTTP. Perbarui seluruh callsite yang ditemukan, termasuk tes.
- Tidak menambah GET detail endpoint: panel detail menggunakan event yang sudah diterima melalui GET /api/logs, dengan kontrol akses yang sama.

## Task 1: Event terstruktur dapat dibaca dengan kompatibilitas legacy

Files: schema di atas; service/controller audit yang ada; audit.types.ts dan audit.validation.ts baru; migration Drizzle; test baru `library-be/src/modules/audit/__tests__/audit.persistence.test.ts`.

- [ ] Tambah test database uji `structured_and_legacy_rows_roundtrip`: insert satu row structured dan satu row legacy; GET /api/logs mengembalikan keduanya; snapshot legacy null, snapshot structured utuh, data tetap array.
- [ ] Tambah test `reject_untrusted_audit_metadata`: validator event internal menolak field password/token/cookie yang tidak diizinkan. Batasi nama/label 255 karakter, ringkasan 1000, user agent 1024, dan metadata serialisasi 4096 byte. Untuk input bisnis valid yang lebih panjang, snapshot label dipotong; jangan membatalkan mutasi hanya karena label deskriptif panjang.
- [ ] Jalankan `npx vitest run src/modules/audit/__tests__/audit.persistence.test.ts` dari library-be. Harapkan RED karena kolom/kontrak belum tersedia, bukan karena database salah konfigurasi.
- [ ] Gunakan database uji terisolasi. Harness wajib memeriksa hostname loopback dan nama database khusus pengujian sebelum fixture/failure injection; jangan fallback ke DATABASE_URL produksi. Pasang env sebelum import db. Tutup pool uji pada teardown; bila pool aplikasi perlu ditutup, ekspor fungsi closeDatabase dari modul db yang ada.
- [ ] Tambah kolom nullable eventType/outcome (text) dan snapshot/changes/metadata (JSONB); perluas enum entity dengan role secara additive. Pertahankan semua field legacy dan tampilkan data baru dari getLogs.
- [ ] Untuk waktu event baru, tambah occurredAt bertipe timestamptz default database; legacy nullable dan tanpa backfill. API sementara tetap menampilkan createdAt; penataan urutan/waktu lintas legacy dituntaskan tiket pagination setelah verifikasi timezone. Tidak memaksa NOT NULL pada waktu lama.
- [ ] Generate/check migration melalui script db repo. Rehearsal hanya di DB uji. Jalankan tes hingga GREEN dan `npx tsc --noEmit`.
- [ ] Review diff dan commit task setelah tes nyata lulus.

## Task 2: CRUD role dan audit berhasil atau rollback bersama

Files: service/controller role yang ada; audit service; `library-be/src/modules/role/__tests__/role.audit.integration.test.ts` baru; tes role existing.

- [ ] Buat test HTTP+DB `create_update_delete_role_emits_one_correct_event`: POST /api/roles, PATCH /api/roles/:id, DELETE /api/roles/:id, lalu GET /api/logs; assert eventType, entity role, target ID, snapshot, dan perubahan field yang tepat. Role harus custom dan belum dipakai user untuk skenario delete.
- [ ] Buat test `audit_insert_failure_rolls_back_role`: trigger sementara di DB uji menolak insert logs untuk ID target fixture; endpoint gagal dan state role tetap sama. Hapus trigger pada finally; jangan menjalankan file ini paralel dengan suite yang berbagi tabel.
- [ ] Buat test `historical_snapshot_survives_rename_and_delete`: ubah nama actor melalui fixture setelah event, hapus role, lalu baca log; snapshot tidak berubah.
- [ ] Jalankan file hingga RED. Mock hanya identitas request untuk pengujian bisnis; guard akses diuji terpisah pada task 4 dengan middleware nyata. Jangan mock db atau writer audit.
- [ ] Implementasikan mutasi dalam `db.transaction`; lock role saat update/delete, ambil actor snapshot dalam transaksi, panggil recordEvent sebelum commit. Jangan panggil getRoleById yang memicu ensureSystemRoles di dalam transaksi mutasi.
- [ ] Hapus penulisan audit duplikat dari controller, teruskan context server. Mutasi tanpa perubahan tidak menghasilkan event baru. Pertahankan aturan sistem-role dan error bisnis existing.
- [ ] Jalankan tes baru dan `npx vitest run src/modules/role/__tests__` serta typecheck. Commit setelah GREEN.

## Task 3: Perubahan permission akurat saat concurrent

Files: service/controller role; file integration task 2; role.validation.ts baru bila validasi existing belum tersedia.

- [ ] Tambah test `permission_diff_contains_only_changed_boolean`: PUT /api/roles/:id/permissions; satu boolean berubah, hanya satu key diff tersimpan.
- [ ] Tambah test `reordered_identical_permissions_are_noop`, `invalid_duplicate_menu_rejected` dan `unknown_menu_or_nonboolean_rejected`; invalid -> 400 dan tidak ada mutasi/event sukses.
- [ ] Tambah test `audit_failure_rolls_back_permission_matrix` menggunakan failure injection task 2.
- [ ] Tambah test `concurrent_updates_have_committed_before_values`: dua request mengubah permission sama; verifikasi rantai before/after sesuai urutan commit menggunakan state/diff, bukan urutan UUID.
- [ ] Jalankan tes hingga RED. Implementasi membaca/mengunci row role FOR UPDATE sebelum membaca permission; semua penulis permission yang dimigrasikan mengikuti lock yang sama. Diff dihitung per menuKey/boolean, bukan urutan array. Input terduplikasi ditolak, bukan last-wins.
- [ ] Jalankan suite role+audit dan typecheck hingga GREEN. Commit task.

## Task 4: Admin dapat memeriksa bukti di UI

Files: `library-fe/src/services/dashboard/auditLogsService.ts`, `library-fe/src/components/dashboard/AuditLogsSection.tsx`; tambah `library-fe/src/components/dashboard/AuditLogDetail.tsx`; test `library-fe/src/components/dashboard/__tests__/AuditLogsSection.test.tsx`; test backend audit access baru.

- [ ] Tambah test `opens_role_diff_and_keeps_snapshot_identity`: fixture structured+legacy; buka detail, assert before/after dan snapshot; legacy menampilkan snapshot historis tidak tersedia, profil join diberi label profil saat ini.
- [ ] Tambah test `renders_metadata_as_text_and_restores_focus`: label berisi HTML tidak membuat elemen/script; Escape menutup dialog dan fokus kembali ke tombol pemicu. Pakai komponen dialog proyek yang tersedia.
- [ ] Tambah test `audit_read_requires_super_admin` pada backend: autentikasi nyata atau sesi uji valid sesuai middleware; anonymous 401, staff 403, super_admin 200. Jangan menganggap test mocked guard membuktikan middleware sebenarnya.
- [ ] Jalankan tes hingga RED. Perluas tipe FE secara kompatibel dan tambahkan entity role pada filter. Gunakan snapshot dahulu untuk event baru, jangan mengirim email ke avatar eksternal; gunakan inisial lokal untuk actor audit.
- [ ] Susun tabel waktu/pelaku/aktivitas/objek/ringkasan/detail. Tampilkan nilai sebagai teks. Pertahankan loading/error/empty dan retry. Tahap ini belum mengklaim pagination sudah diperbaiki.
- [ ] Jalankan `npx vitest run src/components/dashboard/__tests__/AuditLogsSection.test.tsx` dan `npm run build` dari library-fe, tes backend akses serta role/audit dari library-be.
- [ ] Verifikasi UI runtime dengan event uji yang benar-benar tersimpan. Hentikan browser/runtime uji yang dimulai, review diff, lalu commit task.

## Penutupan tahap

- [ ] Jalankan suite backend dan frontend penuh satu kali, typecheck/build keduanya; pisahkan kegagalan baseline dari regresi dengan bukti.
- [ ] Reviewer baru memeriksa kesesuaian spec tahap ini dan standar repo, terutama transaksi, secret, legacy, dan hak akses.
- [ ] Catat S01–S08/S11–S12 yang benar-benar terbukti beserta batas bukti. Jika database uji tidak tersedia, laporkan blocker; jangan mengganti bukti dengan mock.
- [ ] Ikuti alur fork janfdev -> PR ke main MUCILIB; jangan merge/deploy sebelum tahapan review proyek terpenuhi.

## Tahap berikutnya

Pagination/search server memiliki plan terpisah. User/member/card, loan/return/extension, fine, serta reservation dikerjakan per domain sesudah kontrak tahap ini terbukti. Jangan menyalin plan spekulatif untuk endpoint yang belum diaudit.
