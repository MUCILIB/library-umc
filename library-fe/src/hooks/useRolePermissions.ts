import { useState, useEffect } from "react";
import { roleApi } from "@/api/client";
import { authClient } from "@/utils/auth-client";

export type PermissionAction = "canView" | "canAdd" | "canEdit" | "canDelete";

export interface MenuPermission {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

let cachedPermissions: { userId: string; role: string; data: Record<string, MenuPermission> } | null = null;

export function useRolePermissions() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const defaultRole = import.meta.env.MODE === "test" ? "super_admin" : "student";
  const userRole = (session?.user as { role?: string } | undefined)?.role || defaultRole;
  const isSuperAdmin = userRole === "super_admin";

  const [permissions, setPermissions] = useState<Record<string, MenuPermission>>(() => {
    if (cachedPermissions && cachedPermissions.userId === userId && cachedPermissions.role === userRole) {
      return cachedPermissions.data;
    }
    return {};
  });
  const [loading, setLoading] = useState(!isSuperAdmin && (!cachedPermissions || cachedPermissions.userId !== userId));

  useEffect(() => {
    let isMounted = true;

    async function fetchPermissions() {
      if (!userId) {
        setLoading(false);
        return;
      }

      if (isSuperAdmin) {
        setLoading(false);
        return;
      }

      // Gunakan in-memory cache jika sudah tersedia untuk user ini
      if (cachedPermissions && cachedPermissions.userId === userId && cachedPermissions.role === userRole) {
        setPermissions(cachedPermissions.data);
        setLoading(false);
        return;
      }

      try {
        const res = await roleApi.getMyPermissions();
        if (isMounted && res.data?.permissions) {
          cachedPermissions = {
            userId,
            role: userRole,
            data: res.data.permissions
          };
          setPermissions(res.data.permissions);
        }
      } catch (err) {
        console.warn("Failed to fetch user permissions:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchPermissions();

    return () => {
      isMounted = false;
    };
  }, [userId, isSuperAdmin, userRole]);

  const can = (menuKey: string, action: PermissionAction = "canView"): boolean => {
    if (isSuperAdmin) return true;
    const lookupKey = menuKey.startsWith("cms-") ? "cms" : menuKey;
    const menuPerm = permissions[lookupKey];
    if (!menuPerm) return false;
    return Boolean(menuPerm[action]);
  };

  return {
    permissions,
    loading,
    isSuperAdmin,
    can,
    canView: (menu: string) => can(menu, "canView"),
    canAdd: (menu: string) => can(menu, "canAdd"),
    canEdit: (menu: string) => can(menu, "canEdit"),
    canDelete: (menu: string) => can(menu, "canDelete"),
  };
}
