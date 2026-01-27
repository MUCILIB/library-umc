import { Request, Response } from "express";
import { GuestService } from "../service/guest.service";

// POST /guests (Admin Only)
export const createGuestLog = async (req: Request, res: Response) => {
  try {
    // Validasi input sederhana
    const { name, identifier, email, institution, faculty, major, purpose } = req.body;

    if (!name || !identifier) {
      return res.status(400).json({
        success: false,
        message: "Name and Identifier (NIM/KTP) are required",
      });
    }

    const result = await GuestService.createGuestLog({
      name,
      identifier,
      email,
      institution,
      faculty,
      major,
      purpose,
    });

    if (!result.success) return res.status(500).json(result);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// GET /guests (Admin Only)
export const getGuestLogs = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const result = await GuestService.getAllGuestLogs(limit, page);
  return res.json(result);
};

// GET /guests/stats
export const getGuestStats = async (req: Request, res: Response) => {
  const result = await GuestService.getGuestStats();
  return res.json(result);
};
