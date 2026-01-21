import { z } from "zod";

// Helper: Convert string to number (karena multipart form data mengirim angka sebagai string)
const strToNum = (val: unknown) => {
  if (typeof val === "string") {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? val : parsed;
  }
  return val;
};

export const createCollectionSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(255),
  author: z.string().min(2, "Penulis minimal 2 karakter").max(255),
  publisher: z.string().min(2, "Penerbit minimal 2 karakter").max(150),
  publicationYear: z
    .string()
    .regex(/^\d{4}$/, "Tahun publikasi harus 4 digit angka (YYYY)"),
  isbn: z.string().max(20).optional(),

  // Enum type sesuai database
  type: z.enum(["physical_book", "ebook", "journal", "thesis"]),

  categoryId: z.preprocess(strToNum, z.number().positive()),

  description: z.string().optional(),

  // Khusus buku fisik
  quantity: z
    .preprocess(strToNum, z.number().int().min(0).default(1))
    .optional(),
});

// Schema update (semua field optional)
export const updateCollectionSchema = createCollectionSchema.partial();
