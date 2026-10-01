import { db } from "../../../db";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { reservations, items, bibliographies } from "../../../db/schema";
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
          bibliography: true,
          member: { with: { user: true } },
        },
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        orderBy: [desc(reservations.createdAt)],
      });

      return {
        success: true,
        message: "Berhasil mengambil semua reservasi.",
        data: result,
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
              bibliographyAuthors: {
                with: { author: true }
              }
            }
          }
        },
        orderBy: [desc(reservations.createdAt)],
      });

      const mappedData = result.map((res: any) => {
        if (res.bibliography) {
          const authorNames = Array.isArray(res.bibliography.bibliographyAuthors)
            ? res.bibliography.bibliographyAuthors.map((ba: any) => ba.author?.name).filter(Boolean).join(", ")
            : "";
          res.bibliography.author = authorNames || res.bibliography.author || res.bibliography.sor || "Penulis tidak tersedia";
          res.bibliography.authors = Array.isArray(res.bibliography.bibliographyAuthors)
            ? res.bibliography.bibliographyAuthors.map((ba: any) => ba.author).filter(Boolean)
            : [];
        }
        return res;
      });

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
   * 5. Auto-fulfill reservasi tertua saat buku dikembalikan.
   * DIPANGGIL INTERNAL dari LoanService.returnLoan() — BUKAN dari HTTP request.
   * Ambil reservasi waiting PALING LAMA (FIFO) untuk collectionId ini.
   */
  async fulfillNextReservation(bibliographyId: string): Promise<void> {
    try {
      const oldestReservation = await db.query.reservations.findFirst({
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

      if (!oldestReservation) {
        // Tidak ada yang antri — skip
        return;
      }

      // Update status reservasi jadi fulfilled
      await db
        .update(reservations)
        .set({ status: "fulfilled", updatedAt: new Date() })
        .where(eq(reservations.id, oldestReservation.id));

      // Kirim email notifikasi ke member (fire-and-forget)
      const memberUser = oldestReservation.member?.user;
      const bookTitle = oldestReservation.bibliography?.title ?? "Buku";
      if (memberUser?.email && memberUser?.name) {
        void notificationService.sendReservationFulfilledNotification(
          memberUser.email,
          memberUser.name,
          bookTitle,
        );
      }
    } catch (error) {
      // Jangan throw — jangan sampai proses return loan gagal hanya karena reservasi
      console.error(
        "ReservationService.fulfillNextReservation Error [Ignored]:",
        error,
      );
    }
  }
}

export default new ReservationService();
