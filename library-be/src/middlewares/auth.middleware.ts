import { type Request, type Response, type NextFunction } from "express";
import { getSession } from "../utils/auth-utils";
import { roleService } from "../modules/role/service/role.service";

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

    // Simpan session user ke response locals dan request object
    req.user = session.user;
    req.session = session.session;

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

      // Super Admin bypass: super_admin has universal access to all endpoints
      if (userRole === "super_admin") {
        next();
        return;
      }

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

/**
 * Middleware dinamis untuk membatasi akses berdasarkan matriks izin RBAC per sub-menu
 * @param menuKey Kunci sub-menu (misal: "circulation", "loans", "bibliographies")
 * @param action Tindakan yang diminta: "view" | "add" | "edit" | "delete"
 */
export const requirePermission = (
  menuKey: string | string[],
  action: "view" | "add" | "edit" | "delete" = "view"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
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
      if (userRole === "super_admin") {
        next();
        return;
      }

      const keys = Array.isArray(menuKey) ? menuKey : [menuKey];

      // Modul koleksi publik (katalog buku, repositori karya ilmiah, dan e-book)
      // berhak dilihat oleh seluruh pengguna terotentikasi (student, external, lecturer, dsb)
      if (action === "view" && keys.some((k) => ["bibliographies", "repository", "ebooks"].includes(k))) {
        next();
        return;
      }

      const permissions = await roleService.getUserPermissions(userRole);

      const actionKey =
        action === "view"
          ? "canView"
          : action === "add"
          ? "canAdd"
          : action === "edit"
          ? "canEdit"
          : "canDelete";

      const hasPermission = keys.some((k) => permissions[k] && permissions[k][actionKey]);

      if (hasPermission) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        message: `Forbidden - Role '${userRole}' tidak memiliki hak akses ${action} pada modul ${keys.join("/")}`,
        data: null,
      });
    } catch (error) {
      console.error("[AuthMiddleware] Error checking permission:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during permission check",
        data: null,
      });
    }
  };
};

