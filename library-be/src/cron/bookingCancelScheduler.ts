import { db } from "../db";
import { loans, items } from "../db/schema";
import { eq, and, isNull, or, lte } from "drizzle-orm";
import { NotificationService } from "../modules/notification/service/notification.service";
import { syncCollectionAvailableStock } from "../modules/shared/utils/stock-sync";
import reservationService from "../modules/reservation/service/reservation.service";

const notificationService = new NotificationService();

export async function checkAndCancelExpiredBookings(): Promise<number> {
  const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

  try {
    const expiredLoans = await db.query.loans.findMany({
      where: and(
        eq(loans.status, "pending"),
        isNull(loans.deletedAt),
        or(
          lte(loans.verificationExpiresAt, new Date()),
          lte(loans.createdAt, twentyMinutesAgo)
        )
      ),
      with: {
        member: { with: { user: true } },
        item: { with: { bibliography: true } }
      }
    });

    if (!expiredLoans || expiredLoans.length === 0) return 0;

    let canceledCount = 0;

    for (const loan of expiredLoans) {
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(loans)
            .set({
              status: "rejected",
              verificationToken: null,
              updatedAt: new Date()
            })
            .where(and(eq(loans.id, loan.id), eq(loans.status, "pending")));

          await tx
            .update(items)
            .set({ status: "available", updatedAt: new Date() })
            .where(eq(items.id, loan.itemId));

          if (loan.item?.bibliographyId) {
            await syncCollectionAvailableStock(tx, loan.item.bibliographyId);
          }
        });

        canceledCount++;

        // Auto fulfill next reservation if waiting queue exists
        if (loan.item?.bibliographyId) {
          void reservationService.fulfillNextReservation(loan.item.bibliographyId);
        }

        // Email member notification
        const userEmail = loan.member?.user?.email;
        const userName = loan.member?.user?.name || "Anggota Perpustakaan";
        const bookTitle = loan.item?.bibliography?.title || "Buku Perpustakaan";

        if (userEmail) {
          try {
            await notificationService.sendBookingCanceledNotification(
              userEmail,
              userName,
              bookTitle,
              "Pemesanan otomatis dibatalkan karena tidak diverifikasi di perpustakaan dalam batas waktu 20 menit."
            );
          } catch (mailError) {
            console.error(
              `[BookingCancelScheduler] Gagal kirim email pembatalan ke ${userEmail}:`,
              mailError
            );
          }
        }
      } catch (loanError) {
        console.error(
          `[BookingCancelScheduler] Gagal membatalkan loan ID: ${loan.id}:`,
          loanError
        );
      }
    }

    if (canceledCount > 0) {
      console.log(`[BookingCancelScheduler] ✅ Berhasil auto-cancel ${canceledCount} pemesanan kadaluarsa.`);
    }

    return canceledCount;
  } catch (error) {
    console.error("[BookingCancelScheduler] Error checking expired bookings:", error);
    return 0;
  }
}

let schedulerTimer: NodeJS.Timeout | null = null;

export function initBookingCancelScheduler(intervalMs = 60 * 1000): NodeJS.Timeout {
  console.log("[BookingCancelScheduler] ⏱️ Scheduler aktif (interval 1 menit).");

  // Jalankan sekali saat startup
  void checkAndCancelExpiredBookings();

  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  schedulerTimer = setInterval(() => {
    void checkAndCancelExpiredBookings();
  }, intervalMs);

  return schedulerTimer;
}

export function stopBookingCancelScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
