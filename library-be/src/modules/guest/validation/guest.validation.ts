import { z } from "zod";

export const createGuestSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(255),
  identifier: z.string().min(1, "NIM/KTP Wajib diisi").max(100),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  faculty: z.string().optional(),
  major: z.string().optional(),
});

export const updateGuestSchema = createGuestSchema.partial();

export const scanMemberSchema = z.object({
  memberIdentifier: z.string().min(1, "NIM, Barcode, atau Kartu Anggota wajib diisi"),
});

export const createNonMemberGuestSchema = z.object({
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter").max(255),
  institution: z.string().min(1, "Institusi/asal kampus wajib diisi").max(255),
  purpose: z.string().min(1, "Keperluan wajib diisi").max(500),
  phone: z.string().min(8, "Nomor HP minimal 8 digit").max(100),
  studyProgramId: z.coerce.number().int().positive().optional().nullable(),
  facultyId: z.coerce.number().int().positive().optional().nullable(),
});

export const guestFilterQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(50),
  studyProgramId: z.coerce.number().int().positive().optional(),
  facultyId: z.coerce.number().int().positive().optional(),
  type: z.enum(["member", "non-member"]).optional(),
  search: z.string().optional(),
});
