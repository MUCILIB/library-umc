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
}).refine(
  (data) => {
    if (data.loanDate && data.dueDate) {
      const start = new Date(data.loanDate).getTime();
      const due = new Date(data.dueDate).getTime();
      if (isNaN(start) || isNaN(due)) return false;
      const diffDays = (due - start) / (1000 * 3600 * 24);
      return diffDays >= 1 && diffDays <= 7;
    }
    return true;
  },
  {
    message: "Durasi peminjaman mandiri maksimal adalah 7 hari dan tanggal jatuh tempo harus setelah tanggal pinjam",
    path: ["dueDate"],
  }
);

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
  durationDays: z.number().int().min(1, "Durasi minimal 1 hari").max(14, "Durasi peminjaman langsung maksimal 14 hari").optional().default(7),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.loanDate && data.dueDate) {
      const start = new Date(data.loanDate).getTime();
      const due = new Date(data.dueDate).getTime();
      if (isNaN(start) || isNaN(due)) return false;
      const diffDays = (due - start) / (1000 * 3600 * 24);
      return diffDays >= 1 && diffDays <= 14;
    }
    return true;
  },
  {
    message: "Durasi peminjaman langsung tidak boleh melebihi 14 hari dan tanggal jatuh tempo harus setelah tanggal pinjam",
    path: ["dueDate"],
  }
);


