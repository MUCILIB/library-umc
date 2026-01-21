import { Request, Response, NextFunction } from "express";
import { getSession } from "../utils/auth-utils";

/**
 * Middleware untuk memastikan user sudah login
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await getSession(req);

    if (!session) {
      res.status(401).json({
        success: false,
        message: "Unauthorized - Silakan login terlebih dahulu",
        data: null,
      });
      return;
    }

    // Simpan session user ke response locals agar bisa diakses di controller jika perlu
    res.locals.user = session.user;
    res.locals.session = session.session;

    next();
  } catch (error) {
    console.error("[AuthMiddleware] Error checking session:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication check",
      data: null,
    });
  }
};

/**
 * Middleware untuk membatasi akses berdasarkan role
 * @param allowedRoles Array of roles yang diizinkan (misal: ["admin", "super_admin"])
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Kita asumsikan isAuthenticated sudah dijalankan sebelumnya
      // Namun untuk safety, kita cek lagi sessionnya
      const session = await getSession(req);

      if (!session) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
          data: null,
        });
        return;
      }

      const userRole = session.user.role || "";

      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          message: "Forbidden - Anda tidak memiliki akses ke resource ini",
          data: null,
        });
        return;
      }

      next();
    } catch (error) {
      console.error("[AuthMiddleware] Error checking role:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during role check",
        data: null,
      });
    }
  };
};
