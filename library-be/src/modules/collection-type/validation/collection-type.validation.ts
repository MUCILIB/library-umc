import { z } from "zod";

export const createCollectionTypeSchema = z.object({
  name: z.string().min(1, "Nama klasifikasi wajib diisi").max(100, "Nama terlalu panjang"),
  code: z.string().min(1, "Kode prefix wajib diisi").max(50, "Kode terlalu panjang").toUpperCase(),
  canBeBorrowed: z.boolean().default(true),
  description: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
  colorTag: z.string().max(50, "Color tag terlalu panjang").optional().nullable(),
});

export const updateCollectionTypeSchema = z.object({
  name: z.string().min(1, "Nama klasifikasi wajib diisi").max(100, "Nama terlalu panjang").optional(),
  code: z.string().min(1, "Kode prefix wajib diisi").max(50, "Kode terlalu panjang").toUpperCase().optional(),
  canBeBorrowed: z.boolean().optional(),
  description: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
  colorTag: z.string().max(50, "Color tag terlalu panjang").optional().nullable(),
});

export const createGmdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama GMD wajib diisi")
    .max(100, "Nama GMD terlalu panjang"),
});

export const updateGmdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama GMD wajib diisi")
    .max(100, "Nama GMD terlalu panjang"),
});

export type CreateCollectionTypeInput = z.infer<typeof createCollectionTypeSchema>;
export type UpdateCollectionTypeInput = z.infer<typeof updateCollectionTypeSchema>;
export type CreateGmdInput = z.infer<typeof createGmdSchema>;
export type UpdateGmdInput = z.infer<typeof updateGmdSchema>;
