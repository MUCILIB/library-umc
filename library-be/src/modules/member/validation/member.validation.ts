import z from "zod";

const FORBIDDEN_CHARS_REGEX = /^[^<>{};"\\`^*|=$~]*$/;
const PHONE_REGEX = /^[0-9+\-\s()]*$/;
const NIM_REGEX = /^[a-zA-Z0-9.\-/]*$/;

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter")
    .regex(FORBIDDEN_CHARS_REGEX, "Karakter seperti <, >, ;, \", \\ tidak diperbolehkan")
    .optional()
    .or(z.literal("")),
  nimNidn: z
    .string()
    .min(4, "NIM/NIDN minimal 4 karakter")
    .max(30, "NIM/NIDN maksimal 30 karakter")
    .regex(NIM_REGEX, "NIM/NIDN hanya boleh berisi huruf, angka, titik, strip (-), atau garis miring (/)")
    .optional()
    .or(z.literal("")),
  faculty: z
    .string()
    .max(100, "Fakultas maksimal 100 karakter")
    .regex(FORBIDDEN_CHARS_REGEX, "Karakter seperti <, >, ;, \", \\ tidak diperbolehkan")
    .optional()
    .or(z.literal("")),
  originRegion: z
    .string()
    .max(100, "Asal daerah maksimal 100 karakter")
    .regex(FORBIDDEN_CHARS_REGEX, "Karakter seperti <, >, ;, \", \\ tidak diperbolehkan")
    .optional()
    .or(z.literal("")),
  institution: z
    .string()
    .max(100, "Institusi maksimal 100 karakter")
    .regex(FORBIDDEN_CHARS_REGEX, "Karakter seperti <, >, ;, \", \\ tidak diperbolehkan")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .regex(PHONE_REGEX, "Nomor telepon hanya boleh berisi angka dan simbol (+, -, ())")
    .optional()
    .or(z.literal("")),
  image: z.string().url("URL avatar tidak valid").or(z.string().startsWith("/api/")).optional().or(z.literal(""))
});

export const approveCardSchema = z.object({
  cardNumber: z.string().min(6).max(100).optional(),
  cardExpiresAt: z.string().optional(),
  durationDays: z.coerce.number().int().positive().optional(),
});

export const updateCardExpirySchema = z.object({
  cardExpiresAt: z.string().optional(),
  durationDays: z.coerce.number().int().positive().optional(),
}).refine((data) => Boolean(data.cardExpiresAt || data.durationDays), {
  message: "Tanggal kedaluwarsa (cardExpiresAt) atau durasi hari (durationDays) wajib diisi",
});

export const rejectCardSchema = z.object({
  reason: z.string().min(3, "Reason is required").max(255)
});
