import { db } from "../../../db";
import { roles, rolePermissions, Users } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import {
  SIDEBAR_MENUS,
  DEFAULT_SYSTEM_ROLES,
  SYSTEM_ROLE_IDS,
} from "../role.constants";

export interface PermissionInput {
  menuKey: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: PermissionInput[];
}

export class RoleService {
  /**
   * Pastikan default system roles dan izin dasarnya tersedia di database
   */
  async ensureSystemRoles(): Promise<void> {
    for (const sysRole of DEFAULT_SYSTEM_ROLES) {
      const existing = await db
        .select()
        .from(roles)
        .where(eq(roles.id, sysRole.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(roles).values({
          id: sysRole.id,
          name: sysRole.name,
          description: sysRole.description,
          isSystem: true,
        });

        // Insert default permissions
        for (const menu of SIDEBAR_MENUS) {
          const isSuperAdmin = sysRole.id === "super_admin";
          const isStaff = sysRole.id === "staff";
          const isStaffAllowedMenu = [
            "dashboard",
            "circulation",
            "loans",
            "returnApprovals",
            "fines",
            "cardApprovals",
            "bibliographies",
            "items",
            "ebooks",
            "repository",
            "recommendations",
            "importData",
            "exportData",
            "locations",
            "guests",
            "reports",
          ].includes(menu.key);

          await db.insert(rolePermissions).values({
            roleId: sysRole.id,
            menuKey: menu.key,
            canView: isSuperAdmin || (isStaff && isStaffAllowedMenu),
            canAdd: isSuperAdmin || (isStaff && isStaffAllowedMenu && !["reports"].includes(menu.key)),
            canEdit: isSuperAdmin || (isStaff && isStaffAllowedMenu && !["reports", "importData", "exportData"].includes(menu.key)),
            canDelete: isSuperAdmin || (isStaff && ["items", "ebooks"].includes(menu.key)),
          });
        }
      }
    }
  }

  /**
   * Mengambil semua role beserta rekapitulasi permission
   */
  async getAllRoles(): Promise<any[]> {
    await this.ensureSystemRoles();

    const allRoles = await db.select().from(roles);
    const allPermissions = await db.select().from(rolePermissions);

    return allRoles.map((r) => {
      const perms = allPermissions.filter((p) => p.roleId === r.id);
      return {
        ...r,
        permissionsCount: perms.filter((p) => p.canView).length,
      };
    });
  }

  /**
   * Mengambil detail satu role beserta matriks lengkap 20 sub-menu
   */
  async getRoleById(roleId: string): Promise<RoleWithPermissions | null> {
    await this.ensureSystemRoles();

    const roleData = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (roleData.length === 0) {
      return null;
    }

    const r = roleData[0];
    const existingPerms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    const permsMap = new Map(existingPerms.map((p) => [p.menuKey, p]));

    const permissions: PermissionInput[] = SIDEBAR_MENUS.map((menu) => {
      const found = permsMap.get(menu.key);
      const isSuperAdmin = r.id === "super_admin";
      return {
        menuKey: menu.key,
        canView: isSuperAdmin || (found ? Boolean(found.canView) : false),
        canAdd: isSuperAdmin || (found ? Boolean(found.canAdd) : false),
        canEdit: isSuperAdmin || (found ? Boolean(found.canEdit) : false),
        canDelete: isSuperAdmin || (found ? Boolean(found.canDelete) : false),
      };
    });

    return {
      ...r,
      permissions,
    };
  }

  /**
   * Membuat custom role baru
   */
  async createRole(data: {
    name: string;
    description?: string;
  }): Promise<RoleWithPermissions> {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error("Nama role wajib diisi");
    }

    // Buat slug id
    const slug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const roleId = slug || `role_${Date.now()}`;

    // Cek duplikasi ID
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Role dengan id/nama '${trimmedName}' sudah terdaftar`);
    }

    const [created] = await db
      .insert(roles)
      .values({
        id: roleId,
        name: trimmedName,
        description: data.description || null,
        isSystem: false,
      })
      .returning();

    // Inisialisasi permission default kosong untuk tiap menu
    const permissions: PermissionInput[] = [];
    for (const menu of SIDEBAR_MENUS) {
      await db.insert(rolePermissions).values({
        roleId: created.id,
        menuKey: menu.key,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      });

      permissions.push({
        menuKey: menu.key,
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
      });
    }

    return {
      ...created,
      permissions,
    };
  }

  /**
   * Memperbarui informasi nama dan deskripsi role
   */
  async updateRole(
    roleId: string,
    data: { name?: string; description?: string }
  ): Promise<any> {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Role tidak ditemukan");
    }

    const currentRole = existing[0];
    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (data.description !== undefined) {
      updatePayload.description = data.description;
    }

    // Role sistem tidak boleh diganti namanya secara sembarangan
    if (data.name && !currentRole.isSystem) {
      updatePayload.name = data.name.trim();
    }

    const [updated] = await db
      .update(roles)
      .set(updatePayload)
      .where(eq(roles.id, roleId))
      .returning();

    return updated;
  }

  /**
   * Menghapus custom role
   */
  async deleteRole(roleId: string): Promise<void> {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Role tidak ditemukan");
    }

    if (existing[0].isSystem || (SYSTEM_ROLE_IDS as readonly string[]).includes(roleId)) {
      throw new Error("Role sistem bawaan tidak dapat dihapus");
    }

    // Cek apakah ada user aktif dengan role ini
    const assignedUsers = await db
      .select({ id: Users.id })
      .from(Users)
      .where(eq(Users.role, roleId))
      .limit(1);

    if (assignedUsers.length > 0) {
      throw new Error(
        "Role ini masih digunakan oleh sejumlah pengguna. Pindahkan role pengguna terlebih dahulu sebelum menghapus."
      );
    }

    await db.delete(roles).where(eq(roles.id, roleId));
  }

  /**
   * Update matriks permission untuk suatu role secara massal
   */
  async updateRolePermissions(
    roleId: string,
    permissions: PermissionInput[]
  ): Promise<RoleWithPermissions> {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error("Role tidak ditemukan");
    }

    const role = existing[0];

    // Super Admin selalu memiliki akses penuh ke segala hal
    if (role.id === "super_admin") {
      throw new Error("Hak akses role Super Admin terkunci secara permanen dan tidak dapat diubah.");
    }

    for (const p of permissions) {
      const permRow = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.menuKey, p.menuKey)
          )
        )
        .limit(1);

      if (permRow.length > 0) {
        await db
          .update(rolePermissions)
          .set({
            canView: Boolean(p.canView),
            canAdd: Boolean(p.canAdd),
            canEdit: Boolean(p.canEdit),
            canDelete: Boolean(p.canDelete),
            updatedAt: new Date(),
          })
          .where(eq(rolePermissions.id, permRow[0].id));
      } else {
        await db.insert(rolePermissions).values({
          roleId,
          menuKey: p.menuKey,
          canView: Boolean(p.canView),
          canAdd: Boolean(p.canAdd),
          canEdit: Boolean(p.canEdit),
          canDelete: Boolean(p.canDelete),
        });
      }
    }

    const updated = await this.getRoleById(roleId);
    return updated!;
  }

  /**
   * Mengambil hak akses terperinci untuk role user saat ini (format object lookup cepat)
   */
  async getUserPermissions(
    userRole: string
  ): Promise<Record<string, { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }>> {
    await this.ensureSystemRoles();

    const isSuperAdmin = userRole === "super_admin";
    const result: Record<string, { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }> = {};

    if (isSuperAdmin) {
      for (const menu of SIDEBAR_MENUS) {
        result[menu.key] = {
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
        };
      }
      return result;
    }

    const perms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, userRole));

    const map = new Map(perms.map((p) => [p.menuKey, p]));

    for (const menu of SIDEBAR_MENUS) {
      const found = map.get(menu.key);
      result[menu.key] = {
        canView: found ? Boolean(found.canView) : false,
        canAdd: found ? Boolean(found.canAdd) : false,
        canEdit: found ? Boolean(found.canEdit) : false,
        canDelete: found ? Boolean(found.canDelete) : false,
      };
    }

    return result;
  }
}

export const roleService = new RoleService();
export default roleService;
