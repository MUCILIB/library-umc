import { type Request, type Response, type NextFunction } from "express";
import { roleService } from "../service/role.service";
import { SIDEBAR_MENUS } from "../role.constants";
import auditService from "../../audit/service/audit.service";

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
      const { name, description } = req.body;
      const data = await roleService.createRole({ name, description });

      const userId = (req as any).user?.id;
      if (userId) {
        await auditService.createLog({
          userId,
          action: "create",
          entity: "Users",
          entityId: data.id,
          ipAddress: req.ip,
        });
      }

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
      const { name, description } = req.body;
      const data = await roleService.updateRole(id, { name, description });

      const userId = (req as any).user?.id;
      if (userId) {
        await auditService.createLog({
          userId,
          action: "update",
          entity: "Users",
          entityId: id,
          ipAddress: req.ip,
        });
      }

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
      await roleService.deleteRole(id);

      const userId = (req as any).user?.id;
      if (userId) {
        await auditService.createLog({
          userId,
          action: "delete",
          entity: "Users",
          entityId: id,
          ipAddress: req.ip,
        });
      }

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

      const data = await roleService.updateRolePermissions(id, permissions);

      const userId = (req as any).user?.id;
      if (userId) {
        await auditService.createLog({
          userId,
          action: "update",
          entity: "Users",
          entityId: id,
          ipAddress: req.ip,
        });
      }

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
