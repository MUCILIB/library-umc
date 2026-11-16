# Pilihan format export SLiMS

Spec: docs/specs/slims-csv-compatibility.md

Tahap 2: hanya kompatibilitas struktur CSV; pelestarian seluruh detail sumber dan konflik import tetap tahap 3–4.

- [x] Service: ExportFilter.format?: 'library' | 'slims', default Library. SLiMS bibliography tepat 18 kolom sesuai CSV sumber; item tetap 19. Semua delimiter/filter/BOM/escaping aman tetap bekerja; hasil kosong menggunakan header format terpilih.
- [x] TDD service: bandingkan header dengan file CSV sumber independen; periksa alignment nilai dan mode default, delimiter koma, kosong terfilter, 19 kolom item.
- [x] Controller: terima format valid, tolak format tidak valid dengan 400; uji melalui Express + service spy.
- [x] Frontend: pilihan format pada dialog existing, default Library; query format terkirim untuk bibliography dan item. Test komponen RED/GREEN dan build.
- [x] Verifikasi export dari DB CSV test, 56 bibliography/127 item, header dan jumlah field konsisten. Ini bukan klaim isi item cocok sumber.
- [x] Review diff, typecheck, tests relevan, commit.

Pembagian: parent BE/docs; subagent FE saja. Tanpa dependency/schema/production DB changes.
