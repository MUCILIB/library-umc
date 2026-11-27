import crypto from "crypto";
import { db } from "../../../db";
import { eq, and, isNull, desc, asc, sql, inArray } from "drizzle-orm";
import { reservations, items, bibliographies, loans } from "../../../db/schema";
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from "../../../exceptions/AppError";
import { NotificationService } from "../../notification/service/notification.service";

const notificationService = new NotificationService();

class ReservationService {
  /**
   * 1. Member buat reservasi buku
   * Validasi urut:
   *   1. Cek koleksi ada
   *   2. Cek masih ada item AVAILABLE — jika ada, tolak (suruh pinjam langsung)
   *   3. Cek member belum punya reservasi waiting untuk koleksi yang sama
   */
  async createReservation(memberId: string, bibliographyId: string) {
    try {
      const bib = await db.query.bibliographies.findFirst({
        where: eq(bibliographies.id, bibliographyId),
      });
      if (!bib) {
        throw new NotFoundError("Bibliografi tidak ditemukan.");
      }

      const availableItem = await db.query.items.findFirst({
        where: and(
          eq(items.bibliographyId, bibliographyId),
          eq(items.status, "available"),
          isNull(items.deletedAt),
        ),
      });
      if (availableItem) {
        throw new BadRequestError(
          "Masih ada eksemplar yang tersedia, silakan pinjam langsung.",
        );
      }

      const existingReservation = await db.query.reservations.findFirst({
        where: and(
          eq(reservations.memberId, memberId),
          eq(reservations.bibliographyId, bibliographyId),
          eq(reservations.status, "waiting"),
          isNull(reservations.deletedAt),
        ),
      });
      if (existingReservation) {
        throw new BadRequestError(
          "Anda sudah memiliki reservasi aktif untuk buku ini.",
        );
      }

      // Check total reservasi aktif — max 3
      const activeCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(
          and(
            eq(reservations.memberId, memberId),
            eq(reservations.status, "waiting"),
            isNull(reservations.deletedAt),
          ),
        );
      if (Number(activeCount[0].count) >= 3) {
        throw new BadRequestError(
          "Anda sudah mencapai batas maksimal reservasi (3 buku).",
        );
      }

      const [reservation] = await db
        .insert(reservations)
        .values({ memberId, bibliographyId, status: "waiting" })
        .returning();

      return {
        success: true,
        message: "Reservasi berhasil dibuat.",
        data: reservation,
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      console.error("ReservationService.createReservation Error:", error);
      throw new InternalServerError("Gagal membuat reservasi.");
    }
  }

  private mapReservationBibliography<T extends { bibliography?: any }>(res: T): T {
    if (res.bibliography) {
      const bib = res.bibliography;
      const authorNames = Array.isArray(bib.bibliographyAuthors)
        ? bib.bibliographyAuthors
            .map((ba: any) => ba.author?.name)
            .filter(Boolean)
            .join(", ")
        : "";
      const activeItems = Array.isArray(bib.items) ? bib.items : [];
      const availableItems = activeItems.filter(
        (i: any) => i.status === "available",
      ).length;
      const publisherName =
        typeof bib.publisher === "object"
          ? bib.publisher?.name || ""
          : bib.publisher || "";

      res.bibliography = {
        ...bib,
        author: authorNames || bib.author || bib.sor || "Penulis tidak tersedia",
        authors: Array.isArray(bib.bibliographyAuthors)
          ? bib.bibliographyAuthors.map((ba: any) => ba.author).filter(Boolean)
          : [],
        publisher: publisherName,
        publicationYear: bib.publishYear ?? bib.publicationYear ?? null,
        isbnIssn: bib.isbn || bib.issn || bib.isbnIssn || undefined,
        totalItems: activeItems.length,
        availableItems,
        stock: availableItems > 0 ? availableItems : (bib.stock ?? 0),
        bibliographyAuthors: undefined,
      };
    }
    return res;
  }

  /**
   * 2. Admin lihat semua reservasi
   */
  async getAllReservations(
    filters: {
      status?: "waiting" | "fulfilled" | "canceled";
      memberId?: string;
      bibliographyId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    try {
      if (!filters.status || filters.status === "waiting") {
        await this.syncPendingReservationsWithAvailableStock(
          filters.bibliographyId,
        );
      }

      const conditions = [isNull(reservations.deletedAt)];
      if (filters.status) {
        conditions.push(eq(reservations.status, filters.status));
      }
      if (filters.memberId) {
        conditions.push(eq(reservations.memberId, filters.memberId));
      }
      if (filters.bibliographyId) {
        conditions.push(eq(reservations.bibliographyId, filters.bibliographyId));
      }

      const result = await db.query.reservations.findMany({
        where: and(...conditions),
        with: {
          bibliography: {
            with: {
              publisher: true,
              collectionType: true,
              bibliographyAuthors: {
                with: { author: true },
              },
              items: {
                where: isNull(items.deletedAt),
                columns: { id: true, itemCode: true, status: true },
              },
            },
          },
          member: { with: { user: true } },
        },
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        orderBy: [desc(reservations.createdAt)],
      });

      const mapped = result.map((res: any) =>
        this.mapReservationBibliography(res),
      );

      return {
        success: true,
        message: "Berhasil mengambil semua reservasi.",
        data: mapped,
      };
    } catch (error) {
      console.error("ReservationService.getAllReservations Error:", error);
      throw new InternalServerError("Gagal mengambil data reservasi.");
    }
  }

  /**
   * 3. Member lihat reservasinya sendiri (getMemberReservations)
   */
  async getMemberReservations(memberId: string) {
    try {
      const result = await db.query.reservations.findMany({
        where: and(
          eq(reservations.memberId, memberId),
          isNull(reservations.deletedAt),
        ),
        with: {
          bibliography: {
            with: {
              publisher: true,
              collectionType: true,
              bibliographyAuthors: {
                with: { author: true },
              },
              items: {
                where: isNull(items.deletedAt),
                columns: { id: true, itemCode: true, status: true },
              },
            },
          },
        },
        orderBy: [desc(reservations.createdAt)],
      });

      const mappedData = result.map((res: any) =>
        this.mapReservationBibliography(res),
      );

      return {
        success: true,
        message: "Berhasil mengambil riwayat reservasi.",
        data: mappedData,
      };
    } catch (error) {
      console.error("ReservationService.getMemberReservations Error:", error);
      throw new InternalServerError("Gagal mengambil riwayat reservasi.");
    }
  }

  /**
   * 4. Member/Admin batalkan reservasi
   */
  async cancelReservation(reservationId: string, memberId: string) {
    try {
      const reservation = await db.query.reservations.findFirst({
        where: and(
          eq(reservations.id, reservationId),
          eq(reservations.memberId, memberId),
          isNull(reservations.deletedAt),
        ),
      });

      if (!reservation) {
        throw new NotFoundError("Reservasi tidak ditemukan.");
      }

      if (reservation.status !== "waiting") {
        throw new BadRequestError(
          `Reservasi tidak dapat dibatalkan karena sudah berstatus '${reservation.status}'.`,
        );
      }

      const [updated] = await db
        .update(reservations)
        .set({ status: "canceled", updatedAt: new Date() })
        .where(eq(reservations.id, reservationId))
        .returning();

      return {
        success: true,
        message: "Reservasi berhasil dibatalkan.",
        data: updated,
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      console.error("ReservationService.cancelReservation Error:", error);
      throw new InternalServerError("Gagal membatalkan reservasi.");
    }
  }

  /**
   * 5. Auto-fulfill reservasi waiting saat stok tersedia kembali:
   * - Mencocokkan item berstatus `available` yang belum dialokasikan ke pinjaman aktif/pending
   * - Mengklaim reservasi waiting tertua (FIFO) secara atomik -> `fulfilled`
   * - Membuat pengajuan peminjaman (`loans.status = 'pending'`) agar langsung tampil di menu persetujuan admin
   */
  async fulfillNextReservation(bibliographyId: string): Promise<void> {
    try {
      const bib = await db.query.bibliographies.findFirst({
        where: and(
          eq(bibliographies.id, bibliographyId),
          isNull(bibliographies.deletedAt),
        ),
        with: { collectionType: true },
      });

      if (!bib) return;

      const isReference =
        bib.collectionType &&
        (bib.collectionType.canBeBorrowed === false ||
          bib.collectionType.code === "R");
      if (isReference) return;

      const availableItems = await db.query.items.findMany({
        where: and(
          eq(items.bibliographyId, bibliographyId),
          eq(items.status, "available"),
          isNull(items.deletedAt),
        ),
        orderBy: [asc(items.itemCode)],
      });
      if (!availableItems || availableItems.length === 0) return;

      const availableIds = availableItems.map((it) => it.id);
      const openLoans = await db.query.loans.findMany({
        where: and(
          inArray(loans.itemId, availableIds),
          inArray(loans.status, ["pending", "approved", "extended"]),
          isNull(loans.deletedAt),
        ),
        columns: { itemId: true },
      });
      const occupiedItemIds = new Set(openLoans.map((l) => l.itemId));
      const freeItems = availableItems.filter(
        (it) => !occupiedItemIds.has(it.id),
      );
      if (freeItems.length === 0) return;

      const waitingReservations = await db.query.reservations.findMany({
        where: and(
          eq(reservations.bibliographyId, bibliographyId),
          eq(reservations.status, "waiting"),
          isNull(reservations.deletedAt),
        ),
        orderBy: [asc(reservations.createdAt)],
        with: {
          member: { with: { user: true } },
          bibliography: true,
        },
      });
      if (!waitingReservations || waitingReservations.length === 0) return;

      for (const resv of waitingReservations) {
        if (freeItems.length === 0) break;

        // Pastikan member tidak melebihi batas maksimal 3 pinjaman aktif/pending
        const memberOpenLoans = await db.query.loans.findMany({
          where: and(
            eq(loans.memberId, resv.memberId),
            inArray(loans.status, ["pending", "approved", "extended"]),
            isNull(loans.deletedAt),
          ),
          columns: { id: true },
        });
        if (memberOpenLoans.length >= 3) {
          continue;
        }

        const assignedItem = freeItems.shift()!;

        const converted = await db.transaction(async (tx) => {
          const [claimed] = await tx
            .update(reservations)
            .set({ status: "fulfilled", updatedAt: new Date() })
            .where(
              and(
                eq(reservations.id, resv.id),
                eq(reservations.status, "waiting"),
                isNull(reservations.deletedAt),
              ),
            )
            .returning();

          if (!claimed) return false;

          const today = new Date();
          const loanDate = today.toISOString().split("T")[0];
          const dueDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

          await tx.insert(loans).values({
            memberId: resv.memberId,
            itemId: assignedItem.id,
            status: "pending",
            loanDate,
            dueDate,
            notes: `Pengajuan peminjaman otomatis dari antrean reservasi (#RES-${resv.id.slice(0, 8).toUpperCase()})`,
            verificationToken: crypto.randomBytes(16).toString("hex"),
            verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });

          return true;
        });

        if (converted) {
          const memberUser = resv.member?.user;
          const bookTitle = resv.bibliography?.title ?? bib.title ?? "Buku";
          if (memberUser?.email && memberUser?.name) {
            void notificationService.sendReservationFulfilledNotification(
              memberUser.email,
              memberUser.name,
              bookTitle,
            );
          }
        }
      }
    } catch (error) {
      // Jangan throw — jangan sampai proses stok/return gagal hanya karena sinkronisasi reservasi
      console.error(
        "ReservationService.fulfillNextReservation Error [Ignored]:",
        error,
      );
    }
  }

  /**
   * Rekonsiliasi antrean reservasi `waiting` apabila stok buku sudah tersedia lagi.
   */
  async syncPendingReservationsWithAvailableStock(
    bibliographyId?: string,
  ): Promise<void> {
    try {
      const conditions = [
        eq(reservations.status, "waiting"),
        isNull(reservations.deletedAt),
      ];
      if (bibliographyId) {
        conditions.push(eq(reservations.bibliographyId, bibliographyId));
      }

      const waitingRows = await db.query.reservations.findMany({
        where: and(...conditions),
        columns: { bibliographyId: true },
      });

      const uniqueBibIds = Array.from(
        new Set(waitingRows.map((r) => r.bibliographyId).filter(Boolean)),
      );
      for (const bibId of uniqueBibIds) {
        await this.fulfillNextReservation(bibId);
      }
    } catch (error) {
      console.error(
        "ReservationService.syncPendingReservationsWithAvailableStock Error [Ignored]:",
        error,
      );
    }
  }
}

export default new ReservationService();
