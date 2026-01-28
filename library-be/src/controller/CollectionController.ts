import { Request, Response } from "express";
import { CollectionService } from "../service/collection.service";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "../validation/collection.validation";

const collectionService = new CollectionService();

/**
 * Get All Collections
 */
export const getAllCollections = async (req: Request, res: Response) => {
  try {
    const result = await collectionService.getAllCollections();

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
 * Get Collection By ID
 */
export const getCollectionById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const result = await collectionService.getCollectionById(id);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[CollectionController] Error getting collection:", err);
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
    const result = await collectionService.createCollection(
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

export const updateCollection = async (req: Request, res: Response) => {
  try {
    const validation = updateCollectionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        data: validation.error.flatten(),
      });
    }

    const id = req.params.id as string;
    const file = req.file; // Support file upload for cover image

    const result = await collectionService.updateCollection(
      id,
      validation.data,
      file,
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Collection Controller] Error Updating Collection ", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const result = await collectionService.deleteCollection(id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[CollectionController] Error deleting collection:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};
