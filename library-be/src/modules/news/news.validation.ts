import { z } from "zod";

export const newsCategorySchema = z.enum([
  "pengumuman",
  "agenda",
  "kegiatan",
  "layanan",
  "literasi",
]);

export const newsStatusSchema = z.enum(["draft", "published", "archived"]);

export const createNewsSchema = z.object({
  title: z
    .string()
    .min(3, "Judul berita minimal 3 karakter")
    .max(255, "Judul berita maksimal 255 karakter"),
  slug: z
    .string()
    .min(3, "Slug minimal 3 karakter")
    .max(255, "Slug maksimal 255 karakter")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Format slug harus berupa huruf kecil dan tanda hubung")
    .optional(),
  category: newsCategorySchema.default("pengumuman"),
  excerpt: z.string().max(500, "Ringkasan maksimal 500 karakter").optional().nullable(),
  content: z
    .string()
    .min(10, "Konten berita minimal 10 karakter"),
  coverImage: z.string().max(500).optional().nullable(),
  status: newsStatusSchema.default("draft"),
  publishedAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export const updateNewsSchema = createNewsSchema.partial();

export const queryNewsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  category: z.union([newsCategorySchema, z.literal("all")]).default("all"),
  status: z.union([newsStatusSchema, z.literal("all")]).default("published"),
});
