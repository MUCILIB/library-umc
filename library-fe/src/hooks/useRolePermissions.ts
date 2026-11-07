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

export function useRolePermissions() {
  const { data: session } = authClient.useSession();
  const [permissions, setPermissions] = useState<Record<string, MenuPermission>>({});
  const [loading, setLoading] = useState(true);

  const userRole = (session?.user as { role?: string } | undefined)?.role || "student";
  const isSuperAdmin = userRole === "super_admin";

  useEffect(() => {
    let isMounted = true;

    async function fetchPermissions() {
      if (!session) {
        setLoading(false);
        return;
      }

      if (isSuperAdmin) {
        setLoading(false);
        return;
      }

      try {
        const res = await roleApi.getMyPermissions();
        if (isMounted && res.data?.permissions) {
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
  }, [session, isSuperAdmin, userRole]);

  const can = (menuKey: string, action: PermissionAction = "canView"): boolean => {
    if (isSuperAdmin) return true;
    const menuPerm = permissions[menuKey];
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
