import { db } from "../../../db";
import { eq, and, sql, isNull } from "drizzle-orm";
import {
  items,
  loans,
  members,
  fines,
  reservations,
  bibliographies,
  Users,
  returnRequests
} from "../../../db/schema";
import crypto from "crypto";
import qrcode from "qrcode";
import { NotificationService } from "../../notification/service/notification.service";
import reservationService from "../../reservation/service/reservation.service";
import { ROLES } from "../../../utils/auth-types";
import { syncCollectionAvailableStock } from "../../shared/utils/stock-sync";

const notificationService = new NotificationService();

export class LoanService {

  /**
   * 1. Mahasiswa Request Pinjam Buku
   */
  async requestLoan(
    memberId: string,
    bibliographyId: string,
    reqLoanDate?: string,
    reqDueDate?: string
  ) {
    // Best Practice: Cek apakah member sudah meminjam terlalu banyak (Limit: 3 buku aktif)
    const activeLoansCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(loans)
      .where(
        and(
          eq(loans.memberId, memberId),
          sql`${loans.status} IN ('approved', 'pending', 'extended')`,
          isNull(loans.deletedAt)
        )
      );

    if (Number(activeLoansCount[0].count) >= 3) {
      throw new Error(
        "Anda sudah mencapai batas maksimal peminjaman (3 buku). Silakan kembalikan buku terlebih dahulu."
      );
    }

    // Validasi antrian reservasi untuk koleksi ini
    // Jangan izinkan pinjam jika ada antrian menunggu (FIFO)
    const [waitingResCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.bibliographyId, bibliographyId),
          eq(reservations.status, "waiting"),
          isNull(reservations.deletedAt)
        )
      );

    // Hitung item yang tersedia
    const [availableItemsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(
        and(
          eq(items.bibliographyId, bibliographyId),
          eq(items.status, "available"),
          isNull(items.deletedAt)
        )
      );

    if (Number(availableItemsCount.count) <= Number(waitingResCount.count)) {
      // Cek apakah member ini ada di urutan pertama reservasi?
      // (Logika ini bisa dikembangkan, tapi untuk sekarang kita proteksi secara umum)
      throw new Error(
        "Buku ini sedang dipesan (reserved) oleh orang lain di antrian. Silakan masuk antrian reservasi."
      );
    }

    // Validasi item: Cari salinan pertama yang tersedia untuk bibliographyId ini
    const item = await db.query.items.findFirst({
      where: and(
        eq(items.bibliographyId, bibliographyId),
        eq(items.status, "available"),
        isNull(items.deletedAt)
      )
    });

    if (!item) {
      throw new Error("Buku ini sedang tidak tersedia untuk dipinjam");
    }

    // Generate token & expire (2 jam) untuk verifikasi di tempat
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 jam

    const finalLoanDate = reqLoanDate || new Date().toISOString().split("T")[0];
    const finalDueDate =
      reqDueDate ||
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const [loan] = await db
      .insert(loans)
      .values({
        memberId,
        itemId: item.id, // Gunakan itemId yang available
        status: "pending",
        loanDate: finalLoanDate,
        dueDate: finalDueDate,
        verificationToken: token,
        verificationExpiresAt: expiresAt
      })
      .returning();

    const qrCodeUrl = await qrcode.toDataURL(token, {
      width: 300,
      errorCorrectionLevel: "H"
    });

    return { ...loan, qrCodeUrl };
  }

  /**
   * 2. Admin Scan / Check Token
   */
  async verifyToken(token: string) {
    const loan = await db.query.loans.findFirst({
      where: and(
        eq(loans.verificationToken, token),
        eq(loans.status, "pending"),
        isNull(loans.deletedAt)
      ),
      with: {
        member: { with: { user: true } },
        item: {
          with: {
            bibliography: {
              with: {
                bibliographyAuthors: {
                  with: { author: true }
                }
              }
            }
          }
        }
      }
    });

    if (!loan) {
      throw new Error("Token invalid atau peminjaman sudah di proses");
    }

    if (new Date() > (loan.verificationExpiresAt ?? new Date(0))) {
      throw new Error("Token telah kadaluarsa. Silakan request ulang.");
    }

    return loan;
  }

  /**
   * 3. Admin approve peminjaman (Email Otomatis)
   */
  async approveLoan(loanId: string, adminId: string) {
    const result = await db.transaction(async (tx) => {
      // Ambil data peminjaman untuk kirim email
      const loanData = await tx.query.loans.findFirst({
        where: and(eq(loans.id, loanId), isNull(loans.deletedAt)),
        with: {
          member: { with: { user: true } },
          item: {
            with: {
              bibliography: {
                with: {
                  bibliographyAuthors: {
                    with: { author: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!loanData) {
        throw new Error("Data peminjaman tidak ditemukan");
      }

      // Update Loan Status
      const [updatedLoan] = await tx
        .update(loans)
        .set({
          status: "approved",
          approvedBy: adminId,
          verificationToken: null // Hapus token setelah digunakan
        })
        .where(and(eq(loans.id, loanId), isNull(loans.deletedAt)))
        .returning();

      // Update Item Status menjadi 'loaned'
      await tx
        .update(items)
        .set({ status: "loaned", updatedAt: new Date() })
        .where(eq(items.id, updatedLoan.itemId));

      await syncCollectionAvailableStock(tx, loanData.item.bibliographyId);

      return loanData;
    });

    // Kirim Email Notifikasi dan tangkap errornya jika gagal (untuk debugging)
    if (result.member.user.email) {
      try {
        await notificationService.sendLoansNotification(
          result.member.user.email,
          result.member.user.name,
          result.item.bibliography.title ?? "Buku",
          result.dueDate
        );
      } catch (error: any) {
        return {
          message: `Peminjaman berhasil, NAMUN EMAIL GAGAL DIKIRIM: ${error.message}`
        };
      }
    }

    return {
      message: "Peminjaman berhasil disetujui, email notifikasi telah dikirim."
    };
  }

  /**
   * 4. Admin reject peminjaman
   */
  async rejectLoan(loanId: string, adminId: string) {
    await db.transaction(async (tx) => {
      const loanData = await tx.query.loans.findFirst({
        where: and(eq(loans.id, loanId), isNull(loans.deletedAt)),
        with: {
          item: true
        }
      });

      if (!loanData) {
        throw new Error("Peminjaman tidak ditemukan");
      }

      const [updatedLoan] = await tx
        .update(loans)
        .set({
          status: "rejected",
          approvedBy: adminId,
          verificationToken: null
        })
        .where(and(eq(loans.id, loanId), isNull(loans.deletedAt)))
        .returning();

      if (!updatedLoan) {
        throw new Error("Peminjaman tidak ditemukan");
      }

      await tx
        .update(items)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(items.id, updatedLoan.itemId));

      await syncCollectionAvailableStock(tx, loanData.item.bibliographyId);
    });

    return {
      message: "Peminjaman berhasil ditolak"
    };
  }

  /**
   * Return Loan (Pengembalian Buku secara langsung oleh Admin/Staff)
   */
  async returnLoan(loanId: string, adminId: string) {
    return await db.transaction(async (tx) => {
      // Find the loan
      const loan = await tx.query.loans.findFirst({
        where: and(eq(loans.id, loanId), isNull(loans.deletedAt))
      });
      if (!loan || !["approved", "extended"].includes(loan.status)) {
        throw new Error("Buku tidak dalam status dipinjam atau data tidak ditemukan");
      }

      const returnDateStr = new Date().toISOString().split("T")[0];

      // Update loan status to returned
      await tx.update(loans).set({
        status: "returned",
        returnDate: returnDateStr,
        updatedAt: new Date()
      }).where(eq(loans.id, loan.id));

      // Update item status to available
      await tx.update(items).set({ status: "available", updatedAt: new Date() }).where(eq(items.id, loan.itemId));

      // Sync collection stock if needed
      const loanItem = await tx.query.items.findFirst({ where: and(eq(items.id, loan.itemId), isNull(items.deletedAt)) });
      if (loanItem?.bibliographyId) {
        await syncCollectionAvailableStock(tx, loanItem.bibliographyId);
      }

      // Auto-fulfill next reservation if any
      if (loanItem?.bibliographyId) {
        void reservationService.fulfillNextReservation(loanItem.bibliographyId);
      }

      // Calculate late fine
      const returnDateObj = new Date();
      const dueDateObj = new Date(loan.dueDate);
      returnDateObj.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);
      const isLate = returnDateObj > dueDateObj;
      if (isLate) {
        const diffTime = Math.abs(returnDateObj.getTime() - dueDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const finePerDay = 500;
        const fineAmount = diffDays * finePerDay;
        const existingUnpaidFine = tx.query.fines
          ? await tx.query.fines.findFirst({
              where: and(
                eq(fines.loanId, loan.id),
                eq(fines.status, "unpaid"),
                isNull(fines.deletedAt)
              )
            })
          : null;
        if (existingUnpaidFine) {
          await tx.update(fines).set({ amount: fineAmount.toString(), updatedAt: new Date() }).where(eq(fines.id, existingUnpaidFine.id));
        } else {
          await tx.insert(fines).values({ loanId: loan.id, amount: fineAmount.toString(), status: "unpaid" });
        }
        return { success: true, message: `Buku dikembalikan, namun terlambat ${diffDays} hari. Dikenakan denda sebesar Rp ${fineAmount.toLocaleString("id-ID")}.` };
      }

      return { success: true, message: "Buku telah berhasil dikembalikan tepat waktu." };
    });
  }

  /**
   * 5. Return Loan (Pengembalian Buku) - NEW
   */
  async approveReturnRequest(requestId: string, adminId: string) {
    return await db.transaction(async (tx) => {
      // Verify super_admin
      const adminUser = await tx.query.Users.findFirst({ where: eq(Users.id, adminId) });
      if (!adminUser || adminUser.role !== ROLES.SUPER_ADMIN) {
        throw new Error("Pengembalian buku harus disetujui oleh Super Admin");
      }

      // Find pending return request
      const request = await tx.query.returnRequests.findFirst({
        where: and(eq(returnRequests.id, requestId), eq(returnRequests.status, "pending"))
      });
      if (!request) {
        throw new Error("Permintaan pengembalian tidak ditemukan atau sudah diproses");
      }

      // Get the associated loan
      const loan = await tx.query.loans.findFirst({
        where: and(eq(loans.id, request.loanId), isNull(loans.deletedAt))
      });
      if (!loan || !["approved", "extended"].includes(loan.status)) {
        throw new Error("Buku tidak dalam status dipinjam atau data tidak ditemukan");
      }

      const returnDateStr = new Date().toISOString().split("T")[0];

      // Update loan status to returned
      await tx.update(loans).set({
        status: "returned",
        returnDate: returnDateStr,
        updatedAt: new Date()
      }).where(eq(loans.id, loan.id));

      // Update item status to available
      await tx.update(items).set({ status: "available", updatedAt: new Date() }).where(eq(items.id, loan.itemId));

      // Sync collection stock if needed
      const loanItem = await tx.query.items.findFirst({ where: and(eq(items.id, loan.itemId), isNull(items.deletedAt)) });
      if (loanItem?.bibliographyId) {
        await syncCollectionAvailableStock(tx, loanItem.bibliographyId);
      }

      // Auto-fulfill next reservation if any
      if (loanItem?.bibliographyId) {
        void reservationService.fulfillNextReservation(loanItem.bibliographyId);
      }

      // Calculate late fine (same logic as returnLoan)
      const returnDateObj = new Date();
      const dueDateObj = new Date(loan.dueDate);
      returnDateObj.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);
      const isLate = returnDateObj > dueDateObj;
      if (isLate) {
        const diffTime = Math.abs(returnDateObj.getTime() - dueDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const finePerDay = 500;
        const fineAmount = diffDays * finePerDay;
        const existingUnpaidFine = await tx.query.fines.findFirst({
          where: and(
            eq(fines.loanId, loan.id),
            eq(fines.status, "unpaid"),
            isNull(fines.deletedAt)
          )
        });
        if (existingUnpaidFine) {
          await tx.update(fines).set({ amount: fineAmount.toString(), updatedAt: new Date() }).where(eq(fines.id, existingUnpaidFine.id));
        } else {
          await tx.insert(fines).values({ loanId: loan.id, amount: fineAmount.toString(), status: "unpaid" });
        }
        // Update request status to approved
        await tx.update(returnRequests).set({ status: "approved", processedAt: new Date(), processedBy: adminId }).where(eq(returnRequests.id, requestId));
        return { success: true, message: `Buku dikembalikan, namun terlambat ${diffDays} hari. Dikenakan denda sebesar Rp ${fineAmount.toLocaleString("id-ID")}.` };
      }

      // Update request status to approved (no fine)
      await tx.update(returnRequests).set({ status: "approved", processedAt: new Date(), processedBy: adminId }).where(eq(returnRequests.id, requestId));
      return { success: true, message: "Buku telah berhasil dikembalikan tepat waktu." };
    });
  }

  /**
   * 5b. Create Return Request (Member mengajukan pengembalian)
   */
  async createReturnRequest(loanId: string, memberId: string) {
    // Verify loan belongs to member and is eligible for return
    const loan = await db.query.loans.findFirst({
      where: and(eq(loans.id, loanId), eq(loans.memberId, memberId), isNull(loans.deletedAt))
    });
    if (!loan || !["approved", "extended"].includes(loan.status)) {
      throw new Error("Loan not found or not in a returnable status");
    }
    // Check if there's already a pending return request for this loan
    const existingRequest = await db.query.returnRequests.findFirst({
      where: and(eq(returnRequests.loanId, loanId), eq(returnRequests.status, "pending"))
    });
    if (existingRequest) {
      throw new Error("Sudah ada permintaan pengembalian yang sedang menunggu persetujuan");
    }
    // Insert pending return request
    const [newRequest] = await db.insert(returnRequests).values({
      loanId,
      status: "pending"
    }).returning();
    return { success: true, message: "Permintaan pengembalian buku berhasil diajukan", data: newRequest };
  }

  /**
   * 5c. Get All Pending Return Requests (for Super Admin dashboard)
   */
  async getPendingReturnRequests() {
    const requests = await db.query.returnRequests.findMany({
      where: eq(returnRequests.status, "pending"),
      with: {
        loan: {
          with: {
            member: { with: { user: true } },
            item: {
              with: {
                bibliography: {
                  with: {
                    bibliographyAuthors: {
                      with: { author: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    return { success: true, data: requests };
  }


  // Helper: Get Member by User ID
  async getMemberIdByUserId(userId: string) {
    const member = await db.query.members.findFirst({
      where: and(eq(members.userId, userId), isNull(members.deletedAt))
    });
    return member?.id;
  }

  /**
   * 6. Get All Loans (With filters)
   */
  async getAllLoans(filters: {
    memberId?: string;
    status?: "pending" | "approved" | "returned" | "extended" | "rejected";
    limit?: number;
    offset?: number;
  }) {
    const whereConditions = [isNull(loans.deletedAt)];

    if (filters.memberId) {
      whereConditions.push(eq(loans.memberId, filters.memberId));
    }

    if (filters.status) {
      if (filters.status === "approved") {
        whereConditions.push(sql`${loans.status} IN ('approved', 'extended')`);
      } else {
        whereConditions.push(eq(loans.status, filters.status));
      }
    }

    const result = await db.query.loans.findMany({
      where: and(...whereConditions),
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      with: {
        item: {
          with: {
            bibliography: {
              with: {
                bibliographyAuthors: {
                  with: { author: true }
                }
              }
            },
            location: true
          }
        },
        member: {
          with: {
            user: true
          }
        },
        returnRequests: true
      },
      orderBy: (loans, { desc }) => [desc(loans.createdAt)]
    });

    const loansWithQr = await Promise.all(
      result.map(async (loan: any) => {
        // Standardize author name on item.bibliography
        if (loan.item?.bibliography) {
          const bib = loan.item.bibliography;
          const authorNames = Array.isArray(bib.bibliographyAuthors)
            ? bib.bibliographyAuthors.map((ba: any) => ba.author?.name).filter(Boolean).join(", ")
            : "";
          bib.author = authorNames || bib.author || bib.sor || "Penulis tidak tersedia";
          bib.authors = Array.isArray(bib.bibliographyAuthors)
            ? bib.bibliographyAuthors.map((ba: any) => ba.author).filter(Boolean)
            : [];
        }

        const qrData = loan.verificationToken || loan.item?.itemCode || loan.item?.barcode || loan.id;
        if (qrData) {
          try {
            const qrCodeUrl = await qrcode.toDataURL(qrData, {
              width: 300,
              errorCorrectionLevel: "H"
            });
            return { ...loan, qrCodeUrl };
          } catch (_e) {
            return loan;
          }
        }
        return loan;
      })
    );

    return {
      success: true,
      message: "Loans retrieved successfully",
      data: loansWithQr
    };
  }
  /**
   * 7. Request Extension (Pengajuan Perpanjangan oleh Member)
   */
  async requestExtension(loanId: string, memberId: string) {
    // 1. Cari data loan
    const loan = await db.query.loans.findFirst({
      where: and(
        eq(loans.id, loanId),
        isNull(loans.deletedAt)
      ),
      with: {
        item: true
      }
    });

    if (!loan) {
      throw new Error("Data peminjaman tidak ditemukan.");
    }

    // 2. Validasi kepemilikan
    if (loan.memberId !== memberId) {
      throw new Error("Akses ditolak — Anda bukan peminjam buku ini.");
    }

    // 3. Validasi status: Hanya yang 'approved' atau 'extended' yang bisa diperpanjang.
    if (loan.status !== "approved" && loan.status !== "extended") {
      throw new Error(
        "Hanya buku yang sedang dipinjam yang dapat diperpanjang."
      );
    }

    // 4. Validasi status pengajuan saat ini
    if (loan.extensionStatus === "pending") {
      throw new Error(
        "Permintaan perpanjangan untuk buku ini sedang diproses oleh admin."
      );
    }

    // 5. Validasi extendCount: limit 1x
    if (loan.extendCount >= 1) {
      throw new Error(
        "Buku ini sudah pernah diperpanjang sebelumnya. Batas perpanjangan adalah 1 kali."
      );
    }

    // 6. Validasi Overdue: Tidak boleh extend jika sudah lewat dueDate.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(loan.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      throw new Error(
        "Buku sudah melewati batas waktu pengembalian. Silakan kembalikan buku dan bayar denda jika ada."
      );
    }

    // 7. Validasi Reservasi: Tidak boleh extend jika ada orang lain yang sudah antri (waiting) untuk koleksi ini.
    const [waitingResCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.bibliographyId, loan.item.bibliographyId),
          eq(reservations.status, "waiting"),
          isNull(reservations.deletedAt)
        )
      );

    if (Number(waitingResCount.count) > 0) {
      throw new Error(
        "Buku ini tidak dapat diperpanjang karena sudah dipesan (reserved) oleh orang lain di antrian."
      );
    }

    // 8. Eksekusi pengajuan perpanjangan
    await db
      .update(loans)
      .set({
        extensionStatus: "pending",
        updatedAt: new Date()
      })
      .where(eq(loans.id, loanId));

    return {
      success: true,
      message: "Permintaan perpanjangan peminjaman berhasil diajukan. Menunggu persetujuan admin.",
      data: {
        loanId,
        extensionStatus: "pending"
      }
    };
  }

  /**
   * 8. Approve Extension (Admin/Staff Menyetujui Perpanjangan)
   */
  async approveExtension(loanId: string, adminId: string) {
    return await db.transaction(async (tx) => {
      const loan = await tx.query.loans.findFirst({
        where: and(
          eq(loans.id, loanId),
          isNull(loans.deletedAt)
        ),
        with: {
          item: true
        }
      });

      if (!loan) {
        throw new Error("Data peminjaman tidak ditemukan.");
      }

      if (loan.extensionStatus !== "pending") {
        throw new Error("Tidak ada permintaan perpanjangan yang aktif untuk peminjaman ini.");
      }

      if (loan.extendCount >= 1) {
        throw new Error("Buku ini sudah mencapai batas maksimal perpanjangan.");
      }

      // Validasi Reservasi ulang
      const [waitingResCount] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(
          and(
            eq(reservations.bibliographyId, loan.item.bibliographyId),
            eq(reservations.status, "waiting"),
            isNull(reservations.deletedAt)
          )
        );

      if (Number(waitingResCount.count) > 0) {
        throw new Error("Buku ini tidak dapat diperpanjang karena sudah dipesan oleh orang lain.");
      }

      const dueDate = new Date(loan.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Tambah 7 hari dari dueDate lama
      const newDueDate = new Date(dueDate);
      newDueDate.setDate(newDueDate.getDate() + 7);
      const newDueDateStr = newDueDate.toISOString().split("T")[0];

      await tx
        .update(loans)
        .set({
          dueDate: newDueDateStr,
          extendCount: loan.extendCount + 1,
          status: "extended",
          extensionStatus: "approved",
          approvedBy: adminId,
          updatedAt: new Date()
        })
        .where(eq(loans.id, loanId));

      return {
        success: true,
        message: `Peminjaman berhasil diperpanjang hingga ${newDueDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`,
        data: {
          loanId,
          newDueDate: newDueDateStr,
          extensionStatus: "approved",
          status: "extended"
        }
      };
    });
  }

  /**
   * 9. Reject Extension (Admin/Staff Menolak Perpanjangan)
   */
  async rejectExtension(loanId: string, adminId: string) {
    const loan = await db.query.loans.findFirst({
      where: and(
        eq(loans.id, loanId),
        isNull(loans.deletedAt)
      )
    });

    if (!loan) {
      throw new Error("Data peminjaman tidak ditemukan.");
    }

    if (loan.extensionStatus !== "pending") {
      throw new Error("Tidak ada permintaan perpanjangan yang aktif untuk peminjaman ini.");
    }

    await db
      .update(loans)
      .set({
        extensionStatus: "rejected",
        updatedAt: new Date()
      })
      .where(eq(loans.id, loanId));

    return {
      success: true,
      message: "Permintaan perpanjangan peminjaman ditolak oleh admin.",
      data: {
        loanId,
        extensionStatus: "rejected"
      }
    };
  }
}
