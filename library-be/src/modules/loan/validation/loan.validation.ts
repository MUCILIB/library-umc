import z from "zod";

export const createLoanSchema = z.object({
  bibliographyId: z.string().optional(),
  collectionId: z.string().optional(),
  itemId: z.string().optional(),
  memberId: z.string().optional(),
  loanDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => !!(data.bibliographyId || data.collectionId || data.itemId), {
  message: "Bibliography ID / Item ID wajib diisi",
  path: ["bibliographyId"]
});

export const getLoansQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "returned", "extended", "overdue", "canceled"]).optional(),
  memberId: z.string().optional(),
});

export const extendLoanSchema = z.object({
  loanId: z.string().uuid("Loan ID tidak valid"),
});

export const returnLoanSchema = z.object({
  condition: z.enum(["good", "damaged", "lost"]).optional().default("good"),
  staffName: z.string().optional(),
  signature: z.string().optional(),
  notes: z.string().optional(),
});

export const directLoanSchema = z.object({
  memberIdentifier: z.string().min(1, "ID Member, Nomor Kartu, atau NIM/NIDN wajib diisi"),
  itemIdentifier: z.string().min(1, "ID Item, Kode Eksemplar, atau Barcode wajib diisi"),
  loanDate: z.string().optional(),
  dueDate: z.string().optional(),
  durationDays: z.number().int().positive().optional().default(7),
  notes: z.string().optional(),
});


