import { Request, Response } from "express";
import { GuestService } from "../service/guest.service";

const guestService = new GuestService();

/**
 * GET /guests/search - Search users from Campus API
 */
export const searchCampusUsers = async (req: Request, res: Response) => {
  try {
    const { name, faculty, major, email } = req.query;

    const result = await guestService.searchUsersFromCampus({
      name: name as string,
      faculty: faculty as string,
      major: major as string,
      email: email as string,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[GuestController] Error searching campus users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * GET /guests/campus - Get ALL users from Campus API
 */
export const getAllCampusUsers = async (req: Request, res: Response) => {
  try {
    const result = await guestService.getAllUsersFromCampus();

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[GuestController] Error getting all campus users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * GET /guests/campus/:email - Get User from Campus API
 */
export const getUserFromCampus = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        data: null,
      });
    }

    const result = await guestService.getDataUserFromCampus(email as string);

    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[GuestController] Error getting campus user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * POST /guests - Create Guest Log
 */
export const createGuestLog = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        data: null,
      });
    }

    const result = await guestService.createGuestLog(email);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("[GuestController] Error creating guest log:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * GET /guests - Get All Guest Logs
 */
export const getGuestLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await guestService.getAllGuestLogs(limit, page);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[GuestController] Error getting guest logs:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * GET /guests/stats - Get Guest Stats
 */
export const getGuestStats = async (req: Request, res: Response) => {
  try {
    const result = await guestService.getGuestStats();

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[GuestController] Error getting guest stats:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};

/**
 * DELETE /guests/:id - Delete Guest Log
 */
export const deleteGuestLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID is required",
        data: null,
      });
    }

    const result = await guestService.deleteGuestLog(id as string);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("[GuestController] Error deleting guest log:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
};
