import z from "zod";

export const getPopularBooksQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/, "Limit harus berupa angka").optional()
});

export const exportLoansQuerySchema = z.object({
  format: z.enum(["csv", "pdf"]).optional().default("csv"),
  status: z.string().optional(),
  from: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Format tanggal harus YYYY-MM-DD (contoh: 2025-01-01)"
    )
    .optional(),
  to: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Format tanggal harus YYYY-MM-DD (contoh: 2025-01-01)"
    )
    .optional(),
  studyProgramId: z.coerce.number().optional(),
  facultyId: z.coerce.number().optional()
});

export const exportFinesQuerySchema = z.object({
  format: z.enum(["csv", "pdf"]).optional().default("csv"),
  status: z.string().optional(),
  month: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])$/, "Bulan harus 1-12")
    .optional(),
  year: z
    .string()
    .regex(/^\d{4}$/, "Tahun harus 4 digit")
    .optional()
});

export const finesRevenueSummaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])$/, "Bulan harus 1-12")
    .optional(),
  year: z
    .string()
    .regex(/^\d{4}$/, "Tahun harus 4 digit")
    .optional()
});

export const guestStatsQuerySchema = z.object({
  range: z.enum(["day", "week", "month"]).optional().default("week")
});

export const webTrafficQuerySchema = z.object({
  days: z.string().regex(/^\d+$/, "days harus berupa angka").optional()
});

export const trackWebTrafficBodySchema = z.object({
  path: z.string().min(1, "Path wajib diisi").max(255, "Path terlalu panjang")
});
