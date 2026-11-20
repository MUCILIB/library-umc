export interface ReturnReceiptData {
  receiptNo: string;
  returnDate: string;
  borrowerName: string;
  borrowerCode: string;
  borrowerType?: string;
  borrowerFaculty?: string;
  borrowerStudyProgram?: string;
  borrowerInstitution?: string;
  bookTitle: string;
  inventoryCode: string;
  callNumber?: string;
  loanDate: string;
  dueDate: string;
  condition: "good" | "damaged" | "lost" | string;
  fineAmount?: number;
  fineStatus?: string;
  staffName: string;
  signature?: string | null;
  notes?: string;
}

export interface LoanReceiptData {
  receiptNo: string;
  loanDate: string;
  dueDate: string;
  borrowerName: string;
  borrowerCode: string;
  borrowerType?: string;
  borrowerFaculty?: string;
  borrowerStudyProgram?: string;
  borrowerInstitution?: string;
  bookTitle: string;
  inventoryCode: string;
  callNumber?: string;
  loanDurationDays?: number;
  staffName: string;
  signature?: string | null;
  notes?: string;
  status?: string;
}

export function formatReceiptDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatReceiptDateTime(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now) + " WIB";
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return (
      new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d) + " WIB"
    );
  } catch {
    return dateStr;
  }
}

export function getConditionLabel(condition?: string): string {
  switch (condition) {
    case "damaged":
      return "Rusak";
    case "lost":
      return "Hilang";
    case "good":
    default:
      return "Baik & Lengkap";
  }
}

function escapeHtml(text?: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateThermalReceiptHtml(data: ReturnReceiptData): string {
  const safeReceiptNo = escapeHtml(data.receiptNo);
  const safeBorrowerName = escapeHtml(data.borrowerName);
  const safeBorrowerCode = escapeHtml(data.borrowerCode);
  const safeBorrowerType = escapeHtml(data.borrowerType || "Anggota Perpustakaan");
  const safeFaculty = escapeHtml(data.borrowerFaculty);
  const safeStudyProgram = escapeHtml(data.borrowerStudyProgram);
  const safeInstitution = escapeHtml(data.borrowerInstitution);
  const safeBookTitle = escapeHtml(data.bookTitle);
  const safeInventoryCode = escapeHtml(data.inventoryCode);
  const safeCallNumber = escapeHtml(data.callNumber || "-");
  const safeStaffName = escapeHtml(data.staffName || "Petugas Perpustakaan");
  const safeNotes = escapeHtml(data.notes);
  const conditionLabel = getConditionLabel(data.condition);
  const formattedLoanDate = formatReceiptDate(data.loanDate);
  const formattedDueDate = formatReceiptDate(data.dueDate);
  const formattedReturnDate = formatReceiptDate(data.returnDate);
  const formattedDateTime = formatReceiptDateTime(data.returnDate);
  const fineAmount = data.fineAmount || 0;
  const fineText =
    fineAmount > 0
      ? `Rp ${fineAmount.toLocaleString("id-ID")}`
      : "Rp 0";
  const fineStatusText =
    fineAmount > 0 ? escapeHtml(data.fineStatus || "LUNAS") : "BEBAS DENDA";

  const signatureHtml =
    data.signature && data.signature.startsWith("data:image")
      ? `<img src="${data.signature}" alt="Tanda Tangan" class="sig-img" />`
      : `<div class="sig-placeholder">[ Tanda Tangan Sah ]</div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Resi Pengembalian - ${safeReceiptNo}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 78mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 4mm 3mm;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }

    .header {
      text-align: center;
      margin-bottom: 6px;
    }
    .inst-title {
      font-size: 11.5px;
      font-weight: 900;
      letter-spacing: 0.3px;
    }
    .dept-title {
      font-size: 11px;
      font-weight: 800;
      margin-top: 1px;
    }
    .inst-address {
      font-size: 8.5px;
      color: #333;
      margin-top: 2px;
      line-height: 1.25;
    }

    .divider-double {
      border-top: 1.5px dashed #000;
      margin: 5px 0;
    }
    .divider-single {
      border-top: 1px dashed #444;
      margin: 4px 0;
    }

    .receipt-title {
      font-size: 11.5px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 0.5px;
      margin: 2px 0 1px 0;
    }
    .receipt-meta {
      font-size: 9px;
      text-align: center;
      color: #222;
      margin-bottom: 3px;
    }

    .section-title {
      font-size: 9.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 2px;
      margin-bottom: 2px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2px;
      font-size: 10px;
    }
    .col-label {
      width: 40%;
      color: #333;
      flex-shrink: 0;
    }
    .col-value {
      width: 60%;
      text-align: right;
      font-weight: bold;
      word-break: break-word;
    }

    .book-title-block {
      margin: 2px 0 3px 0;
      font-size: 10.5px;
      font-weight: 900;
      line-height: 1.3;
      text-align: left;
    }

    .badge-status {
      display: inline-block;
      border: 1px solid #000;
      padding: 1.5px 5px;
      font-size: 9px;
      font-weight: bold;
      margin-top: 2px;
    }

    .sig-container {
      margin-top: 6px;
      text-align: center;
    }
    .sig-img {
      max-height: 38px;
      max-width: 120px;
      margin: 3px auto;
      display: block;
    }
    .sig-placeholder {
      font-size: 9px;
      font-style: italic;
      color: #555;
      padding: 6px 0;
    }

    .stamp-box {
      border: 1.5px solid #000;
      padding: 3px 6px;
      margin: 4px auto;
      display: inline-block;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-align: center;
    }

    .footer {
      text-align: center;
      font-size: 8.5px;
      color: #333;
      margin-top: 6px;
      line-height: 1.3;
    }

    @media print {
      body {
        width: 80mm;
        padding: 3mm 3mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="inst-title">UNIVERSITAS MUHAMMADIYAH CIREBON</div>
    <div class="dept-title">UPT PERPUSTAKAAN</div>
    <div class="inst-address">
      Gedung Djuanda Kampus 2 UMC, Watubelah<br />
      Telp: (0231) 209608, 209617 — library.umc.ac.id
    </div>
  </div>

  <div class="divider-double"></div>

  <div class="receipt-title">RESI BUKTI PENGEMBALIAN BUKU</div>
  <div class="receipt-meta">
    No. Resi: <strong>${safeReceiptNo}</strong><br />
    Waktu: ${formattedDateTime}
  </div>

  <div class="divider-single"></div>

  <div class="section-title">DATA PEMINJAM</div>
  <div class="row">
    <span class="col-label">Nama:</span>
    <span class="col-value">${safeBorrowerName}</span>
  </div>
  <div class="row">
    <span class="col-label">NIM/ID:</span>
    <span class="col-value">${safeBorrowerCode}</span>
  </div>
  <div class="row">
    <span class="col-label">Kategori:</span>
    <span class="col-value">${safeBorrowerType}</span>
  </div>
  <div class="row">
    <span class="col-label">Fakultas:</span>
    <span class="col-value">${safeFaculty || "-"}</span>
  </div>${
    safeStudyProgram
      ? `
  <div class="row">
    <span class="col-label">Prodi:</span>
    <span class="col-value">${safeStudyProgram}</span>
  </div>`
      : ""
  }${
    safeInstitution
      ? `
  <div class="row">
    <span class="col-label">Institusi:</span>
    <span class="col-value">${safeInstitution}</span>
  </div>`
      : ""
  }

  <div class="divider-single"></div>

  <div class="section-title">BAHAN PUSTAKA</div>
  <div class="book-title-block">${safeBookTitle}</div>
  <div class="row">
    <span class="col-label">No. Inventaris:</span>
    <span class="col-value">${safeInventoryCode}</span>
  </div>
  <div class="row">
    <span class="col-label">Call Number:</span>
    <span class="col-value">${safeCallNumber}</span>
  </div>
  <div class="row">
    <span class="col-label">Tgl Pinjam:</span>
    <span class="col-value">${formattedLoanDate}</span>
  </div>
  <div class="row">
    <span class="col-label">Batas Kembali:</span>
    <span class="col-value">${formattedDueDate}</span>
  </div>
  <div class="row">
    <span class="col-label">Tgl Kembali:</span>
    <span class="col-value">${formattedReturnDate}</span>
  </div>
  <div class="row">
    <span class="col-label">Kondisi Buku:</span>
    <span class="col-value">[ ${conditionLabel} ]</span>
  </div>

  <div class="divider-single"></div>

  <div class="section-title">RINCIAN DENDA / BIAYA</div>
  <div class="row">
    <span class="col-label">Denda Keterlambatan:</span>
    <span class="col-value">${fineText}</span>
  </div>
  <div class="row">
    <span class="col-label">Status Denda:</span>
    <span class="col-value">${fineStatusText}</span>
  </div>

  <div class="divider-single"></div>

  <div class="section-title">VERIFIKASI PETUGAS</div>
  <div class="row">
    <span class="col-label">Penerima:</span>
    <span class="col-value">${safeStaffName}</span>
  </div>

  <div class="text-center" style="margin: 4px 0;">
    <div class="stamp-box">
      TERVERIFIKASI SAH<br />
      UPT PERPUSTAKAAN UMC
    </div>
  </div>

  <div class="sig-container">
    ${signatureHtml}
    <div style="font-size: 9px; font-weight: bold; margin-top: 2px;">${safeStaffName}</div>
    <div style="font-size: 8px; color: #444;">Petugas Sirkulasi Perpustakaan</div>
  </div>

  ${
    safeNotes
      ? `<div class="divider-single"></div>
         <div class="section-title">CATATAN:</div>
         <div style="font-size: 9px; line-height: 1.3;">${safeNotes}</div>`
      : ""
  }

  <div class="divider-double"></div>

  <div class="footer">
    Terima kasih telah mengembalikan koleksi tepat waktu.<br />
    Simpan struk resi ini sebagai tanda bukti sah.<br />
    *** PERPUSTAKAAN UMC ***
  </div>
</body>
</html>`;
}

export function printThermalReceipt(data: ReturnReceiptData): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const html = generateThermalReceiptHtml(data);

  // Buat invisible iframe untuk isolasi cetak
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("title", "Thermal Receipt Print Frame");

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn("[PrintReceipt] Iframe print gagal, fallback ke window.print:", e);
      window.print();
    } finally {
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {}
      }, 1500);
    }
  };

  const images = doc.images;
  if (images && images.length > 0) {
    let loaded = 0;
    const total = images.length;
    const onImgDone = () => {
      loaded++;
      if (loaded >= total) triggerPrint();
    };
    for (let i = 0; i < total; i++) {
      if (images[i].complete) {
        onImgDone();
      } else {
        images[i].addEventListener("load", onImgDone);
        images[i].addEventListener("error", onImgDone);
      }
    }
  } else {
    setTimeout(triggerPrint, 150);
  }
}

/**
 * Menghasilkan HTML struk sirkulasi peminjaman buku format thermal 80mm
 */
export function generateLoanThermalReceiptHtml(data: LoanReceiptData): string {
  const safeReceiptNo = escapeHtml(data.receiptNo);
  const safeBorrowerName = escapeHtml(data.borrowerName);
  const safeBorrowerCode = escapeHtml(data.borrowerCode);
  const safeBorrowerType = escapeHtml(data.borrowerType || "Anggota Perpustakaan");
  const safeFaculty = escapeHtml(data.borrowerFaculty);
  const safeStudyProgram = escapeHtml(data.borrowerStudyProgram);
  const safeInstitution = escapeHtml(data.borrowerInstitution);
  const safeBookTitle = escapeHtml(data.bookTitle);
  const safeInventoryCode = escapeHtml(data.inventoryCode);
  const safeCallNumber = escapeHtml(data.callNumber || "-");
  const safeStaffName = escapeHtml(data.staffName || "Petugas Perpustakaan");
  const safeNotes = escapeHtml(data.notes);
  const formattedLoanDate = formatReceiptDate(data.loanDate);
  const formattedDueDate = formatReceiptDate(data.dueDate);
  const formattedDateTime = formatReceiptDateTime(data.loanDate);

  const signatureHtml =
    data.signature && data.signature.startsWith("data:image")
      ? `<img src="${data.signature}" alt="Tanda Tangan" class="sig-img" />`
      : `<div class="sig-placeholder">[ Tanda Tangan Sah ]</div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Resi Peminjaman - ${safeReceiptNo}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 78mm;
      max-width: 100%;
      margin: 0 auto;
      padding: 4mm 3mm;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }

    .header {
      text-align: center;
      margin-bottom: 6px;
    }
    .inst-title {
      font-size: 11.5px;
      font-weight: 900;
      letter-spacing: 0.3px;
    }
    .dept-title {
      font-size: 11px;
      font-weight: 800;
      margin-top: 1px;
    }
    .inst-address {
      font-size: 8.5px;
      color: #333;
      margin-top: 2px;
      line-height: 1.25;
    }

    .divider-double {
      border-top: 1.5px dashed #000;
      margin: 5px 0;
    }
    .divider-single {
      border-top: 1px dashed #444;
      margin: 4px 0;
    }

    .receipt-title {
      font-size: 11.5px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 0.5px;
      margin: 2px 0 1px 0;
    }
    .receipt-meta {
      font-size: 9px;
      text-align: center;
      color: #222;
      margin-bottom: 3px;
    }

    .section-title {
      font-size: 9.5px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 2px;
      margin-bottom: 2px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2px;
      font-size: 10px;
    }
    .col-label {
      width: 40%;
      color: #333;
      flex-shrink: 0;
    }
    .col-value {
      width: 60%;
      text-align: right;
      font-weight: bold;
      word-break: break-word;
    }

    .book-title-block {
      margin: 2px 0 3px 0;
      font-size: 10.5px;
      font-weight: 900;
      line-height: 1.3;
      text-align: left;
    }

    .due-highlight-box {
      border: 1.5px solid #000;
      padding: 4px;
      margin: 4px 0;
      text-align: center;
      background: #fafafa;
    }
    .due-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .due-value {
      font-size: 12px;
      font-weight: 900;
      margin-top: 1px;
    }

    .stamp-box {
      border: 1.5px solid #000;
      padding: 3px 6px;
      margin: 4px auto;
      display: inline-block;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-align: center;
    }

    .sig-container {
      margin-top: 6px;
      text-align: center;
    }
    .sig-img {
      max-height: 38px;
      max-width: 120px;
      margin: 3px auto;
      display: block;
    }
    .sig-placeholder {
      font-size: 9px;
      font-style: italic;
      color: #555;
      padding: 6px 0;
    }

    .footer {
      text-align: center;
      font-size: 8.5px;
      color: #333;
      margin-top: 6px;
      line-height: 1.3;
    }

    @media print {
      body {
        width: 80mm;
        padding: 3mm 3mm;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="inst-title">UNIVERSITAS MUHAMMADIYAH CIREBON</div>
    <div class="dept-title">UPT PERPUSTAKAAN</div>
    <div class="inst-address">
      Gedung Djuanda Kampus 2 UMC, Watubelah<br />
      Telp: (0231) 209608, 209617 — library.umc.ac.id
    </div>
  </div>

  <div class="divider-double"></div>

  <div class="receipt-title">STRUK BUKTI PEMINJAMAN BUKU</div>
  <div class="receipt-meta">
    No. Transaksi: <strong>${safeReceiptNo}</strong><br />
    Waktu: ${formattedDateTime}
  </div>

  <div class="divider-single"></div>

  <div class="section-title">DATA PEMINJAM</div>
  <div class="row">
    <span class="col-label">Nama:</span>
    <span class="col-value">${safeBorrowerName}</span>
  </div>
  <div class="row">
    <span class="col-label">NIM/ID:</span>
    <span class="col-value">${safeBorrowerCode}</span>
  </div>
  <div class="row">
    <span class="col-label">Kategori:</span>
    <span class="col-value">${safeBorrowerType}</span>
  </div>
  <div class="row">
    <span class="col-label">Fakultas:</span>
    <span class="col-value">${safeFaculty || "-"}</span>
  </div>${
    safeStudyProgram
      ? `
  <div class="row">
    <span class="col-label">Prodi:</span>
    <span class="col-value">${safeStudyProgram}</span>
  </div>`
      : ""
  }${
    safeInstitution
      ? `
  <div class="row">
    <span class="col-label">Institusi:</span>
    <span class="col-value">${safeInstitution}</span>
  </div>`
      : ""
  }

  <div class="divider-single"></div>

  <div class="section-title">BAHAN PUSTAKA</div>
  <div class="book-title-block">${safeBookTitle}</div>
  <div class="row">
    <span class="col-label">No. Inventaris:</span>
    <span class="col-value">${safeInventoryCode}</span>
  </div>
  <div class="row">
    <span class="col-label">Call Number:</span>
    <span class="col-value">${safeCallNumber}</span>
  </div>
  <div class="row">
    <span class="col-label">Tgl Pinjam:</span>
    <span class="col-value">${formattedLoanDate}</span>
  </div>
  <div class="row">
    <span class="col-label">Status:</span>
    <span class="col-value">SEDANG DIPINJAM (AKTIF)</span>
  </div>

  <!-- Box Batas Waktu Pengembalian -->
  <div class="due-highlight-box">
    <div class="due-label">Batas Waktu Pengembalian</div>
    <div class="due-value">${formattedDueDate}</div>
  </div>

  <div class="divider-single"></div>

  <div class="section-title">KETENTUAN PEMINJAMAN:</div>
  <div style="font-size: 8.5px; line-height: 1.35; color: #222; margin-bottom: 4px;">
    1. Simpan struk ini sebagai bukti peminjaman yang sah.<br />
    2. Buku wajib dikembalikan tepat waktu sebelum tanggal batas kembali.<br />
    3. Keterlambatan dikenakan denda sesuai peraturan perpustakaan UMC.<br />
    4. Peminjam bertanggung jawab penuh atas keutuhan dan kebersihan koleksi.
  </div>

  <div class="divider-single"></div>

  <div class="section-title">VERIFIKASI SIRKULASI</div>
  <div class="row">
    <span class="col-label">Petugas:</span>
    <span class="col-value">${safeStaffName}</span>
  </div>

  <div class="text-center" style="margin: 4px 0;">
    <div class="stamp-box">
      TERCATAT SIRKULASI SAH<br />
      UPT PERPUSTAKAAN UMC
    </div>
  </div>

  <div class="sig-container">
    ${signatureHtml}
    <div style="font-size: 9px; font-weight: bold; margin-top: 2px;">${safeStaffName}</div>
    <div style="font-size: 8px; color: #444;">Pelayanan Sirkulasi Perpustakaan</div>
  </div>

  ${
    safeNotes
      ? `<div class="divider-single"></div>
         <div class="section-title">CATATAN:</div>
         <div style="font-size: 9px; line-height: 1.3;">${safeNotes}</div>`
      : ""
  }

  <div class="divider-double"></div>

  <div class="footer">
    Selamat membaca dan semoga ilmu yang dipelajari bermanfaat.<br />
    *** PERPUSTAKAAN UMC ***
  </div>
</body>
</html>`;
}

/**
 * Mencetak resi peminjaman buku ke printer thermal 80mm via invisible iframe
 */
export function printLoanThermalReceipt(data: LoanReceiptData): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const html = generateLoanThermalReceiptHtml(data);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  iframe.setAttribute("title", "Loan Thermal Receipt Print Frame");

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn("[PrintReceipt] Iframe loan print gagal, fallback ke window.print:", e);
      window.print();
    } finally {
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {}
      }, 1500);
    }
  };

  const images = doc.images;
  if (images && images.length > 0) {
    let loaded = 0;
    const total = images.length;
    const onImgDone = () => {
      loaded++;
      if (loaded >= total) triggerPrint();
    };
    for (let i = 0; i < total; i++) {
      if (images[i].complete) {
        onImgDone();
      } else {
        images[i].addEventListener("load", onImgDone);
        images[i].addEventListener("error", onImgDone);
      }
    }
  } else {
    setTimeout(triggerPrint, 150);
  }
}
