# Mucilib Testing API

Paket API client dihasilkan dari `src/config/swagger.ts`.

## Impor ke Postman

1. Pilih **Import**.
2. Impor `postman_collection.json` dan `postman_environment.json`.
3. Pilih environment **Mucilib Local**; ubah `baseUrl` ke server lain bila diperlukan.
4. Untuk endpoint terlindungi, set `accessToken` ke session token Better Auth yang valid. Lengkapi placeholder request dan file upload bila diminta.

## Impor ke Bruno

1. Buat atau buka collection Bruno.
2. Pilih **Import** → **OpenAPI**.
3. Pilih `openapi.json`, lalu tentukan lokasi penyimpanan collection.
4. Untuk mengimpor environment, buka menu **Environments** → **Configure** → **Import**, lalu pilih `postman_environment.json`. Bruno menerima format environment Postman dan akan menyimpannya sebagai environment Bruno.
5. Pilih environment **Mucilib Local**, lalu gunakan `baseUrl` dan isi `accessToken` dengan session token Better Auth yang valid.

Environment Bruno native bukan file `environment.json`; Bruno menyimpan environment dalam formatnya sendiri. Jadi, `postman_environment.json` di folder ini bisa diimpor langsung, tetapi tidak perlu diubah namanya.

## Berkas

- `openapi.json` — OpenAPI 3.0 hasil generasi dari konfigurasi Swagger backend, dapat diimpor ke Bruno maupun Postman.
- `postman_collection.json` — Postman Collection v2.1 berisi seluruh operasi yang terdokumentasi.
- `postman_environment.json` — environment lokal dengan `baseUrl` dan `accessToken` kosong.
- `ANALISIS_DOKUMENTASI.md` — temuan audit dan batasan validasi.

Catatan: koleksi dihasilkan dari dokumentasi yang ada. Endpoint yang hilang dari spesifikasi tidak otomatis muncul di koleksi ini; lihat hasil audit.
