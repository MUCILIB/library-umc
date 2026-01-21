# Panduan Implementasi Manajemen Koleksi (Tahap 3)

Tahap ini sangat seru karena kita akan menggabungkan CRUD Database dengan File Upload (Cloudinary) untuk membuat manajemen buku digital & fisik.

---

## 🎯 Tujuan

Membuat API untuk:

1.  Menambahkan koleksi baru (Buku/Ebook) beserta gambar covernya.
2.  Mengedit data koleksi.
3.  Menampilkan daftar koleksi (support filter & pagination nanti).
4.  Menampilkan detail koleksi.
5.  Upload file (Cover Image & Konten PDF).

---

## 🛠️ Langkah 1: Validasi (DTO)

Kita butuh validasi yang kuat karena datanya cukup kompleks.

Buat file: `src/validation/collection.validation.ts`

```typescript
import { z } from "zod";

// Gunakan preprocess untuk mengkonversi string "123" menjadi number 123
// karena multipart/form-data mengirim semua sebagai string.
const strToNum = (val: unknown) => {
  if (typeof val === "string") return parseInt(val, 10);
  return val;
};

export const createCollectionSchema = z.object({
  title: z.string().min(3).max(255),
  author: z.string().min(2).max(255),
  publisher: z.string().min(2).max(150),
  publicationYear: z.string().regex(/^\d{4}$/, "Tahun harus 4 digit"),
  isbn: z.string().optional(),

  // Enum sesuai schema database
  type: z.enum(["physical_book", "ebook", "journal", "thesis"]),

  categoryId: z.preprocess(strToNum, z.number().positive()),
  description: z.string().optional(),

  // Field untuk jumlah kopi fisik (jika physical_book)
  quantity: z
    .preprocess(strToNum, z.number().int().min(0).default(1))
    .optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();
```

---

## ☁️ Langkah 2: Utilities Upload

Pastikan `src/utils/upload.ts` sudah siap (sudah kita fix sebelumnya). Kita akan pakai `uploadToCloudinary`.

---

## 🧠 Langkah 3: Collection Service

Buat file: `src/service/collection.service.ts`

Tantangannya disini adalah menghandle file upload dan database transaction.

**Logic `createCollection`:**

1.  Upload cover image ke Cloudinary (jika ada file).
2.  Insert data ke tabel `collections`.
3.  (Opsional) Jika tipe `physical_book`, insert juga ke tabel `items` sesuai quantity.
4.  (Opsional) Jika tipe `ebook`, insert ke tabel `collectionContents` (link PDF).

_Untuk awal, fokus insert ke tabel `collections` dulu saja._

```typescript
// Skeleton Code
export const CollectionService = {
  create: async (data: any, file?: Express.Multer.File) => {
    // 1. Upload Cover jika ada
    let coverUrl = null;
    if (file) {
      const uploadResult = await uploadToCloudinary(
        file.buffer,
        "library/covers",
      );
      coverUrl = uploadResult.url;
    }

    // 2. Insert ke DB
    // const [newCollection] = await db.insert(collections).values({...}).returning();

    // Return result
  },

  getAll: async () => {
    // Gunakan db.query.collections.findMany({ with: { category: true } })
  },
};
```

---

## 🎮 Langkah 4: Collection Controller

Buat file: `src/controller/CollectionController.ts`

Kita perlu menghandle `multipart/form-data`.
Input akan ada `req.body` (data text) dan `req.file` (gambar).

```typescript
export const createCollection = async (req: Request, res: Response) => {
  // 1. Validasi Body (Ingat, angka dari form-data jadi string, jadi parse dulu di Zod)
  const validation = createCollectionSchema.safeParse(req.body);
  if (!validation.success) {
    // return error 400
  }

  // 2. Panggil Service dengan file
  const result = await CollectionService.create(validation.data, req.file);

  // 3. Response
};
```

---

## 🛣️ Langkah 5: Route

Buat file: `src/routes/collection.route.ts`

Gunakan middleware `upload.single('cover')` dari `src/utils/upload.ts`.

```typescript
import { upload } from "../utils/upload";

router.post(
  "/collections",
  isAuthenticated,
  requireRole(["admin", "staff"]),
  upload.single("cover"), // Middleware Multer
  createCollection,
);

router.get("/collections", getAllCollections);
```

---

## ✅ Checklist Tahap 3

- [ ] Schema Validasi (`collection.validation.ts`)
- [ ] Service (`collection.service.ts`) - dengan Upload Logic
- [ ] Controller (`CollectionController.ts`)
- [ ] Route (`collection.route.ts`)
- [ ] Register Route di `index.ts`

Silakan dicoba! Jika bingung soal menghandle file upload dan database transaction sekaligus, tanyakan saja.
