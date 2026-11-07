import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleService } from "../service/role.service";
import { db } from "../../../db";
import { SIDEBAR_MENUS } from "../role.constants";

vi.mock("../../../db", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe("RoleService - Dynamic RBAC & Matrix Hak Akses", () => {
  let roleService: RoleService;

  beforeEach(() => {
    vi.clearAllMocks();
    roleService = new RoleService();
    // Default ensureSystemRoles mock: role already exists so it doesn't try to insert
    vi.spyOn(roleService, "ensureSystemRoles").mockResolvedValue();
  });

  describe("getUserPermissions", () => {
    it("super_admin memiliki hak akses penuh (canView, canAdd, canEdit, canDelete = true) di seluruh 20 sub-menu", async () => {
      const perms = await roleService.getUserPermissions("super_admin");

      expect(Object.keys(perms)).toHaveLength(SIDEBAR_MENUS.length);
      for (const menu of SIDEBAR_MENUS) {
        expect(perms[menu.key]).toEqual({
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
        });
      }
    });

    it("mengembalikan hak akses sesuai database untuk role non-super_admin", async () => {
      const mockDbPermissions = [
        {
          roleId: "staff",
          menuKey: "circulation",
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: false,
        },
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockDbPermissions),
        }),
      });

      const perms = await roleService.getUserPermissions("staff");

      expect(perms["circulation"]).toEqual({
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: false,
      });

      // Menu lain default false
      expect(perms["audit"]).toEqual({
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      });
    });
  });

  describe("createRole", () => {
    it("berhasil membuat custom role baru dengan slug dan matriks izin default", async () => {
      // Mock check duplikasi: kosong
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock insert returning
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "asisten_lab",
              name: "Asisten Lab",
              description: "Pengelola lab komputer & repositori",
              isSystem: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      });

      const res = await roleService.createRole({
        name: "Asisten Lab",
        description: "Pengelola lab komputer & repositori",
      });

      expect(res.id).toBe("asisten_lab");
      expect(res.name).toBe("Asisten Lab");
      expect(res.permissions).toHaveLength(SIDEBAR_MENUS.length);
      expect(res.permissions[0].canView).toBe(false);
    });

    it("gagal membuat role dengan nama kosong", async () => {
      await expect(
        roleService.createRole({ name: "   " })
      ).rejects.toThrow("Nama role wajib diisi");
    });

    it("gagal membuat role jika slug/id sudah terdaftar", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "staff" }]),
          }),
        }),
      });

      await expect(
        roleService.createRole({ name: "Staff" })
      ).rejects.toThrow("sudah terdaftar");
    });
  });

  describe("deleteRole", () => {
    it("menolak penghapusan system role bawaan", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "super_admin", isSystem: true },
            ]),
          }),
        }),
      });

      await expect(roleService.deleteRole("super_admin")).rejects.toThrow(
        "Role sistem bawaan tidak dapat dihapus"
      );
    });

    it("menolak penghapusan custom role jika masih digunakan oleh user", async () => {
      // First select: role lookup
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "custom_role", isSystem: false },
            ]),
          }),
        }),
      });

      // Second select: Users assigned to this role
      (db.select as any).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "user_1" }]),
          }),
        }),
      });

      await expect(roleService.deleteRole("custom_role")).rejects.toThrow(
        "masih digunakan oleh sejumlah pengguna"
      );
    });
  });

  describe("updateRolePermissions", () => {
    it("menolak perubahan hak akses pada role super_admin", async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: "super_admin", isSystem: true },
            ]),
          }),
        }),
      });

      await expect(
        roleService.updateRolePermissions("super_admin", [])
      ).rejects.toThrow("Hak akses role Super Admin terkunci secara permanen");
    });
  });
});
