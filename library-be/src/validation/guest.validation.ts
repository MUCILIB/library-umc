import { z } from "zod";

export const createGuestSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(255),
  identifier: z.string().min(1, "NIM/KTP Wajib diisi").max(100),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  faculty: z.string().optional(),
  major: z.string().optional(),
});

export const updateGuestSchema = createGuestSchema.partial();
