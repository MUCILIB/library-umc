import { beforeEach, describe, expect, it, vi } from "vitest";
import reservationService from "../service/reservation.service";
import { db } from "../../../db";

vi.mock("../../../db", () => ({
  db: {
    query: {
      bibliographies: { findFirst: vi.fn() },
      items: { findFirst: vi.fn(), findMany: vi.fn() },
      loans: { findMany: vi.fn() },
      reservations: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("../../../db/schema", () => ({
  reservations: Symbol("reservations"),
  items: Symbol("items"),
  bibliographies: Symbol("bibliographies"),
  loans: Symbol("loans"),
}));

const { sendReservationFulfilledMock } = vi.hoisted(() => ({
  sendReservationFulfilledMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../notification/service/notification.service", () => ({
  NotificationService: class {
    sendReservationFulfilledNotification = sendReservationFulfilledMock;
  },
}));

describe("ReservationService Unit Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getAllReservations", () => {
    it("melakukan rekonsiliasi stok & memetakan detail buku (penulis, penerbit, stok, call number)", async () => {
      // syncPendingReservationsWithAvailableStock finds no waiting bibs
      (db.query.reservations.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "res-12345678",
            memberId: "mem-1",
            bibliographyId: "bib-1",
            status: "waiting",
            createdAt: new Date("2026-11-26T00:00:00Z"),
            bibliography: {
              id: "bib-1",
              title: "Algoritma & Pemrograman",
              publishYear: 2024,
              isbn: "978-602-1234-56-7",
              callNumber: "005.1 ALG",
              type: "physical_book",
              publisher: { id: 1, name: "Informatika Bandung" },
              bibliographyAuthors: [{ author: { id: 10, name: "Rinaldi Munir" } }],
              items: [
                { id: "it-1", itemCode: "S-2024-10001-c1", status: "loaned" },
                { id: "it-2", itemCode: "S-2024-10001-c2", status: "maintenance" },
              ],
            },
            member: {
              id: "mem-1",
              nimNidn: "230511001",
              cardNumber: "UMCLIB-2026-001",
              faculty: "Fakultas Teknik",
              studyProgram: "Teknik Informatika",
              user: { name: "Ahmad" },
            },
          },
        ]);

      const result = await reservationService.getAllReservations({
        status: "waiting",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const bib = result.data[0].bibliography as any;
      expect(bib.author).toBe("Rinaldi Munir");
      expect(bib.publisher).toBe("Informatika Bandung");
      expect(bib.publicationYear).toBe(2024);
      expect(bib.isbnIssn).toBe("978-602-1234-56-7");
      expect(bib.callNumber).toBe("005.1 ALG");
      expect(bib.totalItems).toBe(2);
      expect(bib.availableItems).toBe(0);
    });
  });

  describe("fulfillNextReservation", () => {
    it("mengubah reservasi waiting menjadi pengajuan peminjaman (pending loan) saat stok tersedia", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValueOnce({
        id: "bib-1",
        title: "Clean Code",
        collectionType: { code: "S", canBeBorrowed: true },
      });
      (db.query.items.findMany as any).mockResolvedValueOnce([
        { id: "item-avail-1", itemCode: "S-2026-10001-c1", status: "available" },
      ]);
      // openLoans -> empty (item-avail-1 is free)
      (db.query.loans.findMany as any)
        .mockResolvedValueOnce([])
        // memberOpenLoans -> 0 active loans
        .mockResolvedValueOnce([]);
      (db.query.reservations.findMany as any).mockResolvedValueOnce([
        {
          id: "res-abc12345",
          memberId: "mem-1",
          bibliographyId: "bib-1",
          status: "waiting",
          member: { user: { name: "Budi", email: "budi@umc.ac.id" } },
          bibliography: { title: "Clean Code" },
        },
      ]);

      let updatedReservationStatus: string | undefined;
      let insertedLoan: any;

      (db.transaction as any).mockImplementationOnce(async (cb: any) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn((val: any) => {
              updatedReservationStatus = val.status;
              return {
                where: vi.fn().mockReturnValue({
                  returning: vi
                    .fn()
                    .mockResolvedValue([{ id: "res-abc12345", status: "fulfilled" }]),
                }),
              };
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn((val: any) => {
              insertedLoan = val;
              return Promise.resolve([{ id: "loan-new-1", ...val }]);
            }),
          }),
        };
        return cb(tx);
      });

      await reservationService.fulfillNextReservation("bib-1");

      expect(updatedReservationStatus).toBe("fulfilled");
      expect(insertedLoan).toMatchObject({
        memberId: "mem-1",
        itemId: "item-avail-1",
        status: "pending",
      });
      expect(insertedLoan.notes).toContain("#RES-RES-ABC1");
      expect(sendReservationFulfilledMock).toHaveBeenCalledWith(
        "budi@umc.ac.id",
        "Budi",
        "Clean Code",
      );
    });

    it("tidak membuat pengajuan pinjaman untuk koleksi Referensi (R)", async () => {
      (db.query.bibliographies.findFirst as any).mockResolvedValueOnce({
        id: "bib-ref",
        title: "Kamus Besar",
        collectionType: { code: "R", canBeBorrowed: false },
      });

      await reservationService.fulfillNextReservation("bib-ref");

      expect(db.query.items.findMany).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });
});
