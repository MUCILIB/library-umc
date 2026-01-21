import z from "zod";

export const updateProfileSchema = z.object({
  nimNidn: z.string().min(5, "NIM/NIDN is required").max(50).optional(),
  faculty: z.string().max(200).optional(),
  phone: z.string().max(100).optional(),
});

