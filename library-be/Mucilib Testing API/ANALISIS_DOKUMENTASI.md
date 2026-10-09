# Audit dokumentasi OpenAPI

Audit statis ini membandingkan spesifikasi hasil generasi dengan literal route Express di `src/modules/*/route/*.ts`; komentar dan contoh route yang dikomentari tidak dihitung sebagai route aktif.

## Ringkasan

- OpenAPI memuat 84 path dan 108 operasi.
- Ditemukan route aktif yang belum tercantum di OpenAPI:
  - `GET /members`, `GET /members/me/card`, `POST /members/me/card/request`, `GET /members/cards/pending`, serta operasi approve/reject/issue kartu member.
  - `POST /users/{id}/role`, `/ban`, `/sync-member` dan `GET /users/all` (spesifikasi justru memuat `GET /auth/users`; route auth menjelaskan endpoint dipindah agar tidak terkena wildcard Better Auth).
  - `GET /import/template/{module}`, `POST /import/guests`, `/users`, `/loans`, `POST /import/batches/{batchId}/validate`, dan `GET /import/batches/{batchId}/errors.csv`.
  - `GET /export/guests`, `/loans`, `/users`.
- Endpoint operasional lain, termasuk `GET /items/generate-code/{bibliographyId}`, extension loan approve/reject, dan `POST /reports/web-traffic/ping`.
- Route `/collections` juga tidak didokumentasikan; backend menyatakan ini alias kompatibilitas ke resource `/bibliographies`, sehingga perlu dicatat jika memang masih menjadi API publik yang didukung.
- Ada operasi dengan respons kosong: `POST /guest/absensi`; ini membuat kontrak respons tidak membantu konsumen API.
- Test `src/modules/swagger/__tests__/openapi.contract.test.ts` tidak benar-benar memvalidasi kontrak: sebagian besar test hanya mengecek `path` dan `method` bernilai truthy, bukan mengecek keberadaan operasi di `swaggerSpec`.

## Detail route

Perbandingan literal menemukan 31 operasi route yang tidak cocok dengan dokumentasi. Angka ini mencakup 6 route alias `/collections` dan `/reports/web-traffic/ping` (endpoint tracking yang juga tersedia sebagai `/track`); karena itu bukan seluruhnya route bisnis yang sepenuhnya tidak punya padanan.

Route yang tercatat di OpenAPI tetapi tidak cocok dengan literal route Express:

- `GET /auth/users`: endpoint aktif yang ditemukan adalah `GET /users/all`; catatan di route auth menyebut pemindahan dilakukan untuk menghindari handler wildcard Better Auth.
- `POST /auth/forget-password` dan `POST /auth/reset-password`: ditangani oleh Better Auth wildcard, bukan route Express literal. Verifikasi nama dan payload terhadap versi Better Auth yang terpasang sebelum mengandalkan request ini.

## Catatan penggunaan

- Autentikasi didokumentasikan sebagai HTTP Bearer. Backend mengubah token Bearer menjadi cookie session Better Auth; gunakan session token yang valid, bukan API key arbitrer.
- Contoh body di Postman adalah placeholder berbasis skema, bukan fixture valid untuk semua endpoint. Lengkapi ID, data wajib, dan file upload sebelum mengirim.
- Path multipart dapat meminta file; pilih file lokal di editor request sebelum dijalankan.
- Audit ini tidak menguji request terhadap database atau server live dan tidak menjamin bahwa deskripsi/otorisasi setiap operasi sama dengan implementasi.
