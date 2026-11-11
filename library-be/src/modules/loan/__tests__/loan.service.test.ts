import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoanService } from "../service/loan.service";
import { db } from "../../../db";
import reservationService from "../../reservation/service/reservation.service";

vi.mock("../../../db", () => ({
  db: {
    query: {
      loans: { findFirst: vi.fn(), findMany: vi.fn() },
      items: { findFirst: vi.fn() },
      members: { findFirst: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("../../../db/schema", () => ({
  loans: Symbol("loans"),
  items: Symbol("items"),
  members: Symbol("members"),
  fines: Symbol("fines"),
  bibliographies: Symbol("bibliographies"),
  reservations: Symbol("reservations"),
  returnRequests: Symbol("returnRequests"),
  Users: Symbol("Users"),
}));

vi.mock("../../notification/service/notification.service", () => ({
  NotificationService: class {
    sendLoansNotification = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock("../../reservation/service/reservation.service", () => ({
  default: {
    fulfillNextReservation: vi.fn().mockResolvedValue(undefined),
  },
}));

function mockSelectCounts(counts: number[]) {
  counts.forEach((count) => {
    (db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count }]),
      }),
    });
  });
}

function createTxForStockSync(availableCount = 0) {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    select: vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            for: vi.fn().mockResolvedValue([{ id: "bib-1" }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: availableCount }]),
        }),
      }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{}]),
    }),
    query: {
      loans: { findFirst: vi.fn() },
      items: { findFirst: vi.fn() },
      returnRequests: { findFirst: vi.fn() },
    },
  };
}

describe("LoanService Unit Tests", () => {
  let loanService: LoanService;

  beforeEach(() => {
    vi.resetAllMocks();
    loanService = new LoanService();
  });

  describe("requestLoan", () => {
    it("throw jika member sudah mencapai 3 pinjaman aktif", async () => {
      mockSelectCounts([3]);

      await expect(
        loanService.requestLoan("member-1", "collection-1"),
      ).rejects.toThrowError("batas maksimal peminjaman");
    });

    it("throw jika buku tidak tersedia", async () => {
      mockSelectCounts([0, 0, 1]);
      (db.query.items.findFirst as any).mockResolvedValueOnce(null);

      await expect(
        loanService.requestLoan("member-1", "collection-1"),
      ).rejects.toThrowError("Buku ini sedang tidak tersedia untuk dipinjam");
    });

    it("sukses membuat loan pending dan qrCodeUrl", async () => {
      mockSelectCounts([0, 0, 1]);
      (db.query.items.findFirst as any).mockResolvedValue({
        id: "item-1",
        status: "available",
      });
      (db.insert as any).mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "loan-1",
              memberId: "member-1",
              itemId: "item-1",
              status: "pending",
              verificationToken: "token-1",
            },
          ]),
        }),
      });

      const result = await loanService.requestLoan("member-1", "collection-1");

      expect(result.status).toBe("pending");
      expect(result.qrCodeUrl).toContain("data:image");
    });
  });

  describe("approveLoan", () => {
    it("throw jika loan tidak ditemukan", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(0);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce(null);
        return cb(tx);
      });

      await expect(
        loanService.approveLoan("loan-x", "admin-1"),
      ).rejects.toThrowError("Data peminjaman tidak ditemukan");
    });

    it("sukses approve loan", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(2);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce({
          id: "loan-1",
          itemId: "item-1",
          dueDate: "2026-04-10",
          member: { user: { email: "user@example.com", name: "User" } },
          item: {
            bibliography: { title: "Buku A", bibliographyId: "bib-1" },
          },
        });
        tx.update = vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi
                .fn()
                .mockResolvedValue([{ id: "loan-1", itemId: "item-1" }]),
            }),
          }),
        });
        return cb(tx);
      });

      const result = await loanService.approveLoan("loan-1", "admin-1");
      expect(result.message).toContain("berhasil disetujui");
    });
  });

  describe("returnLoan", () => {
    it("sukses return tepat waktu tanpa denda", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      let insertCalled = false;
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(3);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce({
          id: "loan-1",
          itemId: "item-1",
          status: "approved",
          dueDate: tomorrow.toISOString().split("T")[0],
        });
        tx.query.items.findFirst = vi.fn().mockResolvedValueOnce({
          id: "item-1",
          bibliographyId: "bib-1",
        });
        tx.insert = vi.fn().mockImplementation(() => {
          insertCalled = true;
          return { values: vi.fn().mockResolvedValue([{}]) };
        });
        return cb(tx);
      });

      const result = await loanService.returnLoan("loan-1", "admin-1");
      expect(result.message).toContain("tepat waktu");
      expect(insertCalled).toBe(false);
    });

    it("sukses return terlambat dan membuat denda", async () => {
      // Menggunakan selisih tepat 5 hari berdasarkan batas UTC/lokal
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000);

      let insertedFine: any = null;
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(3);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce({
          id: "loan-1",
          itemId: "item-1",
          status: "approved",
          dueDate: `${fiveDaysAgo.getFullYear()}-${String(fiveDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(fiveDaysAgo.getDate()).padStart(2, "0")}`,
        });
        tx.query.items.findFirst = vi.fn().mockResolvedValueOnce({
          id: "item-1",
          bibliographyId: "bib-1",
        });
        tx.insert = vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((data: any) => {
            if (data.amount) {
              insertedFine = data;
            }
            return Promise.resolve([{ id: "fine-1", ...data }]);
          }),
        }));
        return cb(tx);
      });

      const result = await loanService.returnLoan("loan-1", "admin-1");
      expect(result.message).toContain("terlambat");
      expect(insertedFine.amount).toBe("2500");
      expect(insertedFine.status).toBe("paid");
      expect(reservationService.fulfillNextReservation).toHaveBeenCalledWith(
        "bib-1",
      );
    });

    it("sukses mengembalikan buku dengan metadata verifikasi (nama petugas, ttd, berita acara)", async () => {
      let updatedLoanData: any = null;
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(0);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce({
          id: "loan-1",
          itemId: "item-1",
          status: "approved",
          dueDate: new Date().toISOString().split("T")[0],
        });
        tx.query.items.findFirst = vi.fn().mockResolvedValueOnce({
          id: "item-1",
          bibliographyId: "bib-1",
        });
        tx.update = vi.fn().mockImplementation(() => ({
          set: vi.fn().mockImplementation((data: any) => {
            if (data.returnReceiptNo) {
              updatedLoanData = data;
            }
            return {
              where: vi.fn().mockResolvedValue([{}]),
            };
          }),
        }));
        return cb(tx);
      });

      const result = await loanService.returnLoan("loan-1", "admin-1", {
        condition: "good",
        staffName: "Roni",
        signature: "data:image/png;base64,sampleSignature",
      });

      expect(result.success).toBe(true);
      expect(updatedLoanData).not.toBeNull();
      expect(updatedLoanData.returnStaffName).toBe("Roni");
      expect(updatedLoanData.returnCondition).toBe("good");
      expect(updatedLoanData.returnReceiptNo).toMatch(/^BA-RET-/);
      expect(updatedLoanData.returnStaffSignature).toBe("data:image/png;base64,sampleSignature");
    });
  });

  describe("cancelLoan", () => {
    it("throw jika loan tidak ditemukan", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(0);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce(null);
        return cb(tx);
      });

      await expect(
        loanService.cancelLoan("loan-x", "member-1")
      ).rejects.toThrowError("Peminjaman tidak ditemukan");
    });

    it("throw jika member bukan pemilik loan dan bukan admin", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(0);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce({
          id: "loan-1",
          memberId: "member-other",
          status: "pending",
        });
        return cb(tx);
      });

      await expect(
        loanService.cancelLoan("loan-1", "member-1")
      ).rejects.toThrowError("Akses ditolak");
    });

    it("throw jika status bukan pending", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(0);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce({
          id: "loan-1",
          memberId: "member-1",
          status: "approved",
        });
        return cb(tx);
      });

      await expect(
        loanService.cancelLoan("loan-1", "member-1")
      ).rejects.toThrowError("status pending");
    });

    it("sukses membatalkan loan pending oleh member", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = createTxForStockSync(1);
        tx.query.loans.findFirst = vi.fn().mockResolvedValueOnce({
          id: "loan-1",
          memberId: "member-1",
          itemId: "item-1",
          status: "pending",
          member: { user: { email: "member@umc.ac.id", name: "Member" } },
          item: { bibliographyId: "bib-1", bibliography: { title: "Buku A" } },
        });
        tx.update = vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "loan-1", status: "rejected" }]),
            }),
          }),
        });
        return cb(tx);
      });

      const result = await loanService.cancelLoan("loan-1", "member-1");
      expect(result.status).toBe("rejected");
    });
  });

  describe("approveReturnRequest", () => {
    it("throw jika adminId bukan ber-role super_admin", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = {
          query: {
            Users: { findFirst: vi.fn().mockResolvedValueOnce({ id: "staff-1", role: "staff" }) },
          },
        };
        return cb(tx);
      });

      await expect(
        loanService.approveReturnRequest("req-1", "staff-1")
      ).rejects.toThrowError("Pengembalian buku harus disetujui oleh Super Admin");
    });

    it("sukses menyetujui secara idempoten jika buku sudah berstatus returned", async () => {
      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = {
          query: {
            Users: { findFirst: vi.fn().mockResolvedValueOnce({ id: "admin-1", role: "super_admin" }) },
            returnRequests: { findFirst: vi.fn().mockResolvedValueOnce({ id: "req-1", loanId: "loan-1", status: "pending" }) },
            loans: { findFirst: vi.fn().mockResolvedValueOnce({ id: "loan-1", status: "returned" }) },
          },
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{}]),
            }),
          }),
        };
        return cb(tx);
      });

      const res = await loanService.approveReturnRequest("req-1", "admin-1");
      expect(res.success).toBe(true);
      expect(res.message).toContain("telah tercatat dikembalikan sebelumnya");
    });
  });

  describe("generateReturnReceiptPdf", () => {
    it("harus mencetak nomor kartu member yang benar dan bukan '-'", async () => {
      const mockLoan = {
        id: "loan-pdf-1",
        loanDate: "2026-11-01",
        dueDate: "2026-11-08",
        returnDate: "2026-11-05",
        returnReceiptNo: "BA-RET-20261105-001",
        returnCondition: "good",
        member: {
          id: "member-1",
          cardNumber: "UMCLIB-2026-0008",
          nimNidn: "22010199",
          user: { name: "Ahmad Fauzi" }
        },
        item: {
          inventoryCode: "INV-001",
          itemCode: "ITEM-001",
          bibliography: { title: "Pemrograman Web Modern" }
        }
      };

      vi.spyOn(loanService, "getLoanById").mockResolvedValueOnce(mockLoan as any);

      const chunks: Buffer[] = [];
      const dummyRes = {
        write: (chunk: any) => chunks.push(Buffer.from(chunk)),
        end: (chunk?: any) => {
          if (chunk) chunks.push(Buffer.from(chunk));
        },
        on: vi.fn(),
        once: vi.fn(),
        emit: vi.fn(),
      } as any;

      await new Promise<void>((resolve, reject) => {
        dummyRes.on = (event: string, cb: any) => {
          if (event === "finish") dummyRes.finishCb = cb;
          return dummyRes;
        };
        dummyRes.end = (chunk?: any) => {
          if (chunk) chunks.push(Buffer.from(chunk));
          if (dummyRes.finishCb) dummyRes.finishCb();
          resolve();
        };
        loanService.generateReturnReceiptPdf("loan-pdf-1", dummyRes).catch(reject);
      });
      const zlib = await import("zlib");
      const rawBuffer = Buffer.concat(chunks);
      // Decode Flate stream jika ada kompresi zlib
      const streamStart = rawBuffer.indexOf(Buffer.from("stream\n")) + 7;
      const streamEnd = rawBuffer.indexOf(Buffer.from("\nendstream"));
      let decoded = "";
      if (streamStart > 6 && streamEnd > streamStart) {
        try {
          decoded = zlib.inflateSync(rawBuffer.subarray(streamStart, streamEnd)).toString();
        } catch {
          decoded = rawBuffer.toString();
        }
      } else {
        decoded = rawBuffer.toString();
      }

      const hexExpected = Buffer.from("UMCLIB-2026-0008").toString("hex");
      expect(decoded).toContain(hexExpected);
      expect(decoded).not.toContain("[<3a> 50 <202d> 0]");
    });
  });
});
