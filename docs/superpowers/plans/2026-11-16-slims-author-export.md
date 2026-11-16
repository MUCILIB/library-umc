# Pelestarian penulis SLiMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Export tidak kehilangan label penulis Dkk dan mengikuti urutan penulis tersimpan.

**Architecture:** Gunakan ExportService yang sudah ada, tanpa dependency atau perubahan schema. Verifikasi serializer melalui public service dan ulang export dari DB round-trip baseline.

**Tech Stack:** TypeScript, Drizzle, Vitest, PostgreSQL.

**Spec:** docs/specs/slims-csv-compatibility.md

## Global Constraints
- Tahap 1 saja; tahap lanjutan tercatat di spec.
- Tidak mengubah production atau database SLiMS asli.
- Format Library yang diperluas tetap tersedia.
- Jangan menonaktifkan perlindungan formula spreadsheet demi kesamaan byte.

## Review Focus
- Label tanpa penulis tetap diekspor.
- Label null tidak membuat tag kosong.
- Posisi penulis harus stabil meskipun query mengembalikan urutan berbeda.
- Tidak memutasi array relasi yang diberikan DB.
- Test harus memanggil ExportService, bukan mengulang algoritma serializer.

### Task 1: Export penulis
**Files:**
- Modify: library-be/src/modules/export/service/export.service.ts
- Test: library-be/src/modules/export/__tests__/export.service.test.ts
**Interfaces:**
- Consumes: ExportService.exportBibliographies(filter?: ExportFilter): Promise<string> dan bibliographyAuthors[].position, unlistedAuthorsLabel.
- Produces: CSV dengan authors terurut dan label terakhir.

- [x] Tambahkan test service terparameter untuk label dengan penulis, label tanpa penulis, tanpa label, serta penulis dengan urutan input terbalik.
- [x] Jalankan file test; pastikan gagal karena label hilang/urutan salah.
- [x] Urutkan salinan array berdasarkan position dan tambahkan label bila tersedia.
- [x] Jalankan test import/export, tsc, dan suite backend; catat kegagalan di luar scope bila ada.
- [x] Export ulang DB mucilib_csv_roundtrip_test tanpa import ulang dan bandingkan semua 56 authors dengan sumber.
- [x] Review diff, commit perubahan tahap 1.
