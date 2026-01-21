import { db } from "../db";
import { collections, items } from "../db/schema";
import { uploadToCloudinary } from "../utils/upload";
import { eq } from "drizzle-orm";

export const CollectionService = {
  // Get All Collections (Simple pagination placeholder)
  getAllCollections: async () => {
    try {
      const result = await db.query.collections.findMany({
        with: {
          category: true,
          // items: true, // Uncomment jika ingin liat item fisik
        },
        limit: 100, // Limit untuk performa
      });

      return {
        success: true,
        message: "Get Collections Successfully",
        data: result,
      };
    } catch (err) {
      console.error("[CollectionService] Error getting collections:", err);
      return {
        success: false,
        message: "Failed to get collections",
        data: null,
      };
    }
  },

  // Create New Collection
  createCollection: async (data: any, file?: Express.Multer.File) => {
    try {
      // 1. Upload Cover Image ke Cloudinary (Jika ada)
      let coverImageUrl = null;
      let coverPublicId = null;

      if (file) {
        const uploadResult = await uploadToCloudinary(
          file.buffer,
          "library/covers",
        );
        coverImageUrl = uploadResult.url;
        coverPublicId = uploadResult.publicId;
      }

      const collectionData = {
        title: data.title,
        author: data.author,
        publisher: data.publisher,
        publicationYear: data.publicationYear,
        isbn: data.isbn,
        type: data.type,
        categoryId: data.categoryId, // Pastikan ID Kategori valid di DB
        description: data.description,
        image: coverImageUrl,
      };

      // 3. Insert ke Database
      const [newCollection] = await db
        .insert(collections)
        .values(collectionData)
        .returning();

      if (!newCollection) {
        throw new Error("Failed to insert collection");
      }

      // 4. (Opsional) Jika buku fisik, bisa auto-generate item inventory di sini
      // Namun membutuhkan locationId yang valid. Kita skip dulu untuk kesederhanaan.

      return {
        success: true,
        message: "Collection created successfully",
        data: {
          ...newCollection,
          coverImageUrl, // Sertakan URL di response agar frontend bisa lihat
        },
      };
    } catch (err) {
      console.error("[CollectionService] Error creating collection:", err);
      return {
        success: false,
        message: "Failed to create collection. Ensure Category ID exists.",
        data: null,
      };
    }
  },
};
