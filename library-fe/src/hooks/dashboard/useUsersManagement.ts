import { useCallback, useEffect, useMemo, useState } from "react";
import {
  usersManagementService,
  type DashboardUser,
} from "@/services/dashboard/usersManagementService";

export function useUsersManagement(enabled: boolean) {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersManagementService.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat user");
      setUsers([]);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !hasLoaded && !loading) {
      void fetchUsers();
    }
  }, [enabled, hasLoaded, loading, fetchUsers]);

  const refetch = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "super_admin").length;
    const staffs = users.filter((u) => u.role === "staff").length;
    const banned = users.filter((u) => u.banned).length;
    return { total, admins, staffs, banned };
  }, [users]);

  return {
    users,
    loading,
    error,
    hasLoaded,
    stats,
    refetch,
  };
}
