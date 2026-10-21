import { useCallback, useEffect, useState } from "react";
import {
  dashboardDataService,
  type GuestLogItem,
} from "@/services/dashboard/dashboardDataService";
import { usersManagementService } from "@/services/dashboard/usersManagementService";

export function useGuestsData(enabled: boolean) {
  const [guests, setGuests] = useState<GuestLogItem[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch guests and members in parallel
      const [guestsData, membersData] = await Promise.all([
        dashboardDataService.getGuests(),
        usersManagementService.getMembers().catch((err) => {
          console.error("Failed to fetch members data:", err);
          return []; // Return empty array if members fetch fails
        })
      ]);
      setGuests(guestsData);
      setMembers(membersData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data pengunjung",
      );
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !hasLoaded && !loading) {
      void fetchData();
    }
  }, [enabled, hasLoaded, loading, fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    guests,
    members,
    loading,
    error,
    hasLoaded,
    refetch,
  };
}
