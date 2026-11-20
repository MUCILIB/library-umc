import { db } from "../../../db";
import { roles, rolePermissions, Users } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import auditService from "../../audit/service/audit.service";
import { rolePermissionsSchema } from "../role.validation";
import type { AuditContext } from "../../audit/audit.types";
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

          const isPublicViewMenu = ["bibliographies", "ebooks", "repository"].includes(menu.key);
          const isMemberRole = ["student", "external", "lecturer", "dosen", "mahasiswa"].includes(sysRole.id);
          const isLecturerRole = ["lecturer", "dosen"].includes(sysRole.id);
          const isLecturerAllowedAdd = ["recommendations"].includes(menu.key);

          const canView =
            isSuperAdmin ||
            (isStaff && isStaffAllowedMenu) ||
            (isMemberRole && isPublicViewMenu) ||
            (isLecturerRole && menu.key === "recommendations");

          await db.insert(rolePermissions).values({
            roleId: sysRole.id,
            menuKey: menu.key,
            canView,
            canAdd: isSuperAdmin || (isStaff && isStaffAllowedMenu && !["reports"].includes(menu.key)) || (isLecturerRole && isLecturerAllowedAdd),
            canEdit: isSuperAdmin || (isStaff && isStaffAllowedMenu && !["reports", "importData", "exportData"].includes(menu.key)),
            canDelete: isSuperAdmin || (isStaff && ["items", "ebooks"].includes(menu.key)),
          });
        }
      }
    }

    // Pastikan hak akses melihat katalog koleksi buku & repositori aktif untuk seluruh member/external/student
    const memberRoles = ["student", "external", "lecturer"];
    for (const roleId of memberRoles) {
      // Pastikan roleId benar-benar ada di tabel roles agar tidak melanggar foreign key constraint
      const roleExists = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);

      if (roleExists.length === 0) continue;

      for (const menuKey of ["bibliographies", "ebooks", "repository"]) {
        try {
          const perm = await db
            .select()
            .from(rolePermissions)
            .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.menuKey, menuKey)))
            .limit(1);

          if (perm.length > 0) {
            if (!perm[0].canView) {
              await db
                .update(rolePermissions)
                .set({ canView: true, updatedAt: new Date() })
                .where(eq(rolePermissions.id, perm[0].id));
            }
          } else {
            await db.insert(rolePermissions).values({
              roleId,
              menuKey,
              canView: true,
              canAdd: false,
              canEdit: false,
              canDelete: false,
            });
          }
        } catch (innerErr) {
          console.warn(`[RoleService] ensureSystemRoles warning for ${roleId}:${menuKey}:`, innerErr);
        }
      }
    }
  }

  /**
   * Mengambil semua role beserta rekapitulasi permission
   */
  async getAllRoles(): Promise<any[]> {
    try {
      await this.ensureSystemRoles();
    } catch (err) {
      console.warn("[RoleService] Warning during ensureSystemRoles in getAllRoles:", err);
    }

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
    try {
      await this.ensureSystemRoles();
    } catch (err) {
      console.warn("[RoleService] Warning during ensureSystemRoles in getRoleById:", err);
    }

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
  }, context: AuditContext): Promise<RoleWithPermissions> {
    return db.transaction(async (tx) => {
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
    const existing = await tx
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Role dengan id/nama '${trimmedName}' sudah terdaftar`);
    }

    const [created] = await tx
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
      await tx.insert(rolePermissions).values({
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

    if (context) {
      const [actor] = await tx.select().from(Users).where(eq(Users.id, context.actorId)).limit(1);
      if (!actor) throw new Error("Audit actor not found");
      await auditService.recordEvent(tx, {
        eventType: "role.created", action: "create", entity: "role", entityId: created.id,
        outcome: "success", actorSnapshot: { id: actor.id, name: actor.name.slice(0, 255), role: actor.role || "unknown" },
        targetSnapshot: { id: created.id, type: "role", label: created.name.slice(0, 255) },
        changes: { name: { before: null, after: created.name } }, metadata: { schemaVersion: 1 },
        ipAddress: context.ipAddress, userAgent: context.userAgent,
      });
    }
    return {
      ...created,
      permissions,
    };
    });
  }

  /**
   * Memperbarui informasi nama dan deskripsi role
   */
  async updateRole(
    roleId: string,
    data: { name?: string; description?: string | null },
    context: AuditContext
  ): Promise<any> {
    return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1).for("update");

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

    const changes: Record<string, { before: string | null; after: string | null }> = {};
    for (const key of ["name", "description"] as const) {
      const after = updatePayload[key];
      if (after !== undefined && after !== currentRole[key]) {
        changes[key] = { before: currentRole[key], after };
      }
    }
    if (!Object.keys(changes).length) return currentRole;
    const [updated] = await tx
      .update(roles)
      .set(updatePayload)
      .where(eq(roles.id, roleId))
      .returning();
    if (context) {
      const [actor] = await tx.select().from(Users).where(eq(Users.id, context.actorId)).limit(1);
      if (!actor) throw new Error("Audit actor not found");
      await auditService.recordEvent(tx, {
        eventType: "role.updated", action: "update", entity: "role", entityId: roleId,
        outcome: "success", actorSnapshot: { id: actor.id, name: actor.name.slice(0, 255), role: actor.role || "unknown" },
        targetSnapshot: { id: roleId, type: "role", label: updated.name.slice(0, 255) },
        changes, metadata: { schemaVersion: 1 },
        ipAddress: context.ipAddress, userAgent: context.userAgent,
      });
    }
    return updated;
    });
  }

  /**
   * Menghapus custom role
   */
  async deleteRole(roleId: string, context: AuditContext): Promise<void> {
    return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1).for("update");

    if (existing.length === 0) {
      throw new Error("Role tidak ditemukan");
    }

    if (existing[0].isSystem || (SYSTEM_ROLE_IDS as readonly string[]).includes(roleId)) {
      throw new Error("Role sistem bawaan tidak dapat dihapus");
    }

    // Cek apakah ada user aktif dengan role ini
    const assignedUsers = await tx
      .select({ id: Users.id })
      .from(Users)
      .where(eq(Users.role, roleId))
      .limit(1);

    if (assignedUsers.length > 0) {
      throw new Error(
        "Role ini masih digunakan oleh sejumlah pengguna. Pindahkan role pengguna terlebih dahulu sebelum menghapus."
      );
    }

    await tx.delete(roles).where(eq(roles.id, roleId));
    if (context) {
      const [actor] = await tx.select().from(Users).where(eq(Users.id, context.actorId)).limit(1);
      if (!actor) throw new Error("Audit actor not found");
      await auditService.recordEvent(tx, {
        eventType: "role.deleted", action: "delete", entity: "role", entityId: roleId,
        outcome: "success", actorSnapshot: { id: actor.id, name: actor.name.slice(0, 255), role: actor.role || "unknown" },
        targetSnapshot: { id: roleId, type: "role", label: existing[0].name.slice(0, 255) },
        changes: { name: { before: existing[0].name, after: null }, description: { before: existing[0].description, after: null } },
        metadata: { schemaVersion: 1 }, ipAddress: context.ipAddress, userAgent: context.userAgent,
      });
    }
    });
  }

  /**
   * Update matriks permission untuk suatu role secara massal
   */
  async updateRolePermissions(
    roleId: string,
    permissions: PermissionInput[],
    context: AuditContext
  ): Promise<RoleWithPermissions> {
    const validated = rolePermissionsSchema.parse(permissions);
    return db.transaction(async (tx) => {
      const [role] = await tx.select().from(roles).where(eq(roles.id, roleId)).for("update");
      if (!role) throw new Error("Role tidak ditemukan");
      if (role.id === "super_admin") {
        throw new Error("Hak akses role Super Admin terkunci secara permanen dan tidak dapat diubah.");
      }
      const current = await tx.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      const changes: Record<string, { before: boolean; after: boolean }> = {};
      const flags = ["canView", "canAdd", "canEdit", "canDelete"] as const;
      for (const permission of validated) {
        const before = current.find(row => row.menuKey === permission.menuKey);
        let changed = false;
        for (const flag of flags) {
          const previous = before?.[flag] ?? false;
          if (previous !== permission[flag]) {
            changes[`permissions.${permission.menuKey}.${flag}`] = { before: previous, after: permission[flag] };
            changed = true;
          }
        }
        if (!changed) continue;
        if (before) {
          await tx.update(rolePermissions).set({ ...permission, updatedAt: new Date() }).where(eq(rolePermissions.id, before.id));
        } else {
          await tx.insert(rolePermissions).values({ ...permission, roleId });
        }
      }
      if (Object.keys(changes).length && context) {
        const [actor] = await tx.select().from(Users).where(eq(Users.id, context.actorId)).limit(1);
        if (!actor) throw new Error("Audit actor not found");
        await auditService.recordEvent(tx, {
          eventType: "role.permissions_updated", action: "update", entity: "role", entityId: roleId,
          outcome: "success", actorSnapshot: { id: actor.id, name: actor.name.slice(0, 255), role: actor.role || "unknown" },
          targetSnapshot: { id: roleId, type: "role", label: role.name.slice(0, 255) },
          changes, metadata: { schemaVersion: 1 }, ipAddress: context.ipAddress, userAgent: context.userAgent,
        });
      }
      const rows = await tx.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      return { ...role, permissions: SIDEBAR_MENUS.map(menu => {
        const found = rows.find(row => row.menuKey === menu.key);
        return { menuKey: menu.key, canView: found?.canView ?? false, canAdd: found?.canAdd ?? false,
          canEdit: found?.canEdit ?? false, canDelete: found?.canDelete ?? false };
      }) };
    });
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
      const isPublicViewMenu = ["bibliographies", "ebooks", "repository"].includes(menu.key);
      const isMemberRole = ["student", "external", "lecturer", "dosen", "mahasiswa"].includes(userRole);

      result[menu.key] = {
        canView: (found ? Boolean(found.canView) : false) || (isMemberRole && isPublicViewMenu),
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
