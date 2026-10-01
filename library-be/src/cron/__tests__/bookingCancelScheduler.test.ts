import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================
// ARRANGE: MOCK SEMUA DEPENDENSI EKSTERNAL
// ============================================================

vi.mock("../../db", () => ({
  db: {
    query: {
      loans: {
        findMany: vi.fn(),
      },
    },
    transaction: vi.fn(),
  },
}));

vi.mock("../../db/schema", () => ({
  loans: Symbol("loans"),
  items: Symbol("items"),
}));

const { mockSendBookingCanceledNotification } = vi.hoisted(() => ({
  mockSendBookingCanceledNotification: vi.fn(),
}));

vi.mock("../../modules/notification/service/notification.service", () => ({
  NotificationService: class {
    sendBookingCanceledNotification = mockSendBookingCanceledNotification;
  },
}));

const { mockSyncCollectionAvailableStock } = vi.hoisted(() => ({
  mockSyncCollectionAvailableStock: vi.fn(),
}));

vi.mock("../../modules/shared/utils/stock-sync", () => ({
  syncCollectionAvailableStock: mockSyncCollectionAvailableStock,
}));

const { mockFulfillNextReservation } = vi.hoisted(() => ({
  mockFulfillNextReservation: vi.fn(),
}));

vi.mock("../../modules/reservation/service/reservation.service", () => ({
  default: {
    fulfillNextReservation: mockFulfillNextReservation,
  },
}));

import { db } from "../../db";
import { checkAndCancelExpiredBookings } from "../bookingCancelScheduler";

describe("bookingCancelScheduler Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengembalikan 0 jika tidak ada booking pending yang expired", async () => {
    (db.query.loans.findMany as any).mockResolvedValueOnce([]);

    const result = await checkAndCancelExpiredBookings();

    expect(result).toBe(0);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(mockSendBookingCanceledNotification).not.toHaveBeenCalled();
  });

  it("membatalkan loan expired, update item, sync stock, dan kirim email notifikasi", async () => {
    const expiredLoan = {
      id: "loan-exp-1",
      itemId: "item-1",
      status: "pending",
      member: {
        user: {
          email: "member@umc.ac.id",
          name: "Budi Santoso",
        },
      },
      item: {
        id: "item-1",
        bibliographyId: "bib-1",
        bibliography: {
          title: "Struktur Data & Algoritma",
        },
      },
    };

    (db.query.loans.findMany as any).mockResolvedValueOnce([expiredLoan]);

    // Mock db.transaction callback
    (db.transaction as any).mockImplementationOnce(async (cb: any) => {
      const tx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: "loan-exp-1" }]),
          }),
        }),
      };
      return cb(tx);
    });

    const result = await checkAndCancelExpiredBookings();

    expect(result).toBe(1);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(mockSyncCollectionAvailableStock).toHaveBeenCalledWith(
      expect.anything(),
      "bib-1"
    );
    expect(mockFulfillNextReservation).toHaveBeenCalledWith("bib-1");
    expect(mockSendBookingCanceledNotification).toHaveBeenCalledWith(
      "member@umc.ac.id",
      "Budi Santoso",
      "Struktur Data & Algoritma",
      expect.stringContaining("20 menit")
    );
  });
});
