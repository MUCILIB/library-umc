import { z } from "zod";

export const createEbookSchema = z.object({
  title: z.string().min(3, "Judul e-book minimal 3 karakter"),
  authorName: z.string().optional(),
  authorId: z.coerce.number().int().optional(),
  publisherName: z.string().optional(),
  publisherId: z.coerce.number().int().optional(),
  publishYear: z.coerce.number().int().min(1800).max(2100).optional(),
  isbn: z.string().optional(),
  edition: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  isFullAccess: z.preprocess((val) => {
    if (typeof val === "string") return val === "true" || val === "1";
    return Boolean(val);
  }, z.boolean().default(true)),
  previewStartPage: z.coerce.number().int().min(1, "Halaman awal minimal 1").default(1),
  previewEndPage: z.coerce.number().int().min(1, "Halaman akhir minimal 1").default(10),
  allowDownload: z.preprocess((val) => {
    if (typeof val === "string") return val === "true" || val === "1";
    return Boolean(val);
  }, z.boolean().default(false))
});

export const updateEbookSchema = z.object({
  title: z.string().min(3, "Judul e-book minimal 3 karakter").optional(),
  authorName: z.string().optional(),
  authorId: z.coerce.number().int().optional(),
  publisherName: z.string().optional(),
  publisherId: z.coerce.number().int().optional(),
  publishYear: z.coerce.number().int().min(1800).max(2100).optional(),
  isbn: z.string().optional(),
  edition: z.string().optional(),
  categoryId: z.coerce.number().int().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  isFullAccess: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (typeof val === "string") return val === "true" || val === "1";
    return Boolean(val);
  }, z.boolean().optional()),
  previewStartPage: z.coerce.number().int().min(1).optional(),
  previewEndPage: z.coerce.number().int().min(1).optional(),
  allowDownload: z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (typeof val === "string") return val === "true" || val === "1";
    return Boolean(val);
  }, z.boolean().optional())
});

export const queryEbookSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().optional()
});

export type CreateEbookInput = z.infer<typeof createEbookSchema>;
export type UpdateEbookInput = z.infer<typeof updateEbookSchema>;
export type QueryEbookInput = z.infer<typeof queryEbookSchema>;
