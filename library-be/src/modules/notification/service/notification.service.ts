import { sendEmail } from "../../../config/mailer";
import {
  buildLoanEmail,
  buildFineEmail,
  buildReservationEmail,
  buildBookingCanceledEmail,
  buildResetPasswordEmail,
  buildEmailTemplate,
  escapeHtml,
  formatContent,
} from "../../shared/utils/emailTemplate";

export class NotificationService {
  async sendEmail(to: string, subject: string, html: string) {
    try {
      await sendEmail(to, subject, html);
    } catch (error) {
      console.error("[NotificationService] Failed to send email:", error);
      throw error;
    }
  }

  async sendLoansNotification(
    email: string,
    name: string,
    bookTitle: string,
    tanggalPengembalian: string,
    tanggalPinjam?: string
  ) {
    try {
      const subject =
        "Peminjaman Buku Berhasil — Perpustakaan Universitas Muhammadiyah Cirebon";
      const html = buildLoanEmail({
        name,
        bookTitle,
        tanggalPinjam: tanggalPinjam ?? new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
        tanggalKembali: tanggalPengembalian,
      });
      await this.sendEmail(email, subject, html);
    } catch (error) {
      console.error(
        "[NotificationService] Failed to send loan notification:",
        error
      );
      throw error;
    }
  }

  async sendFinesNotification(
    email: string,
    name: string,
    amount: number,
    bookTitle: string,
    overdueDays?: number,
    isBookReturned?: boolean
  ) {
    try {
      const subject = isBookReturned
        ? `⚠️ Tagihan Denda Belum Lunas — Perpustakaan UMC`
        : `Notifikasi Denda Keterlambatan ${overdueDays ? `(Hari ke-${overdueDays}) ` : ''}— Perpustakaan UMC`;
      const html = buildFineEmail({ name, bookTitle, amount, overdueDays, isBookReturned });
      await this.sendEmail(email, subject, html);
    } catch (error) {
      console.error(
        "[NotificationService] Failed to send fine notification:",
        error
      );
      throw error;
    }
  }

  async sendReservationFulfilledNotification(
    email: string,
    name: string,
    bookTitle: string,
    deadline?: string
  ) {
    try {
      const subject = "Reservasi Buku Tersedia — Perpustakaan UMC";
      const html = buildReservationEmail({ name, bookTitle, deadline });
      await this.sendEmail(email, subject, html);
    } catch (error) {
      console.error(
        "[NotificationService] Failed to send reservation notification:",
        error
      );
      throw error;
    }
  }

  async sendBookingCanceledNotification(
    email: string,
    name: string,
    bookTitle: string,
    reason?: string
  ) {
    try {
      const subject = "Pemesanan Buku Dibatalkan — Perpustakaan UMC";
      const html = buildBookingCanceledEmail({ name, bookTitle, reason });
      await this.sendEmail(email, subject, html);
    } catch (error) {
      console.error(
        "[NotificationService] Failed to send booking cancel notification:",
        error
      );
    }
  }

  async sendResetPasswordEmail(
    email: string,
    name: string,
    resetUrl: string
  ) {
    try {
      const subject = "Reset Password — Perpustakaan Universitas Muhammadiyah Cirebon";
      const html = buildResetPasswordEmail({ name, resetUrl });
      await this.sendEmail(email, subject, html);
    } catch (error) {
      console.error(
        "[NotificationService] Failed to send reset password email:",
        error
      );
      throw error;
    }
  }
}
