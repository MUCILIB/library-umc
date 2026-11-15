import { type Request, type Response, type NextFunction } from "express";
import { roleService } from "../service/role.service";
import { SIDEBAR_MENUS } from "../role.constants";
import { roleCreateSchema, roleUpdateSchema, rolePermissionsSchema } from "../role.validation";

export class RoleController {
  /**
   * Mengambil daftar metadata 20 sub-menu sidebar
   */
  async getSidebarMenus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: "Sidebar menus retrieved successfully",
        data: SIDEBAR_MENUS,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mengambil semua role
   */
  async getAllRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await roleService.getAllRoles();
      res.status(200).json({
        success: true,
        message: "Roles retrieved successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mengambil detail satu role beserta matriks hak aksesnya
   */
  async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const data = await roleService.getRoleById(id);

      if (!data) {
        res.status(404).json({
          success: false,
          message: `Role dengan id '${id}' tidak ditemukan`,
          data: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Role details retrieved successfully",
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Membuat custom role baru
   */
  async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = roleCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: "Invalid role data", data: null });
        return;
      }
      const { name, description } = parsed.data;
      const actorId = (req as Request & { user: { id: string } }).user.id;
      const data = await roleService.createRole({ name, description: description ?? undefined }, {
        actorId, ipAddress: req.ip, userAgent: req.get("user-agent"),
      });

      res.status(201).json({
        success: true,
        message: `Role '${data.name}' berhasil dibuat`,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mengupdate informasi role (nama/deskripsi)
   */
  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const parsed = roleUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: "Invalid role data", data: null });
        return;
      }
      const { name, description } = parsed.data;
      const data = await roleService.updateRole(id, { name, description }, { actorId: req.user!.id, ipAddress: req.ip, userAgent: req.get("user-agent") });

      res.status(200).json({
        success: true,
        message: "Role berhasil diperbarui",
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Menghapus role custom
   */
  async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      await roleService.deleteRole(id, { actorId: req.user!.id, ipAddress: req.ip, userAgent: req.get("user-agent") });

      res.status(200).json({
        success: true,
        message: `Role '${id}' berhasil dihapus`,
        data: null,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update matriks permission toggle untuk role
   */
  async updatePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        res.status(400).json({
          success: false,
          message: "Data 'permissions' harus berupa array matriks hak akses",
          data: null,
        });
        return;
      }

      const parsed = rolePermissionsSchema.safeParse(permissions);
      if (!parsed.success) {
        res.status(400).json({ success: false, message: "Invalid permission matrix", data: null });
        return;
      }
      const data = await roleService.updateRolePermissions(id, parsed.data, { actorId: req.user!.id, ipAddress: req.ip, userAgent: req.get("user-agent") });

      res.status(200).json({
        success: true,
        message: "Matriks hak akses role berhasil diperbarui",
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mengambil permission role user saat ini (untuk sidebar dan dynamic button checking di frontend)
   */
  async getMyPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const userRole = user?.role || "student";
      const permissions = await roleService.getUserPermissions(userRole);

      res.status(200).json({
        success: true,
        message: "User permissions retrieved successfully",
        data: {
          role: userRole,
          permissions,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const roleController = new RoleController();
export default roleController;
