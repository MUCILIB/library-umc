import { useState, useEffect, useCallback, useMemo } from "react";
import type { DashboardBadgeCounts } from "@/services/dashboard/dashboardDataService";

export const NOTIFICATION_STORAGE_KEY = "mucilib_read_notifications_snapshot";

export interface NotificationCategoryConfig {
  key: keyof DashboardBadgeCounts;
  menuKey: string;
  label: string;
  description: (count: number) => string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategoryConfig[] = [
  {
    key: "loans",
    menuKey: "loans",
    label: "Permohonan Peminjaman",
    description: (count) => `${count} permohonan peminjaman perlu ditinjau`,
  },
  {
    key: "returnApprovals",
    menuKey: "returnApprovals",
    label: "Konfirmasi Pengembalian",
    description: (count) => `${count} berita acara pengembalian menunggu validasi`,
  },
  {
    key: "cardApprovals",
    menuKey: "cardApprovals",
    label: "Persetujuan Kartu Anggota",
    description: (count) => `${count} pengajuan aktivasi atau perpanjangan kartu`,
  },
  {
    key: "repository",
    menuKey: "repository",
    label: "Repositori Skripsi",
    description: (count) => `${count} karya ilmiah atau tugas akhir menunggu verifikasi`,
  },
  {
    key: "recommendations",
    menuKey: "recommendations",
    label: "Usulan Pengadaan Buku",
    description: (count) => `${count} usulan buku baru dari pemustaka`,
  },
  {
    key: "fines",
    menuKey: "fines",
    label: "Denda Belum Diselesaikan",
    description: (count) => `${count} catatan denda keterlambatan belum lunas`,
  },
];

export function useNotificationReadState(badges: DashboardBadgeCounts) {
  const [readSnapshot, setReadSnapshot] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of NOTIFICATION_CATEGORIES) {
      const current = Number(badges[cat.key] || 0);
      const read = Number(readSnapshot[cat.key] || 0);
      counts[cat.key] = Math.max(0, current - read);
    }
    return counts;
  }, [badges, readSnapshot]);

  const totalUnread = useMemo(() => {
    return Object.values(unreadCounts).reduce((acc, val) => acc + val, 0);
  }, [unreadCounts]);

  const markAllAsRead = useCallback(() => {
    const newSnapshot: Record<string, number> = {};
    for (const cat of NOTIFICATION_CATEGORIES) {
      newSnapshot[cat.key] = Number(badges[cat.key] || 0);
    }
    setReadSnapshot(newSnapshot);
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newSnapshot));
    } catch {
      // ignore storage quota error
    }
  }, [badges]);

  const markCategoryAsRead = useCallback(
    (categoryKey: string) => {
      setReadSnapshot((prev) => {
        const current = Number(badges[categoryKey] || 0);
        const next = { ...prev, [categoryKey]: current };
        try {
          localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore storage error
        }
        return next;
      });
    },
    [badges]
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === NOTIFICATION_STORAGE_KEY && e.newValue) {
        try {
          setReadSnapshot(JSON.parse(e.newValue));
        } catch {
          // ignore malformed json
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    unreadCounts,
    totalUnread,
    markAllAsRead,
    markCategoryAsRead,
  };
}
