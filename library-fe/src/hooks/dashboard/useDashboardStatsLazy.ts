import { useCallback, useEffect, useState } from "react";
import {
  dashboardDataService,
  type DashboardStats
} from "@/services/dashboard/dashboardDataService";

const DEFAULT_STATS: DashboardStats = {
  totalBibliographies: 0,
  totalItems: 0,
  totalCategories: 0,
  totalGuests: 0,
  webVisits: 0,
  combinedVisits: 0,
  activeBorrowings: 0,
  outstandingFines: 0,
  totalFineRevenue: 0
};

export function useDashboardStatsLazy(enabled: boolean) {
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardDataService.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat statistik");
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && !hasLoaded && !loading) {
      void fetchStats();
    }
  }, [enabled, hasLoaded, loading, fetchStats]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    hasLoaded,
    refetch
  };
}
