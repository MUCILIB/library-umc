import z from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  description: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
