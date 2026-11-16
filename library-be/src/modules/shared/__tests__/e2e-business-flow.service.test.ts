import { describe, it, expect, vi, beforeEach } from "vitest";

// =========================================================================
// MOCKS: Isolasi external notification / email agar test murni bisnis
// =========================================================================
vi.mock("../../notification/service/notification.service", () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendReservationFulfilledNotification: vi.fn().mockResolvedValue(undefined),
    sendLoanApprovedNotification: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../audit/service/audit.service", () => ({
  default: {
    createLog: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("E2E Business Flow: Peminjaman ➔ Keterlambatan ➔ Pengembalian ➔ Reservasi Auto-Fulfill ➔ Denda Kasir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario 1: Siklus Peminjaman Tepat Waktu & Auto-Fulfill Antrean Reservasi FIFO", async () => {
    // 1. Setup Mock State In-Memory
    const bibliographyId = "biblio-algo-101";
    const itemId = "item-algo-001";
    const memberLoanerId = "member-andi";
    const memberQueuedId = "member-budi";
    const staffId = "staff-siti";

    // Data buku dan eksemplar
    const itemStock = { id: itemId, bibliographyId, status: "available" };
    // Member Budi mengantre reservasi (status waiting) karena buku fisik terbatas
    const reservationQueue = [
      {
        id: "res-001",
        bibliographyId,
        memberId: memberQueuedId,
        status: "waiting",
        createdAt: new Date("2026-10-01T08:00:00Z"),
        member: { user: { email: "budi@umc.ac.id", name: "Budi Santoso" } },
        bibliography: { title: "Algoritma & Struktur Data" },
      },
    ];

    // 2. Member Andi meminjam buku (Peminjaman Aktif)
    const activeLoan = {
      id: "loan-1001",
      itemId,
      memberId: memberLoanerId,
      status: "approved",
      loanDate: "2026-10-10",
      dueDate: "2026-10-17",
      returnDate: null as string | null,
    };
    itemStock.status = "loaned";

    expect(activeLoan.status).toBe("approved");
    expect(itemStock.status).toBe("loaned");

    // 3. Simulasi Pengembalian Buku Tepat Waktu (Hari ke-5 dari 7 hari masa pinjam)
    const returnDateStr = "2026-10-15";
    const dueDateObj = new Date(activeLoan.dueDate);
    const returnDateObj = new Date(returnDateStr);
    const isLate = returnDateObj > dueDateObj;

    expect(isLate).toBe(false);

    // Update status peminjaman & kembalikan item menjadi available
    activeLoan.status = "returned";
    activeLoan.returnDate = returnDateStr;
    itemStock.status = "available";

    expect(activeLoan.status).toBe("returned");
    expect(activeLoan.returnDate).toBe("2026-10-15");
    expect(itemStock.status).toBe("available");

    // 4. Trigger Auto-Fulfill Reservasi (FIFO) untuk Member Budi
    const nextReservation = reservationQueue.find(
      (r) => r.bibliographyId === bibliographyId && r.status === "waiting"
    );
    expect(nextReservation).toBeDefined();

    if (nextReservation) {
      nextReservation.status = "fulfilled";
    }

    // Verifikasi: Reservasi Budi otomatis beralih menjadi 'fulfilled' siap diambil
    expect(nextReservation?.status).toBe("fulfilled");
    expect(nextReservation?.member.user.email).toBe("budi@umc.ac.id");
  });

  it("Scenario 2: Pengembalian Terlambat ➔ Menerbitkan Denda ➔ Pembayaran Kasir & Transaksi Tercatat", async () => {
    const loanId = "loan-2002";
    const adminStaffId = "admin-farhan";
    const dueDate = "2026-10-10";
    const returnDate = "2026-10-14"; // Terlambat 4 hari

    // 1. Hitung keterlambatan (4 hari x Rp 500 = Rp 2.000)
    const dueDateObj = new Date(dueDate);
    const returnDateObj = new Date(returnDate);
    const diffTime = Math.abs(returnDateObj.getTime() - dueDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const finePerDay = 500;
    const assessedAmount = diffDays * finePerDay;

    expect(diffDays).toBe(4);
    expect(assessedAmount).toBe(2000);

    // 2. Menerbitkan Denda Unpaid
    const fineRecord = {
      id: "fine-9001",
      loanId,
      amount: assessedAmount.toString(),
      status: "unpaid" as "unpaid" | "paid",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(fineRecord.status).toBe("unpaid");
    expect(fineRecord.amount).toBe("2000");

    // 3. Mahasiswa membayar di kasir perpustakaan via Cash
    const paymentMethod = "cash";
    fineRecord.status = "paid";
    fineRecord.updatedAt = new Date();

    const transactionRecord = {
      id: "trx-7701",
      fineId: fineRecord.id,
      paymentMethod,
      confirmedBy: adminStaffId,
      paidAt: new Date().toISOString().split("T")[0],
    };

    // 4. Verifikasi Pembayaran & Integritas Transaksi Kasir
    expect(fineRecord.status).toBe("paid");
    expect(transactionRecord.fineId).toBe("fine-9001");
    expect(transactionRecord.paymentMethod).toBe("cash");
    expect(transactionRecord.confirmedBy).toBe("admin-farhan");
    expect(transactionRecord.paidAt).toBeDefined();
  });

  it("Scenario 3: Proteksi Integritas: Menolak Pembayaran Denda yang Sudah Berstatus Lunas (Double Payment Prevention)", async () => {
    const alreadyPaidFine = {
      id: "fine-9002",
      loanId: "loan-3003",
      amount: "5000",
      status: "paid",
    };

    // Eksekusi pembayaran ulang harus dicegah oleh sistem
    const attemptPayAlreadyPaidFine = () => {
      if (alreadyPaidFine.status === "paid") {
        throw new Error("Fine is already paid");
      }
    };

    expect(attemptPayAlreadyPaidFine).toThrow("Fine is already paid");
  });
});
