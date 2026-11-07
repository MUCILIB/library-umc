import z from "zod";

export const itemStatusSchema = z.enum(["available", "loaned", "damaged", "lost"]);

export const createItemSchema = z.object({
  bibliographyId: z.string().uuid(),
  locationId: z.coerce.number().int().positive(),
  barcode: z.string().min(1).max(50).optional(),
  uniqueCode: z.string().min(1).max(30).optional(),
  itemCode: z.string().min(1).max(50, "Kode item tidak boleh lebih dari 50 karakter").regex(/^\S+$/, "Kode item tidak boleh mengandung spasi"),
  inventoryCode: z.string().max(50).optional().or(z.literal("")),
  callNumber: z.string().max(100).optional().or(z.literal("")),
  pattern: z.string().max(50).optional().or(z.literal("")),
  collectionTypeId: z.coerce.number().int().positive().optional(),
  vendorId: z.coerce.number().int().positive().optional(),
  receivedDate: z.string().optional().or(z.literal("")),
  orderNo: z.string().max(100).optional().or(z.literal("")),
  orderDate: z.string().optional().or(z.literal("")),
  source: z.string().max(255).optional().or(z.literal("")),
  invoice: z.string().max(255).optional().or(z.literal("")),
  price: z.coerce.number().nonnegative().optional(),
  priceCurrency: z.string().max(10).default("IDR"),
  invoiceDate: z.string().optional().or(z.literal("")),
  site: z.string().max(255).optional().or(z.literal("")),
  status: itemStatusSchema.default("available"),
});

export const bulkCreateItemSchema = z.object({
  items: z.array(z.object({
    itemCode: z.string().min(1).max(50, "Kode item tidak boleh lebih dari 50 karakter").regex(/^\S+$/, "Kode item tidak boleh mengandung spasi"),
    barcode: z.string().min(1).max(50).optional(),
    locationId: z.coerce.number().int().positive().optional(),
    callNumber: z.string().max(100).optional().or(z.literal("")),
    inventoryCode: z.string().max(50).optional().or(z.literal("")),
  })).min(1).max(1000),
  defaults: z.object({
    locationId: z.coerce.number().int().positive().optional(),
    source: z.string().optional(),
    priceCurrency: z.string().optional(),
    collectionTypeId: z.coerce.number().int().positive().optional(),
  }).optional(),
});

export const updateItemSchema = z.object({
  itemCode: z.string().min(1).max(50, "Kode item tidak boleh lebih dari 50 karakter").regex(/^\S+$/, "Kode item tidak boleh mengandung spasi").optional(),
  status: itemStatusSchema.optional(),
  locationId: z.coerce.number().int().positive().optional(),
  barcode: z.string().min(1).max(50).optional(),
  uniqueCode: z.string().min(1).max(30).optional(),
  inventoryCode: z.string().max(50).optional().or(z.literal("")),
  callNumber: z.string().max(100).optional().or(z.literal("")),
  collectionTypeId: z.coerce.number().int().positive().optional(),
  vendorId: z.coerce.number().int().positive().optional(),
  receivedDate: z.string().optional().or(z.literal("")),
  orderNo: z.string().max(100).optional().or(z.literal("")),
  orderDate: z.string().optional().or(z.literal("")),
  source: z.string().max(255).optional().or(z.literal("")),
  invoice: z.string().max(255).optional().or(z.literal("")),
  price: z.coerce.number().nonnegative().optional(),
  priceCurrency: z.string().max(10).optional(),
  invoiceDate: z.string().optional().or(z.literal("")),
  site: z.string().max(255).optional().or(z.literal("")),
});

export const updateItemStatusSchema = z.object({
  status: itemStatusSchema,
});

export const updateItemLocationSchema = z.object({
  locationId: z.coerce.number().int().positive(),
});

export type CreateItemData = z.infer<typeof createItemSchema>;
export type BulkCreateItemData = z.infer<typeof bulkCreateItemSchema>;
export type UpdateItemData = z.infer<typeof updateItemSchema>;
