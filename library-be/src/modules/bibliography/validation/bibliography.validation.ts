import z from "zod";

export const createBibliographySchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  isbn: z.string().max(50).optional().or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/[^0-9X]/gi, "");
      return digits.length === 10 || digits.length === 13;
    }, {
      message: "ISBN harus 10 atau 13 digit angka"
    }),
  issn: z.string().max(20).optional().or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      const clean = val.replace(/^ISSN\s*/i, "").trim();
      return /^\d{4}-\d{3}[\dX]$/i.test(clean) || /^\d{7}[\dX]$/i.test(clean);
    }, {
      message: "ISSN harus berupa format 8 karakter (misal: 1234-5678)"
    }),
  isbnIssn: z.string().max(255).optional().or(z.literal(""))
    .refine((val) => {
      if (!val) return true;
      const clean = val.replace(/^ISBN\s*/i, "").replace(/^ISSN\s*/i, "ISSN ");
      const isISSN = /^ISSN\s/i.test(clean);
      if (isISSN) {
        const issnRegex = /^ISSN\s\d{4}-\d{3}[\dX]$/i;
        return issnRegex.test(clean);
      }
      const isbnDigits = val.replace(/[^0-9]/g, "");
      if (isbnDigits.length === 10 || isbnDigits.length === 13) return true;
      return false;
    }, {
      message: "ISBN harus 10 atau 13 digit, atau ISSN berformat 'ISSN xxxx-xxxx'"
    }),
  edition: z.string().max(100).optional().or(z.literal("")),
  publisherId: z.coerce.number().int().positive().optional(),
  publisherName: z.string().optional().or(z.literal("")),
  publishYear: z.coerce.number().int().min(1000).max(9999).optional(),
  collation: z.string().max(255).optional().or(z.literal("")),
  seriesTitle: z.string().max(255).optional().or(z.literal("")),
  callNumber: z.string().max(100).optional().or(z.literal("")),
  languageId: z.coerce.number().int().positive().optional(),
  publicationPlaceId: z.coerce.number().int().positive().optional(),
  classification: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  sor: z.string().optional().or(z.literal("")),
  gmdId: z.coerce.number().int().positive().optional(),
  collectionTypeId: z.coerce.number().int().positive().optional(),
  publishPlace: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
  type: z.enum(["physical_book", "ebook", "journal", "thesis"]).optional(),
  isPopular: z.boolean().optional(),
  authors: z.array(z.object({
    name: z.string().min(1),
    role: z.string().default("primary")
  })).optional(),
  subjects: z.array(z.object({
    name: z.string().min(1)
  })).optional(),
  facultyIds: z.array(z.number().int().positive()).optional(),
  studyProgramIds: z.array(z.number().int().positive()).optional()
});

export const updateBibliographySchema = createBibliographySchema.partial();

export const bibliographyQuerySchema = z.object({
  q: z.string().optional(),
  title: z.string().optional(),
  isbn: z.string().optional(),
  issn: z.string().optional(),
  isbnIssn: z.string().optional(),
  author: z.string().optional(),
  subject: z.string().optional(),
  callNumber: z.string().optional(),
  publisher: z.string().optional(),
  gmdId: z.coerce.number().int().optional(),
  languageId: z.coerce.number().int().optional(),
  publishYearFrom: z.coerce.number().int().optional(),
  publishYearTo: z.coerce.number().int().optional(),
  hasAvailableItems: z.coerce.boolean().optional(),
  isPopular: z.coerce.boolean().optional(),
  facultyId: z.coerce.number().int().optional(),
  studyProgramId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["title", "publishYear", "createdAt"]).default("title"),
  order: z.enum(["asc", "desc"]).default("asc")
});

export const checkDuplicateSchema = z.object({
  isbn: z.string().max(255).optional(),
  issn: z.string().max(255).optional(),
  title: z.string().max(500).optional(),
  author: z.string().max(255).optional(),
}).refine((d) => d.isbn || d.issn || d.title || d.author, {
  message: "At least one of isbn, issn, title, or author is required",
});

export type CreateBibliographyData = z.infer<typeof createBibliographySchema>;
export type UpdateBibliographyData = z.infer<typeof updateBibliographySchema>;
export type BibliographyQuery = z.infer<typeof bibliographyQuerySchema>;
