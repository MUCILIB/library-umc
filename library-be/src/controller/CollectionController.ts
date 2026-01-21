import { Request, Response } from "express";
import { CollectionService } from "../service/collection.service";
import { createCollectionSchema } from "../validation/collection.validation";

/**
 * Get All Collections
 */
export const getAllCollections = async (req: Request, res: Response) => {
  try {
    const result = await CollectionService.getAllCollections();

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[CollectionController] Error getting collections:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * Create Collection (with File Upload)
 */
export const createCollection = async (req: Request, res: Response) => {
  try {
    // 1. Validation (req.body)
    const validation = createCollectionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: validation.error.flatten(),
      });
    }

    // 2. Process in Service
    const file = req.file;
    const result = await CollectionService.createCollection(
      validation.data,
      file,
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // 201 Created
    return res.status(201).json(result);
  } catch (err) {
    console.error("[CollectionController] Error creating collection:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};
