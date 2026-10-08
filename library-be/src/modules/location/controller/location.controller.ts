import { type NextFunction, type Request, type Response } from "express";
import locationService from "../service/location.service";
import {
  createLocationSchema,
  updateLocationSchema,
} from "../validation/location.validation";
import { sendValidationError } from "../../../utils/api-utils";

class LocationController {
  async getAllLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await locationService.getAllLocations();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getLocationById(req: Request, res: Response, next: NextFunction) {
    try {
      const numericId = parseInt(String(req.params.id), 10);
      if (isNaN(numericId) || numericId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lokasi tidak valid. Harus berupa angka bulat positif.",
          data: null,
        });
      }
      const result = await locationService.getLocationById(numericId);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = createLocationSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const result = await locationService.createLocation({
        room: validation.data.room,
        rack: validation.data.rack,
        shelf: validation.data.shelf,
      });

      if (!result.success) {
        return res.status(409).json(result);
      }
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const numericId = parseInt(String(req.params.id), 10);
      if (isNaN(numericId) || numericId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lokasi tidak valid. Harus berupa angka bulat positif.",
          data: null,
        });
      }
      const validation = updateLocationSchema.safeParse(req.body);
      if (!validation.success) {
        return sendValidationError(res, validation.error.flatten());
      }

      const result = await locationService.updateLocation(numericId, {
        room: validation.data.room,
        rack: validation.data.rack,
        shelf: validation.data.shelf,
      } as any);

      if (!result.success) {
        return res.status(404).json(result);
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const numericId = parseInt(String(req.params.id), 10);
      if (isNaN(numericId) || numericId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID lokasi tidak valid. Harus berupa angka bulat positif.",
          data: null,
        });
      }
      const result = await locationService.deleteLocation(numericId);
      if (!result.success) {
        if ((result as any).conflict) {
          return res.status(409).json(result);
        }
        return res.status(404).json(result);
      }
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new LocationController();
