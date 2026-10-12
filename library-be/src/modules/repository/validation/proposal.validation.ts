import { z } from "zod";

export const createProposalSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter"),
  abstract: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  advisorName1: z.string().min(3, "Nama dosen pembimbing 1 wajib diisi"),
  advisorName2: z.string().optional(),
  studyProgramId: z.coerce.number().int().positive("Program studi wajib dipilih"),
  documentCategory: z.enum(["PROPOSAL", "THESIS", "REPORT"]).default("PROPOSAL"),
});

export const reviewProposalSchema = z.object({
  action: z.enum(["APPROVE", "REVISION_REQUIRED", "UNDER_REVIEW"]),
  reviewNotes: z.string().optional(),
});

export const configurePageRuleSchema = z.object({
  roleScope: z.enum(["PUBLIC", "STUDENT", "MEMBER", "ALL"]).default("PUBLIC"),
  allowedStartPage: z.coerce.number().int().min(1, "Halaman awal minimal 1"),
  allowedEndPage: z.coerce.number().int().min(1, "Halaman akhir minimal 1"),
  allowDownloadFull: z.boolean().default(false),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type ReviewProposalInput = z.infer<typeof reviewProposalSchema>;
export type ConfigurePageRuleInput = z.infer<typeof configurePageRuleSchema>;
