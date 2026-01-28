import { db } from "../db";
import { collections, items, categories } from "../db/schema";
import { uploadToCloudinary } from "../utils/upload";
import { eq } from "drizzle-orm";

type CollectionData = {
  coverImageUrl?: string;
  title?: string;
  author?: string;
  publisher?: string;
  publicationYear?: string;
  isbn?: string;
  type?: "physical_book" | "ebook" | "journal" | "thesis";
  categoryId?: number;
  description?: string;
};

export class CollectionService {
  // Get All Collections (Simple pagination placeholder)
  async getAllCollections() {
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
  }

  // Create New Collection
  async createCollection(data: CollectionData, file?: Express.Multer.File) {
    try {
      // 1. Validate categoryId
      if (data.categoryId) {
        const category = await db.query.categories.findFirst({
          where: eq(categories.id, data.categoryId),
        });

        if (!category) {
          return {
            success: false,
            message: "Category not found. Please select a valid category.",
            data: null,
          };
        }
      }

      // 2. Check for duplicate ISBN (if provided)
      if (data.isbn && data.isbn.trim() !== "") {
        const existingBook = await db.query.collections.findFirst({
          where: eq(collections.isbn, data.isbn.trim()),
        });

        if (existingBook) {
          return {
            success: false,
            message: "A book with this ISBN already exists",
            data: null,
          };
        }
      }

      // 3. Upload Cover Image ke Cloudinary (Jika ada)
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
        isbn: data.isbn?.trim() || null,
        type: data.type,
        categoryId: data.categoryId,
        description: data.description,
        image: coverImageUrl,
      };

      // 4. Insert ke Database
      const [newCollection] = await db
        .insert(collections)
        .values(collectionData)
        .returning();

      if (!newCollection) {
        return {
          success: false,
          message: "Failed to insert collection",
          data: null,
        };
      }

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
        message: "Failed to create collection. Please try again.",
        data: null,
      };
    }
  }

  async updateCollection(
    id: string,
    data: CollectionData,
    file?: Express.Multer.File,
  ) {
    try {
      const collection = await db.query.collections.findFirst({
        where: eq(collections.id, id),
      });

      if (!collection) {
        return {
          success: false,
          message: "Collection not found",
          data: null,
        };
      }

      // Handle Image Upload if file provided
      let coverImageUrl = collection.image; // Keep existing image by default
      if (file) {
        const uploadResult = await uploadToCloudinary(
          file.buffer,
          "library/covers",
        );
        coverImageUrl = uploadResult.url;
      }

      const updateData = {
        ...data,
        image: coverImageUrl,
        updatedAt: new Date(),
      };

      const [updatedCollection] = await db
        .update(collections)
        .set(updateData)
        .where(eq(collections.id, id))
        .returning();

      if (!updatedCollection) {
        return {
          success: false,
          message: "Failed to update collection",
          data: null,
        };
      }

      return {
        success: true,
        message: "Collection updated successfully",
        data: updatedCollection,
      };
    } catch (err) {
      console.error("[CollectionService] Error updating collection:", err);
      return {
        success: false,
        message: "Failed to update collection",
        data: null,
      };
    }
  }

  async deleteCollection(id: string) {
    try {
      const collection = await db.query.collections.findFirst({
        where: eq(collections.id, id),
      });

      if (!collection) {
        return {
          success: false,
          message: "Collection not found",
          data: null,
        };
      }

      const deletedCollection = await db
        .delete(collections)
        .where(eq(collections.id, id));

      if (!deletedCollection) {
        return {
          success: false,
          message: "Failed to delete collection",
          data: null,
        };
      }

      return {
        success: true,
        message: "Collection deleted successfully",
        data: deletedCollection,
      };
    } catch (err) {
      console.error("[Collection Service] Error deleting collections ", err);
      return {
        success: false,
        message: "Failed to delete collection",
        data: null,
      };
    }
  }

  async getCollectionById(id: string) {
    try {
      // Validate ID
      if (!id) {
        return {
          success: false,
          message: "Invalid collection ID",
          data: null,
        };
      }

      // Check if collection exists
      const existingCollection = await db.query.collections.findFirst({
        where: eq(collections.id, id),
      });

      if (!existingCollection) {
        return {
          success: false,
          message: "Collection not found",
          data: null,
        };
      }

      return {
        success: true,
        message: "Collection retrieved successfully",
        data: existingCollection,
      };
    } catch (err) {
      console.error("[CollectionService] Error getting collection:", err);
      return {
        success: false,
        message: "Failed to get collection",
        data: null,
      };
    }
  }
}
