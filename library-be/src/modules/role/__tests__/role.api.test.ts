import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { roleRoutes } from "../route/role.route";
import { roleService } from "../service/role.service";
import { SIDEBAR_MENUS } from "../role.constants";

vi.mock("../service/role.service", () => ({
  roleService: {
    getAllRoles: vi.fn(),
    getRoleById: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    updateRolePermissions: vi.fn(),
    getUserPermissions: vi.fn(),
  },
}));

vi.mock("../../audit/service/audit.service", () => ({
  default: {
    createLog: vi.fn().mockResolvedValue({ id: "audit-1" }),
  },
}));

let mockUser: { id: string; role: string } | null = null;

vi.mock("../../../middlewares/auth.middleware", () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    if (!mockUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Otentikasi dibutuhkan",
      });
    }
    req.user = mockUser;
    next();
  },
  requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Otentikasi dibutuhkan",
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Anda tidak memiliki akses",
      });
    }
    next();
  },
  requireRoles: (...allowedRoles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Otentikasi dibutuhkan",
      });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Anda tidak memiliki akses",
      });
    }
    next();
  },
}));

vi.mock("../../../middlewares/rateLimiter", () => ({
  publicApiLimiter: (req: any, res: any, next: any) => next(),
}));

describe("Role & Dynamic Sidebar API Integration Tests", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    app = express();
    app.use(express.json());
    app.use("/api", roleRoutes);
  });

  describe("Skenario 1: Verifikasi Menu Catalog & Metadata Sidebar (GET /api/roles/menus)", () => {
    it("harus mengembalikan katalog 20 sub-menu sidebar publik tanpa perlu login", async () => {
      const res = await request(app).get("/api/roles/menus");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(SIDEBAR_MENUS.length);
      expect(res.body.data[0]).toHaveProperty("key");
      expect(res.body.data[0]).toHaveProperty("label");
      expect(res.body.data[0]).toHaveProperty("group");
    });
  });

  describe("Skenario 2: Hak Akses Penuh Role Super Admin (GET /api/roles/me/permissions)", () => {
    it("harus memberikan hak akses penuh (canView, canAdd, canEdit, canDelete: true) untuk Super Admin", async () => {
      mockUser = { id: "admin-1", role: "super_admin" };

      const allGrantedPermissions = SIDEBAR_MENUS.map((menu) => ({
        menuKey: menu.key,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      }));

      vi.mocked(roleService.getUserPermissions).mockResolvedValue(allGrantedPermissions as any);

      const res = await request(app).get("/api/roles/me/permissions");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("super_admin");
      expect(res.body.data.permissions.length).toBe(SIDEBAR_MENUS.length);

      const allPermsTrue = res.body.data.permissions.every(
        (p: any) => p.canView && p.canAdd && p.canEdit && p.canDelete
      );
      expect(allPermsTrue).toBe(true);
    });
  });

  describe("Skenario 3: Hak Akses Terisolasi Role Non-Superadmin (GET /api/roles/me/permissions)", () => {
    it("harus mengembalikan izin terbatas untuk role external/student sesuai database", async () => {
      mockUser = { id: "ext-1", role: "external" };

      const restrictedPermissions = [
        { menuKey: "dashboard", canView: true, canAdd: false, canEdit: false, canDelete: false },
        { menuKey: "catalog", canView: true, canAdd: false, canEdit: false, canDelete: false },
        { menuKey: "roles", canView: false, canAdd: false, canEdit: false, canDelete: false },
        { menuKey: "users", canView: false, canAdd: false, canEdit: false, canDelete: false },
      ];

      vi.mocked(roleService.getUserPermissions).mockResolvedValue(restrictedPermissions as any);

      const res = await request(app).get("/api/roles/me/permissions");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("external");

      const rolesPerm = res.body.data.permissions.find((p: any) => p.menuKey === "roles");
      expect(rolesPerm?.canView).toBe(false);

      const catalogPerm = res.body.data.permissions.find((p: any) => p.menuKey === "catalog");
      expect(catalogPerm?.canView).toBe(true);
      expect(catalogPerm?.canAdd).toBe(false);
    });
  });

  describe("Skenario 4: Proteksi Autentikasi & RBAC Endpoint Manajemen Role", () => {
    it("harus menolak request tanpa login (401 Unauthorized)", async () => {
      mockUser = null;

      const resRoles = await request(app).get("/api/roles");
      expect(resRoles.status).toBe(401);
      expect(resRoles.body.success).toBe(false);

      const resMyPerms = await request(app).get("/api/roles/me/permissions");
      expect(resMyPerms.status).toBe(401);
    });

    it("harus menolak akses role non-superadmin ke manajemen role (403 Forbidden)", async () => {
      mockUser = { id: "ext-1", role: "external" };

      const res = await request(app).get("/api/roles");
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      const resCreate = await request(app).post("/api/roles").send({ name: "hacker_role" });
      expect(resCreate.status).toBe(403);

      const resUpdatePerms = await request(app)
        .put("/api/roles/staff/permissions")
        .send({ permissions: [] });
      expect(resUpdatePerms.status).toBe(403);
    });

    it("harus mengizinkan Super Admin mengakses manajemen role (200 OK)", async () => {
      mockUser = { id: "admin-1", role: "super_admin" };
      vi.mocked(roleService.getAllRoles).mockResolvedValue([
        { id: "super_admin", name: "Super Admin", isSystem: true },
        { id: "staff", name: "Staff Perpustakaan", isSystem: false },
      ] as any);

      const res = await request(app).get("/api/roles");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe("Skenario 5: Mutasi Matriks Hak Akses (PUT /api/roles/:id/permissions)", () => {
    it("harus memvalidasi payload format array permissions (400 Bad Request jika bukan array)", async () => {
      mockUser = { id: "admin-1", role: "super_admin" };

      const res = await request(app)
        .put("/api/roles/staff/permissions")
        .send({ permissions: "bukan-array" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Data 'permissions' harus berupa array");
    });

    it("harus sukses mengupdate matriks permission ketika di-request oleh Super Admin (200 OK)", async () => {
      mockUser = { id: "admin-1", role: "super_admin" };

      const newPermissions = [
        { menuKey: "circulation", canView: true, canAdd: true, canEdit: false, canDelete: false },
        { menuKey: "catalog", canView: true, canAdd: false, canEdit: false, canDelete: false },
      ];

      vi.mocked(roleService.updateRolePermissions).mockResolvedValue(newPermissions as any);

      const res = await request(app)
        .put("/api/roles/staff/permissions")
        .send({ permissions: newPermissions });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("berhasil diperbarui");
      expect(roleService.updateRolePermissions).toHaveBeenCalledWith("staff", newPermissions);
    });
  });
});
