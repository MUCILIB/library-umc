import { useState, useEffect, useCallback } from "react";
import {
  dashboardDataService,
  type DashboardBadgeCounts
} from "@/services/dashboard/dashboardDataService";

export const BADGE_REFRESH_EVENT = "umc-badge-refresh";

/**
 * Dispatch an event to immediately re-check and refresh badge counts across dashboard components
 */
export function triggerBadgeRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BADGE_REFRESH_EVENT));
  }
}

const DEFAULT_BADGES: DashboardBadgeCounts = {
  loans: 0,
  returnApprovals: 0,
  cardApprovals: 0,
  recommendations: 0,
  repository: 0,
  total: 0
};

export function useDashboardBadges(enabled: boolean = true) {
  const [badges, setBadges] = useState<DashboardBadgeCounts>(DEFAULT_BADGES);
  const [loading, setLoading] = useState(false);

  const fetchBadges = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await dashboardDataService.getBadgeCounts();
      setBadges((prev) => {
        const isIdentical =
          prev.borrowApprovals === data.borrowApprovals &&
          prev.returnApprovals === data.returnApprovals &&
          prev.cardApprovals === data.cardApprovals &&
          prev.recommendations === data.recommendations &&
          prev.repository === data.repository &&
          prev.total === data.total;
        return isIdentical ? prev : data;
      });
    } catch {
      // keep current or default badges
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    setLoading(true);
    void fetchBadges();

    // Listen to custom refresh events (triggered after actions like approve/reject)
    const handleRefresh = () => {
      void fetchBadges();
    };

    window.addEventListener(BADGE_REFRESH_EVENT, handleRefresh);

    // Refresh when tab gains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchBadges();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic poll every 30 seconds while page is active (dari sebelumnya 5 detik)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchBadges();
      }
    }, 30000);

    return () => {
      window.removeEventListener(BADGE_REFRESH_EVENT, handleRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [enabled, fetchBadges]);

  return {
    badges,
    loading,
    refetch: fetchBadges
  };
}
