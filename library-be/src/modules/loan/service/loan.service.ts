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
  returnRequests,
  transactions
} from "../../../db/schema";
import crypto from "crypto";
import qrcode from "qrcode";
import { NotificationService } from "../../notification/service/notification.service";
import reservationService from "../../reservation/service/reservation.service";
import { ROLES } from "../../../utils/auth-types";
import { syncCollectionAvailableStock } from "../../shared/utils/stock-sync";
import PDFDocument from "pdfkit";
import { Response } from "express";

const notificationService = new NotificationService();

export class LoanService {

  /**
   * 1. Mahasiswa Request Pinjam Buku
   */
  async requestLoan(
    memberId: string,
    bibliographyId: string,
    reqLoanDate?: string,
    reqDueDate?: string,
    notes?: string
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

    // Resolusi apakah bibliographyId yang dikirim adalah ID item langsung
    let targetBibId = bibliographyId;
    const directItem = await db.query.items.findFirst({
      where: and(eq(items.id, bibliographyId), isNull(items.deletedAt))
    });
    if (directItem) {
      targetBibId = directItem.bibliographyId;
    }

    // Validasi antrian reservasi untuk koleksi ini
    // Jangan izinkan pinjam jika ada antrian menunggu (FIFO)
    const [waitingResCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(reservations)
      .where(
        and(
          eq(reservations.bibliographyId, targetBibId),
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
          eq(items.bibliographyId, targetBibId),
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

    // Validasi item: Gunakan directItem jika available, atau cari salinan pertama yang tersedia
    const item = directItem && directItem.status === "available"
      ? directItem
      : await db.query.items.findFirst({
          where: and(
            eq(items.bibliographyId, targetBibId),
            eq(items.status, "available"),
            isNull(items.deletedAt)
          )
        });

    if (!item) {
      throw new Error("Buku ini sedang tidak tersedia untuk dipinjam");
    }

    // Generate token & expire (20 menit) untuk verifikasi di tempat
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 menit

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
        notes: notes || null,
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
   * Member membatalkan pemesanan/peminjaman (hanya jika status pending)
   */
  async cancelLoan(loanId: string, memberId: string, userRole?: string) {
    return await db.transaction(async (tx) => {
      const loanData = await tx.query.loans.findFirst({
        where: and(eq(loans.id, loanId), isNull(loans.deletedAt)),
        with: {
          member: { with: { user: true } },
          item: { with: { bibliography: true } }
        }
      });

      if (!loanData) {
        throw new Error("Peminjaman tidak ditemukan");
      }

      const isOwner = loanData.memberId === memberId;
      const isAdmin = userRole === "super_admin" || userRole === "staff";
      if (!isOwner && !isAdmin) {
        throw new Error("Akses ditolak: Anda tidak memiliki hak untuk membatalkan peminjaman ini");
      }

      if (loanData.status !== "pending") {
        throw new Error("Hanya pemesanan dengan status pending yang dapat dibatalkan");
      }

      const [updatedLoan] = await tx
        .update(loans)
        .set({
          status: "rejected",
          verificationToken: null,
          updatedAt: new Date()
        })
        .where(and(eq(loans.id, loanId), isNull(loans.deletedAt)))
        .returning();

      await tx
        .update(items)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(items.id, loanData.itemId));

      if (loanData.item?.bibliographyId) {
        await syncCollectionAvailableStock(tx, loanData.item.bibliographyId);
      }

      // Auto-fulfill reservasi berikutnya jika ada
      if (loanData.item?.bibliographyId) {
        void reservationService.fulfillNextReservation(loanData.item.bibliographyId);
      }

      // Kirim notifikasi email pembatalan jika user memiliki email
      const userEmail = loanData.member?.user?.email;
      const userName = loanData.member?.user?.name || "Anggota Perpustakaan";
      const bookTitle = loanData.item?.bibliography?.title || "Buku Perpustakaan";
      if (userEmail) {
        try {
          await notificationService.sendBookingCanceledNotification(
            userEmail,
            userName,
            bookTitle,
            "Pemesanan dibatalkan oleh pengguna."
          );
        } catch (mailError) {
          console.error("[LoanService] Gagal kirim email cancel booking:", mailError);
        }
      }

      return updatedLoan;
    });
  }

  /**
   * Return Loan (Pengembalian Buku secara langsung oleh Admin/Staff)
   */
  async returnLoan(
    loanId: string,
    adminId: string,
    payload?: string | { condition?: string; staffName?: string; signature?: string; notes?: string }
  ) {
    const options = typeof payload === "string" ? { condition: payload } : (payload || {});
    const condition = options.condition || "good";
    const staffName = options.staffName || "Petugas Perpustakaan";
    const signature = options.signature || null;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNo = `BA-RET-${dateStr}-${randomSuffix}`;

    return await db.transaction(async (tx) => {
      // Find the loan
      const loan = await tx.query.loans.findFirst({
        where: and(eq(loans.id, loanId), isNull(loans.deletedAt))
      });
      if (!loan || !["approved", "extended"].includes(loan.status)) {
        throw new Error("Buku tidak dalam status dipinjam atau data tidak ditemukan");
      }

      const returnDateStr = new Date().toISOString().split("T")[0];

      // Update loan status to returned with verification metadata
      await tx.update(loans).set({
        status: "returned",
        extensionStatus: "none",
        returnDate: returnDateStr,
        returnCondition: condition,
        returnStaffName: staffName,
        returnStaffSignature: signature,
        returnReceiptNo: receiptNo,
        notes: options.notes || loan.notes,
        updatedAt: new Date()
      }).where(eq(loans.id, loan.id));

      // Update item status based on condition
      const itemStatus = condition === "damaged" ? "damaged" : condition === "lost" ? "lost" : "available";
      await tx.update(items).set({ status: itemStatus as any, updatedAt: new Date() }).where(eq(items.id, loan.itemId));

      // Auto-approve any pending return requests for this loan to avoid desync
      await tx.update(returnRequests).set({
        status: "approved",
        processedAt: new Date(),
        processedBy: adminId
      }).where(and(eq(returnRequests.loanId, loan.id), eq(returnRequests.status, "pending")));

      // Sync collection stock if needed
      const loanItem = await tx.query.items.findFirst({ where: and(eq(items.id, loan.itemId), isNull(items.deletedAt)) });
      if (loanItem?.bibliographyId) {
        await syncCollectionAvailableStock(tx, loanItem.bibliographyId);
      }

      // Auto-fulfill next reservation if any (only if returned as available)
      if (itemStatus === "available" && loanItem?.bibliographyId) {
        void reservationService.fulfillNextReservation(loanItem.bibliographyId);
      }

      // Calculate late fine or settle existing fine upon return
      const returnDateObj = new Date();
      const dueDateObj = new Date(loan.dueDate);
      returnDateObj.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);
      const isLate = returnDateObj > dueDateObj;

      const existingUnpaidFine = tx.query.fines
        ? await tx.query.fines.findFirst({
            where: and(
              eq(fines.loanId, loan.id),
              eq(fines.status, "unpaid"),
              isNull(fines.deletedAt)
            )
          })
        : null;

      if (isLate || existingUnpaidFine) {
        let fineAmount = 0;
        let diffDays = 0;

        if (isLate) {
          const diffTime = Math.abs(returnDateObj.getTime() - dueDateObj.getTime());
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const finePerDay = 500;
          fineAmount = diffDays * finePerDay;
        } else if (existingUnpaidFine) {
          fineAmount = Number(existingUnpaidFine.amount) || 0;
        }

        let fineId: string;

        if (existingUnpaidFine) {
          fineId = existingUnpaidFine.id;
          await tx.update(fines).set({
            amount: fineAmount.toString(),
            status: "paid",
            updatedAt: new Date()
          }).where(eq(fines.id, existingUnpaidFine.id));
        } else {
          const insertQuery = tx.insert(fines).values({
            loanId: loan.id,
            amount: fineAmount.toString(),
            status: "paid"
          });
          const inserted = typeof (insertQuery as any).returning === "function"
            ? await (insertQuery as any).returning()
            : await insertQuery;
          const newFine = Array.isArray(inserted) ? inserted[0] : inserted;
          fineId = newFine?.id || "fine-" + loan.id;
        }

        if (fineId && !fineId.startsWith("fine-")) {
          await tx.insert(transactions).values({
            fineId: fineId,
            paymentMethod: "cash",
            confirmedBy: adminId,
            paidAt: returnDateStr
          });
        }

        return {
          success: true,
          message: isLate
            ? `Buku berhasil dikembalikan dan denda keterlambatan sebesar Rp ${fineAmount.toLocaleString("id-ID")} (${diffDays} hari) telah dilunasi.`
            : `Buku berhasil dikembalikan dan denda sebesar Rp ${fineAmount.toLocaleString("id-ID")} telah dilunasi.`,
          fine: {
            id: fineId,
            overdueDays: diffDays,
            assessedAmount: fineAmount.toString(),
            status: "paid",
          }
        };
      }

      return { success: true, message: "Buku telah berhasil dikembalikan tepat waktu.", fine: null };
    });
  }

  /**
   * 5. Return Loan (Pengembalian Buku) - NEW
   */
  async approveReturnRequest(
    requestId: string,
    adminId: string,
    payload?: { condition?: string; staffName?: string; signature?: string; notes?: string }
  ) {
    const condition = payload?.condition || "good";
    const staffName = payload?.staffName || "Petugas Perpustakaan";
    const signature = payload?.signature || null;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptNo = `BA-RET-${dateStr}-${randomSuffix}`;

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
      if (!loan) {
        throw new Error("Data peminjaman tidak ditemukan");
      }

      // If loan is already returned (e.g. via direct return), approve the request idempotently
      if (loan.status === "returned") {
        await tx.update(returnRequests).set({
          status: "approved",
          processedAt: new Date(),
          processedBy: adminId
        }).where(eq(returnRequests.id, requestId));

        return {
          success: true,
          message: "Permintaan pengembalian disetujui (buku telah tercatat dikembalikan sebelumnya)."
        };
      }

      if (!["approved", "extended"].includes(loan.status)) {
        throw new Error("Buku tidak dalam status dipinjam atau data tidak ditemukan");
      }

      const returnDateStr = new Date().toISOString().split("T")[0];

      // Update loan status to returned with verification metadata
      await tx.update(loans).set({
        status: "returned",
        extensionStatus: "none",
        returnDate: returnDateStr,
        returnCondition: condition,
        returnStaffName: staffName,
        returnStaffSignature: signature,
        returnReceiptNo: receiptNo,
        notes: payload?.notes || loan.notes,
        updatedAt: new Date()
      }).where(eq(loans.id, loan.id));

      // Update item status based on condition
      const itemStatus = condition === "damaged" ? "damaged" : condition === "lost" ? "lost" : "available";
      await tx.update(items).set({ status: itemStatus as any, updatedAt: new Date() }).where(eq(items.id, loan.itemId));

      // Sync collection stock if needed
      const loanItem = await tx.query.items.findFirst({ where: and(eq(items.id, loan.itemId), isNull(items.deletedAt)) });
      if (loanItem?.bibliographyId) {
        await syncCollectionAvailableStock(tx, loanItem.bibliographyId);
      }

      // Auto-fulfill next reservation if any
      if (loanItem?.bibliographyId) {
        void reservationService.fulfillNextReservation(loanItem.bibliographyId);
      }

      // Calculate late fine or settle existing fine upon return
      const returnDateObj = new Date();
      const dueDateObj = new Date(loan.dueDate);
      returnDateObj.setHours(0, 0, 0, 0);
      dueDateObj.setHours(0, 0, 0, 0);
      const isLate = returnDateObj > dueDateObj;

      const existingUnpaidFine = await tx.query.fines.findFirst({
        where: and(
          eq(fines.loanId, loan.id),
          eq(fines.status, "unpaid"),
          isNull(fines.deletedAt)
        )
      });

      if (isLate || existingUnpaidFine) {
        let fineAmount = 0;
        let diffDays = 0;

        if (isLate) {
          const diffTime = Math.abs(returnDateObj.getTime() - dueDateObj.getTime());
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const finePerDay = 500;
          fineAmount = diffDays * finePerDay;
        } else if (existingUnpaidFine) {
          fineAmount = Number(existingUnpaidFine.amount) || 0;
        }

        let fineId: string;

        if (existingUnpaidFine) {
          fineId = existingUnpaidFine.id;
          await tx.update(fines).set({
            amount: fineAmount.toString(),
            status: "paid",
            updatedAt: new Date()
          }).where(eq(fines.id, existingUnpaidFine.id));
        } else {
          const insertQuery = tx.insert(fines).values({
            loanId: loan.id,
            amount: fineAmount.toString(),
            status: "paid"
          });
          const inserted = typeof (insertQuery as any).returning === "function"
            ? await (insertQuery as any).returning()
            : await insertQuery;
          const newFine = Array.isArray(inserted) ? inserted[0] : inserted;
          fineId = newFine?.id || "fine-" + loan.id;
        }

        if (fineId && !fineId.startsWith("fine-")) {
          await tx.insert(transactions).values({
            fineId: fineId,
            paymentMethod: "cash",
            confirmedBy: adminId,
            paidAt: returnDateStr
          });
        }

        // Update request status to approved
        await tx.update(returnRequests).set({ status: "approved", processedAt: new Date(), processedBy: adminId }).where(eq(returnRequests.id, requestId));

        return {
          success: true,
          message: isLate
            ? `Buku berhasil dikembalikan dan denda keterlambatan sebesar Rp ${fineAmount.toLocaleString("id-ID")} (${diffDays} hari) telah dilunasi.`
            : `Buku berhasil dikembalikan dan denda sebesar Rp ${fineAmount.toLocaleString("id-ID")} telah dilunasi.`
        };
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
    const validPending = requests.filter((r) => r.loan && ["approved", "extended"].includes(r.loan.status));
    return { success: true, data: validPending };
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

  async getLoanById(loanId: string) {
    const loan = await db.query.loans.findFirst({
      where: and(eq(loans.id, loanId), isNull(loans.deletedAt)),
      with: {
        item: {
          with: {
            bibliography: {
              with: {
                bibliographyAuthors: { with: { author: true } }
              }
            },
            location: true,
          }
        },
        member: {
          with: { user: true }
        },
        returnRequests: true,
      }
    });
    if (!loan) return null;

    if ((loan as any).item?.bibliography) {
      const bib = (loan as any).item.bibliography;
      const authorNames = Array.isArray(bib.bibliographyAuthors)
        ? bib.bibliographyAuthors.map((ba: any) => ba.author?.name).filter(Boolean).join(", ")
        : "";
      bib.author = authorNames || bib.author || bib.sor || "Penulis tidak tersedia";
    }
    return loan;
  }

  async generateReturnReceiptPdf(loanId: string, res: Response): Promise<void> {
    const loan = await this.getLoanById(loanId);
    if (!loan) {
      throw new Error("Peminjaman tidak ditemukan");
    }

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    // Kop Surat UMC
    doc.fontSize(14).font("Helvetica-Bold").text("UNIVERSITAS MUHAMMADIYAH CIREBON", { align: "center" });
    doc.fontSize(11).font("Helvetica-Bold").text("UPT PERPUSTAKAAN", { align: "center" });
    doc.fontSize(8.5).font("Helvetica").text("Jl. Tuparev No. 70 Cirebon 45153 — Telp: (0231) 209608 — perpustakaan@umc.ac.id", { align: "center" });
    doc.moveDown(0.5);

    // Divider
    doc.strokeColor("#0F172A").lineWidth(2).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.strokeColor("#64748B").lineWidth(0.5).moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();
    doc.moveDown(1.2);

    // Title
    doc.fontSize(12).font("Helvetica-Bold").text("TANDA TERIMA & BERITA ACARA PENGEMBALIAN BUKU", { align: "center" });
    doc.fontSize(9).font("Helvetica").text(`Nomor: ${loan.returnReceiptNo || "BA-RET-MANUAL"}`, { align: "center" });
    doc.moveDown(1);

    // Box data
    const startY = doc.y;
    doc.rect(40, startY, 515, 175).strokeColor("#CBD5E1").lineWidth(1).stroke();

    doc.fontSize(9).fillColor("#0F172A");
    const memberCodeVal =
      (loan.member as any)?.cardNumber ||
      (loan.member as any)?.nimNidn ||
      (loan.member as any)?.memberCode ||
      (loan.member as any)?.nim ||
      "-";

    const fields = [
      ["Nama Peminjam / Anggota", ": " + ((loan.member as any)?.user?.name || (loan.member as any)?.name || "-")],
      ["Nomor Induk / Kode Member", ": " + memberCodeVal],
      ["Judul Buku / Bahan Pustaka", ": " + ((loan.item as any)?.bibliography?.title || "-")],
      ["No. Inventaris / Kode Eksemplar", ": " + ((loan.item as any)?.inventoryCode || (loan.item as any)?.itemCode || "-")],
      ["Tanggal Peminjaman", ": " + (loan.loanDate || "-")],
      ["Batas Waktu Pengembalian", ": " + (loan.dueDate || "-")],
      ["Tanggal Realisasi Kembali", ": " + (loan.returnDate || "-")],
      ["Kondisi Fisik Saat Kembali", ": " + (loan.returnCondition === "damaged" ? "Rusak" : loan.returnCondition === "lost" ? "Hilang" : "Baik & Lengkap (Normal)")],
      ["Status Pengesahan", ": SAH / TELAH DIVERIFIKASI PETUGAS"],
    ];

    let fieldY = startY + 10;
    fields.forEach(([label, value]) => {
      doc.font("Helvetica-Bold").text(label, 50, fieldY, { width: 170 });
      doc.font("Helvetica").text(value, 220, fieldY, { width: 320 });
      fieldY += 17;
    });

    // Verification signature area
    const signY = fieldY + 30;

    // Member side
    doc.fontSize(9).font("Helvetica").text("Peminjam / Anggota,", 60, signY);
    doc.text((loan.member as any)?.user?.name || (loan.member as any)?.name || "Anggota Perpustakaan", 60, signY + 70);

    // Officer side
    doc.text(`Cirebon, ${loan.returnDate || new Date().toISOString().split("T")[0]}`, 360, signY);
    doc.text("Petugas Penerima Perpustakaan,", 360, signY + 12);

    if (loan.returnStaffSignature && loan.returnStaffSignature.startsWith("data:image")) {
      try {
        const base64Data = loan.returnStaffSignature.split(",")[1];
        const imgBuffer = Buffer.from(base64Data, "base64");
        doc.image(imgBuffer, 360, signY + 25, { width: 90, height: 35 });
      } catch {
        doc.text("[ Tanda Tangan Digital ]", 360, signY + 35);
      }
    } else {
      doc.text("[ Tanda Tangan Digital ]", 360, signY + 35);
    }

    doc.font("Helvetica-Bold").text(loan.returnStaffName || "Petugas Perpustakaan", 360, signY + 70);
    doc.font("Helvetica").fontSize(8).fillColor("#64748B").text("UPT Perpustakaan UMC", 360, signY + 82);

    // Official Digital Stamp
    doc.rect(230, signY + 15, 110, 50).strokeColor("#059669").lineWidth(1.5).stroke();
    doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#059669")
      .text("TERVERIFIKASI SAH", 235, signY + 22, { width: 100, align: "center" })
      .text("PERPUSTAKAAN UMC", 235, signY + 34, { width: 100, align: "center" })
      .text(loan.returnDate || "", 235, signY + 46, { width: 100, align: "center" });

    doc.end();
  }
}
