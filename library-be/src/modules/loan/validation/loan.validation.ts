import z from "zod";

export const createLoanSchema = z.object({
  bibliographyId: z.string().min(1, "Bibliography ID wajib diisi"),
  loanDate: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const getLoansQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "returned", "extended", "overdue", "canceled"]).optional(),
  memberId: z.string().optional(),
});

export const extendLoanSchema = z.object({
  loanId: z.string().uuid("Loan ID tidak valid"),
});

