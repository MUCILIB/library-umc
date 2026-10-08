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
    return `<td style="vertical-align:middle;padding-right:12px;width:38px;">
      <img src="${escapeHtml(logoUrl)}" alt="Logo UMC" width="38" height="38"
        style="display:block;width:38px;height:38px;object-fit:contain;border:0;" />
    </td>`;
  }
  return "";
}

type InfoRow = {
  label: string;
  value: string;
};

type EmailAction = {
  label: string;
  url: string;
};

// ──────────────────────────────────────────────────────────────
// Loan Confirmation Email (Minimalist Editorial)
// ──────────────────────────────────────────────────────────────
export function buildLoanEmail(opts: {
  name: string;
  bookTitle: string;
  tanggalPinjam: string;
  tanggalKembali: string;
}): string {
  const { name, bookTitle, tanggalPinjam, tanggalKembali } = opts;
  return buildEditorialShell({
    category: "Sirkulasi Buku",
    headline: "Peminjaman Berhasil",
    recipient: name,
    lead: "Peminjaman eksemplar buku berikut telah dicatat ke akun anggota Anda:",
    rows: [
      { label: "Judul Buku", value: bookTitle },
      { label: "Tanggal Pinjam", value: tanggalPinjam },
      { label: "Batas Pengembalian", value: tanggalKembali },
    ],
    notice: "Pengembalian melewati batas waktu akan dikenakan denda sesuai ketentuan sirkulasi perpustakaan.",
    footerInfo: "Simpan email ini sebagai bukti transaksi peminjaman mandiri.",
  });
}

// ──────────────────────────────────────────────────────────────
// Fine Notification Email (Minimalist Editorial)
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
    { label: "Total Denda", value: `Rp ${amount.toLocaleString("id-ID")}` },
  ];
  if (overdueDays !== undefined) {
    rows.push({ label: "Keterlambatan", value: `${overdueDays} hari` });
  }

  const lead = isBookReturned
    ? "Eksemplar telah diterima kembali oleh perpustakaan. Terdapat kewajiban denda keterlambatan yang belum diselesaikan:"
    : "Masa pinjam buku telah melampaui batas waktu pengembalian yang ditentukan:";

  const notice = isBookReturned
    ? "Pembayaran dapat diselesaikan langsung di meja sirkulasi untuk memulihkan hak peminjaman akun."
    : "Harap segera mengembalikan buku dan menyelesaikan denda di meja sirkulasi.";

  return buildEditorialShell({
    category: isBookReturned ? "Kewajiban Denda" : "Pemberitahuan Sirkulasi",
    headline: isBookReturned ? "Tagihan Denda Keterlambatan" : "Keterlambatan Pengembalian",
    recipient: name,
    lead,
    rows,
    notice,
    footerInfo: "Abaikan pemberitahuan ini jika Anda telah menyelesaikan administrasi di meja sirkulasi.",
  });
}

// ──────────────────────────────────────────────────────────────
// Reservation Ready Email (Minimalist Editorial)
// ──────────────────────────────────────────────────────────────
export function buildReservationEmail(opts: {
  name: string;
  bookTitle: string;
  deadline?: string;
}): string {
  const { name, bookTitle, deadline } = opts;
  const rows: InfoRow[] = [{ label: "Judul Buku", value: bookTitle }];
  if (deadline) {
    rows.push({ label: "Batas Waktu Pengambilan", value: deadline });
  }

  return buildEditorialShell({
    category: "Layanan Reservasi",
    headline: "Buku Siap Diambil",
    recipient: name,
    lead: "Buku yang Anda reservasi telah tersedia dan siap diambil di meja sirkulasi:",
    rows,
    notice: "Eksemplar disimpan hingga batas waktu yang tertera. Setelah batas waktu berakhir, reservasi dibatalkan otomatis dan dialihkan ke pemustaka berikutnya.",
    footerInfo: "Tunjukkan kartu tanda mahasiswa atau identitas anggota saat pengambilan.",
  });
}

// ──────────────────────────────────────────────────────────────
// Booking Canceled Email (Minimalist Editorial)
// ──────────────────────────────────────────────────────────────
export function buildBookingCanceledEmail(opts: {
  name: string;
  bookTitle: string;
  reason?: string;
}): string {
  const { name, bookTitle, reason } = opts;
  const rows: InfoRow[] = [
    { label: "Judul Buku", value: bookTitle },
    { label: "Status Reservasi", value: "Dibatalkan" },
  ];
  if (reason) {
    rows.push({ label: "Keterangan", value: reason });
  }

  return buildEditorialShell({
    category: "Pembaruan Status",
    headline: "Reservasi Dibatalkan",
    recipient: name,
    lead: "Reservasi buku berikut telah dibatalkan oleh sistem perpustakaan:",
    rows,
    notice: "Eksemplar telah dikembalikan ke status tersedia di katalog. Anda dapat melakukan pemesanan ulang melalui portal katalog bila masih membutuhkan.",
    footerInfo: "Layanan sirkulasi mandiri Perpustakaan UMC.",
  });
}

// ──────────────────────────────────────────────────────────────
// Reset Password Email (Minimalist Editorial)
// ──────────────────────────────────────────────────────────────
export function buildResetPasswordEmail(opts: {
  name: string;
  resetUrl: string;
}): string {
  const { name, resetUrl } = opts;
  return buildEditorialShell({
    category: "Keamanan Akun",
    headline: "Atur Ulang Kata Sandi",
    recipient: name,
    lead: "Permintaan pengaturan ulang kata sandi telah diajukan untuk akun Perpustakaan UMC Anda.",
    action: {
      label: "Atur Ulang Kata Sandi",
      url: resetUrl,
    },
    notice: "Tautan keamanan ini berlaku selama 60 menit. Jika Anda tidak mengajukan permintaan ini, tidak ada tindakan yang diperlukan dan akun tetap terlindungi.",
    footerInfo: "Demi keamanan akun, jangan bagikan tautan ini kepada pihak lain.",
  });
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
  const { title, headline, intro, content, footerNote, action } = opts;

  return buildEditorialShell({
    category: title,
    headline,
    lead: intro || "",
    freeformHtml: content,
    action,
    footerInfo: footerNote,
  });
}

// ──────────────────────────────────────────────────────────────
// Core Shell: High-End Warm Monochrome Editorial
// ──────────────────────────────────────────────────────────────

interface EditorialShellOpts {
  category: string;
  headline: string;
  recipient?: string;
  lead: string;
  rows?: InfoRow[];
  notice?: string;
  action?: EmailAction;
  freeformHtml?: string;
  footerInfo?: string;
}

function buildEditorialShell(opts: EditorialShellOpts): string {
  const year = new Date().getFullYear();
  const safeCategory = escapeHtml(opts.category);
  const safeHeadline = escapeHtml(opts.headline);
  const safeLead = escapeHtml(opts.lead);

  // Rows as clean editorial key-value list with thin crisp hairpins
  let dataTableHtml = "";
  if (opts.rows && opts.rows.length > 0) {
    const rowItems = opts.rows
      .map(
        (r, idx) => `
        <tr>
          <td style="padding:14px 0;${idx < (opts.rows?.length ?? 1) - 1 ? "border-bottom:1px solid #EDEDEC;" : ""}">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;font-weight:500;color:#787774;text-transform:uppercase;letter-spacing:0.04em;width:34%;vertical-align:top;padding-right:12px;">
                  ${escapeHtml(r.label)}
                </td>
                <td style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#191919;line-height:1.5;vertical-align:top;">
                  ${escapeHtml(r.value)}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      )
      .join("");

    dataTableHtml = `
      <tr>
        <td style="padding:20px 0 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border-top:1px solid #191919;border-bottom:1px solid #191919;">
            ${rowItems}
          </table>
        </td>
      </tr>`;
  }

  // Clean, sharp action button (editorial black on white)
  let actionHtml = "";
  if (opts.action) {
    const safeUrl = escapeHtml(opts.action.url);
    const safeLabel = escapeHtml(opts.action.label);
    actionHtml = `
      <tr>
        <td style="padding:16px 0 28px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
            <tr>
              <td align="left" style="background:#191919;border-radius:4px;">
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                  style="display:inline-block;padding:12px 24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.02em;color:#FFFFFF;text-decoration:none;border-radius:4px;">
                  ${safeLabel}
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#9B9A97;line-height:1.5;word-break:break-all;">
            Jika tombol tidak dapat diklik, gunakan tautan ini:<br>
            <span style="color:#5A5A58;">${safeUrl}</span>
          </p>
        </td>
      </tr>`;
  }

  // Notice block with muted natural tone (no neon, no heavy rounded pills)
  let noticeHtml = "";
  if (opts.notice) {
    noticeHtml = `
      <tr>
        <td style="padding:0 0 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
            style="border-collapse:collapse;background:#F7F6F3;border-left:2px solid #2F3437;padding:14px 16px;">
            <tr>
              <td style="padding:12px 14px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#37352F;line-height:1.6;">
                ${escapeHtml(opts.notice)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  const freeform = opts.freeformHtml
    ? `<tr><td style="padding:12px 0 24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;color:#37352F;line-height:1.7;">${opts.freeformHtml}</td></tr>`
    : "";

  const greeting = opts.recipient
    ? `<p style="margin:0 0 10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:500;color:#191919;">Yth. ${escapeHtml(opts.recipient)},</p>`
    : "";

  const footerText = opts.footerInfo
    ? `<p style="margin:0 0 10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#787774;line-height:1.5;">${escapeHtml(opts.footerInfo)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeHeadline}</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F6F3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#191919;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F7F6F3;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:540px;width:100%;border-collapse:collapse;text-align:left;">
          
          <!-- BRAND IDENTIFIER (Subtle, Document Style) -->
          <tr>
            <td style="padding:0 0 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  ${getLogoMarkup()}
                  <td style="vertical-align:middle;">
                    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;color:#191919;text-transform:uppercase;">
                      Perpustakaan UMC
                    </div>
                    <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#787774;margin-top:2px;">
                      Universitas Muhammadiyah Cirebon
                    </div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.06em;color:#787774;text-transform:uppercase;">
                      ${safeCategory}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN EDITORIAL CARD -->
          <tr>
            <td style="background-color:#FFFFFF;border:1px solid #EAEAEA;border-radius:6px;padding:36px 36px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                
                <!-- HEADLINE (Refined, High Contrast) -->
                <tr>
                  <td style="padding:0 0 18px;">
                    <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:24px;font-weight:600;letter-spacing:-0.02em;line-height:1.25;color:#191919;">
                      ${safeHeadline}
                    </h1>
                  </td>
                </tr>

                <!-- RECIPIENT & LEAD PROSE -->
                <tr>
                  <td style="padding:0 0 8px;">
                    ${greeting}
                    <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#4A4946;">
                      ${safeLead}
                    </p>
                  </td>
                </tr>

                <!-- DATA TABLE -->
                ${dataTableHtml}

                <!-- ACTION BUTTON (IF APPLICABLE) -->
                ${actionHtml}

                <!-- NOTICE / ADVISORY -->
                ${noticeHtml}

                <!-- FREEFORM -->
                ${freeform}

              </table>
            </td>
          </tr>

          <!-- FOOTER / IMPRINT -->
          <tr>
            <td style="padding:28px 12px 0;text-align:left;">
              ${footerText}
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#9B9A97;line-height:1.6;">
                Pemberitahuan resmi sistem sirkulasi mandiri.<br>
                &copy; ${year} Perpustakaan Universitas Muhammadiyah Cirebon.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
