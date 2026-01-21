import { db } from "../db";
import { categories } from "../db/schema";
import { eq } from "drizzle-orm";

export const CategoryService = {
  // Get All Categories
  getAllCategories: async () => {
    try {
      const result = await db.select().from(categories);
      return {
        success: true,
        message: "Get Categories Successfully",
        data: result,
      };
    } catch (err) {
      console.error("[CategoryService] Error getting categories:", err);
      return {
        success: false,
        message: "Failed to get categories",
        data: null,
      };
    }
  },

  createCategory: async (data: any) => {
    try {
      const categoryData = {
        name: data.name,
        description: data.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const [result] = await db
        .insert(categories)
        .values(categoryData)
        .returning();

      return {
        success: true,
        message: "Create category successfully",
        data: result,
      };
    } catch (err) {
      console.error("[Category Service] Error Create Categori: ", err);
      return {
        success: false,
        message: "Failed to create category",
        data: null,
      };
    }
  },
};
