import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNotificationReadState } from "../useNotificationReadState";
import type { DashboardBadgeCounts } from "@/services/dashboard/dashboardDataService";

const MOCK_BADGES: DashboardBadgeCounts = {
  loans: 3,
  returnApprovals: 2,
  cardApprovals: 1,
  recommendations: 0,
  repository: 4,
  fines: 1,
  total: 10,
};

describe("useNotificationReadState Hook", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("menghitung semua notifikasi aktif sebagai unread jika belum pernah di-mark read", () => {
    const { result } = renderHook(() => useNotificationReadState(MOCK_BADGES));

    expect(result.current.unreadCounts.loans).toBe(3);
    expect(result.current.unreadCounts.returnApprovals).toBe(2);
    expect(result.current.unreadCounts.cardApprovals).toBe(1);
    expect(result.current.unreadCounts.repository).toBe(4);
    expect(result.current.unreadCounts.fines).toBe(1);
    // Total unread = 3 + 2 + 1 + 0 + 4 + 1 = 11
    expect(result.current.totalUnread).toBe(11);
  });

  it("menghilangkan seluruh unread (totalUnread = 0) saat markAllAsRead dipanggil", () => {
    const { result } = renderHook(() => useNotificationReadState(MOCK_BADGES));

    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.totalUnread).toBe(0);
    expect(result.current.unreadCounts.loans).toBe(0);
    expect(result.current.unreadCounts.returnApprovals).toBe(0);
    expect(result.current.unreadCounts.cardApprovals).toBe(0);
    expect(result.current.unreadCounts.repository).toBe(0);
    expect(result.current.unreadCounts.fines).toBe(0);
  });

  it("menandai satu kategori spesifik sebagai sudah dibaca", () => {
    const { result } = renderHook(() => useNotificationReadState(MOCK_BADGES));

    act(() => {
      result.current.markCategoryAsRead("loans");
    });

    expect(result.current.unreadCounts.loans).toBe(0);
    expect(result.current.unreadCounts.returnApprovals).toBe(2);
    expect(result.current.totalUnread).toBe(8); // 11 - 3 = 8
  });

  it("menampilkan unread baru jika jumlah data di server bertambah melebihi snapshot", () => {
    const { result, rerender } = renderHook(
      ({ badges }) => useNotificationReadState(badges),
      { initialProps: { badges: MOCK_BADGES } }
    );

    // Tandai semua dibaca terlebih dahulu
    act(() => {
      result.current.markAllAsRead();
    });
    expect(result.current.totalUnread).toBe(0);

    // Server mendapatkan permohonan baru: loans naik dari 3 jadi 5 (+2 baru)
    const updatedBadges: DashboardBadgeCounts = {
      ...MOCK_BADGES,
      loans: 5,
    };

    rerender({ badges: updatedBadges });

    expect(result.current.unreadCounts.loans).toBe(2);
    expect(result.current.totalUnread).toBe(2);
  });
});
