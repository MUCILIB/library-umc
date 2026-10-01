import { type Request, type Response } from "express";
import { GuestService } from "../service/guest.service";
import {
  scanMemberSchema,
  createNonMemberGuestSchema,
  guestFilterQuerySchema
} from "../validation/guest.validation";

const guestService = new GuestService();

export class GuestController {
  /**
   * GET /guests/search - Search users from Campus API
   */
  async searchCampusUsers(req: Request, res: Response) {
    try {
      const { name, faculty, major, email } = req.query;

      const result = await guestService.searchUsersFromCampus({
        name: name as string,
        faculty: faculty as string,
        major: major as string,
        email: email as string
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("[GuestController] Error searching campus users:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * GET /guests/campus - Get ALL users from Campus API
   */
  async getAllCampusUsers(req: Request, res: Response) {
    try {
      const result = await guestService.getAllUsersFromCampus();

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("[GuestController] Error getting all campus users:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * GET /guests/campus/:email - Get User from Campus API
   */
  async getUserFromCampus(req: Request, res: Response) {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(400).json({
          success: false,
          message: "Email is required",
          data: null
        });
        return;
      }

      const result = await guestService.getDataUserFromCampus(email as string);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("[GuestController] Error getting campus user:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  // POST /absensi - Create Absensi (Mahasiswa)
  async createAbsensi(req: Request, res: Response) {
    try {
      const { name, major } = req.body;

      if (!name || !major) {
        res.status(400).json({
          success: false,
          message: "Name and major are required",
          data: null
        });
        return;
      }

      const result = await guestService.createAbsensi(name, major);

      if (!result.success) {
        res.status(400).json(result);

        return;
      }

      res.status(201).json(result);
    } catch (err) {
      console.error("[GuestController] Error creating absensi:", err);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * POST /guests/scan - Scan Presensi Member (KTM / Barcode / QR / NIM)
   */
  async scanMember(req: Request, res: Response) {
    try {
      const parsed = scanMemberSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || "Validation error",
          data: null
        });
        return;
      }

      const result = await guestService.scanMember(parsed.data.memberIdentifier);

      if (!result.success) {
        if (result.code === "not_found") {
          res.status(404).json(result);
          return;
        }
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("[GuestController] Error scanning member:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * POST /guests/non-member - Presensi Pengunjung Non-Member (Tamu Umum)
   */
  async createNonMember(req: Request, res: Response) {
    try {
      const parsed = createNonMemberGuestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: parsed.error.issues[0]?.message || "Validation error",
          data: null
        });
        return;
      }

      const result = await guestService.createNonMemberGuest(parsed.data);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("[GuestController] Error creating non-member guest:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * POST /guests - Create Guest Log
   */
  async createGuestLog(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: "Email is required",
          data: null
        });
        return;
      }

      const result = await guestService.createGuestLog(email);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("[GuestController] Error creating guest log:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * GET /guests - Get All Guest Logs
   */
  async getGuestLogs(req: Request, res: Response) {
    try {
      const parsed = guestFilterQuerySchema.safeParse(req.query);
      const query = parsed.success
        ? parsed.data
        : {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 50
          };

      const result = await guestService.getAllGuestLogs(query);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("[GuestController] Error getting guest logs:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * GET /guests/stats - Get Guest Stats
   */
  async getGuestStats(req: Request, res: Response) {
    try {
      const result = await guestService.getGuestStats();

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("[GuestController] Error getting guest stats:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * POST /guests/direct - Create Guest Log directly (no Campus API lookup)
   * Used by admin dropdown where member data is already available
   */
  async createGuestLogDirect(req: Request, res: Response) {
    try {
      const { name, email, identifier, faculty, major } = req.body;

      if (!name || !email) {
        res.status(400).json({
          success: false,
          message: "Name and email are required",
          data: null
        });
        return;
      }

      const result = await guestService.createGuestLogDirect({
        name,
        email,
        identifier: identifier || "UNKNOWN",
        faculty: faculty || "Not Specified",
        major: major || "Not Specified"
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      console.error(
        "[GuestController] Error creating direct guest log:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }

  /**
   * DELETE /guests/:id - Delete Guest Log
   */
  async deleteGuestLog(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: "ID is required",
          data: null
        });
        return;
      }

      const result = await guestService.deleteGuestLog(id as string);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("[GuestController] Error deleting guest log:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        data: null
      });
    }
  }
}
