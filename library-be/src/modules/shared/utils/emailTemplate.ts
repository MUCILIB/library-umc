export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatContent(content: string): string {
  return escapeHtml(content).replace(/\n/g, "<br>");
}

function getLogoMarkup(): string {
  const logoUrl = process.env.EMAIL_LOGO_URL?.trim();
  if (logoUrl) {
    return `<img src="${escapeHtml(logoUrl)}" alt="Perpustakaan UMC" width="42" height="42"
      style="display:block;width:42px;height:42px;object-fit:contain;" />`;
  }
  return `<span style="font-size:18px;font-weight:700;color:#1e3a5f;letter-spacing:0.04em;">MUCILIB</span>`;
}

type InfoRow = {
  label: string;
  value: string;
};

type EmailAction = {
  label: string;
  url?: string;
};

// ──────────────────────────────────────────────────────────────
// Loan Confirmation Email
// ──────────────────────────────────────────────────────────────
export function buildLoanEmail(opts: {
  name: string;
  bookTitle: string;
  tanggalPinjam: string;
  tanggalKembali: string;
}): string {
  const { name, bookTitle, tanggalPinjam, tanggalKembali } = opts;
  return buildBaseTemplate({
    badgeText: "Konfirmasi Peminjaman",
    badgeColor: "#1e3a5f",
    title: `Peminjaman Berhasil, ${escapeHtml(name)}`,
    summary: "Berikut adalah detail peminjaman buku Anda.",
    rows: [
      { label: "Judul Buku", value: bookTitle },
      { label: "Tanggal Pinjam", value: tanggalPinjam },
      { label: "Batas Pengembalian", value: tanggalKembali },
    ],
    infoBox: {
      text: "Pastikan buku dikembalikan sebelum batas waktu agar tidak dikenakan denda.",
      color: "#1e3a5f",
      bg: "#f0f4fa",
      border: "#c7d8ef",
    },
    footerNote: "Terima kasih telah menggunakan layanan Perpustakaan UMC.",
  });
}

// ──────────────────────────────────────────────────────────────
// Fine Notification Email
// ──────────────────────────────────────────────────────────────
export function buildFineEmail(opts: {
  name: string;
  bookTitle: string;
  amount: number;
  overdueDays?: number;
  isBookReturned?: boolean;
}): string {
  const { name, bookTitle, amount, overdueDays, isBookReturned } = opts;
  const rows: InfoRow[] = [
    { label: "Judul Buku", value: bookTitle },
    { label: "Jumlah Denda", value: `Rp ${amount.toLocaleString("id-ID")}` },
  ];
  if (overdueDays !== undefined) {
    rows.push({ label: "Keterlambatan", value: `${overdueDays} hari` });
  }

  const summary = isBookReturned
    ? `Halo ${escapeHtml(name)}, buku sudah dikembalikan namun denda keterlambatan Anda masih belum dilunasi.`
    : `Halo ${escapeHtml(name)}, sistem mendeteksi keterlambatan pengembalian buku.`;

  const infoBoxText = isBookReturned
    ? "Buku sudah kembali ke perpustakaan. Mohon segera lunasi denda di loket administrasi untuk mengaktifkan kembali hak pinjam Anda."
    : "Segera kembalikan buku dan lunasi denda di loket perpustakaan untuk menghindari akumulasi denda lebih lanjut.";

  return buildBaseTemplate({
    badgeText: isBookReturned ? "Tagihan Denda" : "Notifikasi Denda",
    badgeColor: "#9b1c1c",
    title: isBookReturned ? `Tagihan Denda Belum Lunas` : `Terdapat Denda pada Akun Anda`,
    summary,
    rows,
    infoBox: {
      text: infoBoxText,
      color: "#7f1d1d",
      bg: "#fef2f2",
      border: "#fca5a5",
    },
    footerNote: "Abaikan pesan ini jika denda sudah dibayarkan.",
  });
}

// ──────────────────────────────────────────────────────────────
// Reservation Ready Email
// ──────────────────────────────────────────────────────────────
export function buildReservationEmail(opts: {
  name: string;
  bookTitle: string;
  deadline?: string;
}): string {
  const { name, bookTitle, deadline } = opts;
  const rows: InfoRow[] = [{ label: "Judul Buku", value: bookTitle }];
  if (deadline) {
    rows.push({ label: "Tersedia Hingga", value: deadline });
  }

  return buildBaseTemplate({
    badgeText: "Reservasi Tersedia",
    badgeColor: "#14532d",
    title: `Buku Reservasi Anda Sudah Bisa Diambil`,
    summary: `Halo ${escapeHtml(name)}, buku yang Anda reservasi kini sudah tersedia.`,
    rows,
    infoBox: {
      text: "Jika tidak diambil dalam 3 hari, reservasi akan dibatalkan secara otomatis.",
      color: "#14532d",
      bg: "#f0fdf4",
      border: "#86efac",
    },
    footerNote: "Terima kasih telah menggunakan layanan reservasi Perpustakaan UMC.",
  });
}

// ──────────────────────────────────────────────────────────────
// Booking Canceled Email (Auto-Cancel 20 Menit / Manual Cancel)
// ──────────────────────────────────────────────────────────────
export function buildBookingCanceledEmail(opts: {
  name: string;
  bookTitle: string;
  reason?: string;
}): string {
  const { name, bookTitle, reason } = opts;
  const rows: InfoRow[] = [
    { label: "Judul Buku", value: bookTitle },
    { label: "Status", value: "Dibatalkan" },
  ];
  if (reason) {
    rows.push({ label: "Keterangan", value: reason });
  }

  return buildBaseTemplate({
    badgeText: "Pemesanan Dibatalkan",
    badgeColor: "#991b1b",
    title: "Pemesanan Buku Dibatalkan",
    summary: `Halo ${escapeHtml(name)}, pemesanan buku Anda telah dibatalkan.`,
    rows,
    infoBox: {
      text: "Buku telah dikembalikan ke status tersedia untuk peminjam lain. Anda dapat melakukan pemesanan ulang jika masih membutuhkan buku tersebut.",
      color: "#7f1d1d",
      bg: "#fef2f2",
      border: "#fca5a5",
    },
    footerNote: "Perpustakaan Universitas Muhammadiyah Cirebon",
  });
}

// ──────────────────────────────────────────────────────────────
// Reset Password Email
// ──────────────────────────────────────────────────────────────
export function buildResetPasswordEmail(opts: {
  name: string;
  resetUrl: string;
}): string {
  const { name, resetUrl } = opts;
  const safeUrl = escapeHtml(resetUrl);
  const safeName = escapeHtml(name);

  return buildShell(`
    <tr>
      <td style="padding:0 0 12px;">
        <span style="display:inline-block;background:#7c3aed;color:#ffffff;
          font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
          padding:3px 10px;border-radius:4px;">Reset Password</span>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 6px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
        Permintaan Reset Password
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
        Halo <strong>${safeName}</strong>, kami menerima permintaan untuk mereset password akun Anda
        di Perpustakaan UMC.
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 20px;text-align:center;">
        <a href="${safeUrl}"
          style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;
          font-weight:700;padding:14px 32px;border-radius:8px;font-size:15px;
          letter-spacing:0.02em;">
          Reset Password Saya
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="border-collapse:collapse;background:#faf5ff;
          border:1px solid #ddd6fe;border-radius:8px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:#5b21b6;line-height:1.6;">
              ⏱️ <strong>Link ini hanya berlaku selama 1 jam</strong> sejak email ini dikirim.
              Setelah itu, Anda perlu mengajukan permintaan reset password baru.
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="border-collapse:collapse;background:#fef2f2;
          border:1px solid #fca5a5;border-radius:8px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:#7f1d1d;line-height:1.6;">
              🔒 Jika Anda <strong>tidak merasa meminta reset password</strong>, abaikan email ini.
              Password Anda tidak akan berubah dan akun Anda tetap aman.
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 16px;font-size:12px;color:#9ca3af;line-height:1.6;">
        Atau salin link berikut ke browser Anda:<br/>
        <span style="color:#7c3aed;word-break:break-all;">${safeUrl}</span>
      </td>
    </tr>
    ${buildFooter("Jika Anda tidak meminta reset password, hubungi administrator perpustakaan.")}
  `);
}

// ──────────────────────────────────────────────────────────────
// Generic / Announcement Email
// ──────────────────────────────────────────────────────────────
export function buildEmailTemplate(opts: {
  title: string;
  headline: string;
  intro?: string;
  content: string;
  footerNote?: string;
  accent?: string;
  action?: EmailAction;
}): string {
  const {
    title,
    intro,
    content,
    footerNote,
    accent = "#1e3a5f",
    action,
  } = opts;

  const actionHtml = action?.url
    ? `<tr><td style="padding-top:24px;">
        <a href="${escapeHtml(action.url)}"
          style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;
          font-weight:600;padding:12px 24px;border-radius:6px;font-size:14px;">
          ${escapeHtml(action.label)}
        </a>
      </td></tr>`
    : "";

  return buildShell(`
    <tr>
      <td style="padding:0 0 10px;">
        <span style="display:inline-block;background:${accent};color:#ffffff;
          font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
          padding:3px 10px;border-radius:4px;">${escapeHtml(title)}</span>
      </td>
    </tr>
    ${intro ? `<tr><td style="padding:0 0 18px;font-size:15px;color:#374151;line-height:1.7;">${escapeHtml(intro)}</td></tr>` : ""}
    <tr>
      <td style="font-size:14px;color:#4b5563;line-height:1.8;">${content}</td>
    </tr>
    ${actionHtml}
    ${buildFooter(footerNote)}
  `);
}

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────

function buildBaseTemplate(opts: {
  badgeText: string;
  badgeColor: string;
  title: string;
  summary: string;
  rows: InfoRow[];
  infoBox: { text: string; color: string; bg: string; border: string };
  footerNote: string;
}): string {
  const { badgeText, badgeColor, title, summary, rows, infoBox, footerNote } = opts;

  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="border-collapse:collapse;">
          <tr>
            <td style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;
              letter-spacing:0.06em;width:40%;vertical-align:top;padding-right:8px;">
              ${escapeHtml(r.label)}
            </td>
            <td style="font-size:15px;font-weight:600;color:#111827;vertical-align:top;">
              ${escapeHtml(r.value)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    )
    .join("");

  return buildShell(`
    <tr>
      <td style="padding:0 0 12px;">
        <span style="display:inline-block;background:${badgeColor};color:#ffffff;
          font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
          padding:3px 10px;border-radius:4px;">${escapeHtml(badgeText)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 6px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
        ${escapeHtml(title)}
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
        ${escapeHtml(summary)}
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="border-collapse:collapse;">
                ${rowsHtml}
                <tr><td style="height:4px;"></td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 4px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="border-collapse:collapse;background:${infoBox.bg};
          border:1px solid ${infoBox.border};border-radius:8px;">
          <tr>
            <td style="padding:14px 16px;font-size:13px;color:${infoBox.color};line-height:1.6;">
              ${escapeHtml(infoBox.text)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${buildFooter(footerNote)}
  `);
}

function buildShell(bodyRows: string): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background:#f9fafb;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:600px;width:100%;border-collapse:collapse;">

          <!-- HEADER -->
          <tr>
            <td style="padding:0 0 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="border-collapse:collapse;">
                <tr>
                  <td style="vertical-align:middle;">${getLogoMarkup()}</td>
                  <td style="vertical-align:middle;padding-left:12px;">
                    <div style="font-size:13px;font-weight:700;color:#1e3a5f;letter-spacing:0.04em;">
                      Perpustakaan UMC
                    </div>
                    <div style="font-size:11px;color:#9ca3af;margin-top:1px;">
                      Universitas Muhammadiyah Cirebon
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CARD -->
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="border-collapse:collapse;">
                ${bodyRows}
              </table>
            </td>
          </tr>

          <!-- BOTTOM SPACER -->
          <tr><td style="height:24px;"></td></tr>

          <!-- DISCLAIMER -->
          <tr>
            <td align="center" style="font-size:11px;color:#d1d5db;line-height:1.6;">
              Pesan ini dikirim secara otomatis. Mohon jangan balas email ini.<br/>
              &copy; ${year} Perpustakaan Universitas Muhammadiyah Cirebon
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildFooter(footerNote?: string): string {
  if (!footerNote) return "";
  return `
  <tr>
    <td style="padding-top:20px;border-top:1px solid #f3f4f6;margin-top:20px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
        ${escapeHtml(footerNote)}
      </p>
    </td>
  </tr>`;
}
