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

