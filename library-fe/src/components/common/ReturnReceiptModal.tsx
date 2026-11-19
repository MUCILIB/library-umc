import React from "react";
import { Printer, FileDown, ShieldCheck } from "lucide-react";
import Modal from "@/components/ui/modal";
import type { Loan } from "@/services/loanService";
import {
  type ReturnReceiptData,
  printThermalReceipt,
  formatReceiptDate,
  formatReceiptDateTime,
  getConditionLabel,
} from "@/utils/printReceipt";

export function extractReceiptDataFromLoan(
  loan: Loan,
  overrides?: Partial<ReturnReceiptData>
): ReturnReceiptData {
  const member = loan.member as any;
  const bib = loan.item?.bibliography;

  const borrowerName =
    overrides?.borrowerName ||
    (typeof member?.user?.name === "string" ? member.user.name : undefined) ||
    (typeof member?.name === "string" ? member.name : undefined) ||
    loan.memberName ||
    "Anggota Perpustakaan";

  const borrowerCode =
    overrides?.borrowerCode ||
    (typeof member?.cardNumber === "string" ? member.cardNumber : undefined) ||
    (typeof member?.nimNidn === "string" ? member.nimNidn : undefined) ||
    (typeof member?.memberCode === "string" ? member.memberCode : undefined) ||
    loan.memberNim ||
    "-";

  const rawType =
    overrides?.borrowerType ||
    (typeof member?.type === "string" ? member.type : undefined) ||
    (typeof member?.memberType === "string" ? member.memberType : undefined) ||
    "Mahasiswa";

  const borrowerType =
    rawType === "student" ? "Mahasiswa" :
    rawType === "lecturer" ? "Dosen" :
    rawType === "staff" ? "Tenaga Kependidikan" :
    rawType === "external" ? "Anggota Luar" :
    rawType;

  const borrowerFaculty =
    overrides?.borrowerFaculty ||
    (typeof member?.faculty === "string" && member.faculty.trim() ? member.faculty : undefined) ||
    (typeof (loan as any).memberFaculty === "string" ? (loan as any).memberFaculty : undefined);

  const borrowerStudyProgram =
    overrides?.borrowerStudyProgram ||
    (typeof member?.studyProgram === "string" && member.studyProgram.trim() ? member.studyProgram : undefined) ||
    (typeof (loan as any).memberStudyProgram === "string" ? (loan as any).memberStudyProgram : undefined);

  const borrowerInstitution =
    overrides?.borrowerInstitution ||
    (typeof member?.institution === "string" && member.institution.trim() ? member.institution : undefined);

  const bookTitle =
    overrides?.bookTitle ||
    bib?.title ||
    loan.bibliographyTitle ||
    "Buku Koleksi Perpustakaan";

  const rawItem = loan.item as Record<string, unknown> | undefined;
  const inventoryCode: string =
    overrides?.inventoryCode ||
    (typeof rawItem?.inventoryCode === "string" ? rawItem.inventoryCode : undefined) ||
    (typeof rawItem?.itemCode === "string" ? rawItem.itemCode : undefined) ||
    (typeof rawItem?.barcode === "string" ? rawItem.barcode : undefined) ||
    (typeof (loan as any).itemCode === "string" ? (loan as any).itemCode : undefined) ||
    "-";

  const callNumber: string =
    overrides?.callNumber ||
    bib?.callNumber ||
    "-";

  const receiptNo =
    overrides?.receiptNo ||
    loan.returnReceiptNo ||
    `BA-RET-${loan.id.slice(0, 8).toUpperCase()}`;

  const staffName =
    overrides?.staffName ||
    loan.returnStaffName ||
    "Petugas Perpustakaan";

  const condition =
    overrides?.condition ||
    loan.returnCondition ||
    "good";

  const signature =
    overrides?.signature !== undefined
      ? overrides.signature
      : loan.returnStaffSignature || null;

  const notes =
    overrides?.notes !== undefined
      ? overrides.notes
      : loan.notes;

  const fineAmount =
    overrides?.fineAmount !== undefined
      ? overrides.fineAmount
      : typeof loan.fine === "number"
      ? loan.fine
      : 0;

  return {
    receiptNo,
    returnDate: overrides?.returnDate || loan.returnDate || new Date().toISOString(),
    borrowerName,
    borrowerCode,
    borrowerType,
    borrowerFaculty,
    borrowerStudyProgram,
    borrowerInstitution,
    bookTitle,
    inventoryCode,
    callNumber,
    loanDate: overrides?.loanDate || loan.loanDate,
    dueDate: overrides?.dueDate || loan.dueDate,
    condition,
    fineAmount,
    fineStatus: fineAmount > 0 ? "LUNAS" : "BEBAS DENDA",
    staffName,
    signature,
    notes,
  };
}

export interface ReturnReceiptCardProps {
  data: ReturnReceiptData;
  className?: string;
}

export const ReturnReceiptCard: React.FC<ReturnReceiptCardProps> = ({ data, className = "" }) => {
  const formattedLoanDate = formatReceiptDate(data.loanDate);
  const formattedDueDate = formatReceiptDate(data.dueDate);
  const formattedReturnDate = formatReceiptDate(data.returnDate);
  const formattedDateTime = formatReceiptDateTime(data.returnDate);
  const conditionLabel = getConditionLabel(data.condition);
  const fineAmount = data.fineAmount || 0;

  return (
    <div
      className={`w-full max-w-[360px] mx-auto bg-amber-50/70 dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-zinc-700 p-5 rounded-2xl shadow-sm text-foreground font-mono text-[11px] leading-relaxed transition-all select-none ${className}`}
      data-testid="return-receipt-card"
    >
      {/* Receipt Perforation Top Visual */}
      <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-zinc-700">
        <h4 className="font-extrabold text-xs tracking-tight text-foreground">
          UNIVERSITAS MUHAMMADIYAH CIREBON
        </h4>
        <p className="font-bold text-[11px] text-[#9D171D] dark:text-red-400 mt-0.5">
          UPT PERPUSTAKAAN
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          Gedung Djuanda Kampus 2 Watubelah • Telp (0231) 209608
        </p>
      </div>

      {/* Receipt Title & Number */}
      <div className="py-2.5 text-center border-b border-dashed border-slate-300 dark:border-zinc-700">
        <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded mb-1">
          BUKTI PENGEMBALIAN BUKU
        </span>
        <div className="font-bold text-xs text-foreground">
          No. Resi: <span className="text-[#9D171D] dark:text-red-400 font-mono">{data.receiptNo}</span>
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5">{formattedDateTime}</p>
      </div>

      {/* Section 1: Member Data */}
      <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1">
        <div className="text-[9.5px] font-bold uppercase text-muted-foreground tracking-wider">
          Peminjam
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">Nama:</span>
          <span className="font-bold text-right text-foreground">{data.borrowerName}</span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">NIM/ID:</span>
          <span className="font-semibold text-right">{data.borrowerCode}</span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">Kategori:</span>
          <span className="text-right">{data.borrowerType || "Mahasiswa"}</span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground font-semibold">Fakultas:</span>
          <span className="font-bold text-right text-foreground">{data.borrowerFaculty || "-"}</span>
        </div>
        {data.borrowerStudyProgram && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-muted-foreground">Prodi:</span>
            <span className="text-right">{data.borrowerStudyProgram}</span>
          </div>
        )}
        {data.borrowerInstitution && (
          <div className="flex justify-between items-start gap-2">
            <span className="text-muted-foreground">Institusi:</span>
            <span className="text-right">{data.borrowerInstitution}</span>
          </div>
        )}
      </div>

      {/* Section 2: Book Collection Data */}
      <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1">
        <div className="text-[9.5px] font-bold uppercase text-muted-foreground tracking-wider">
          Koleksi Buku
        </div>
        <p className="font-bold text-xs text-foreground leading-snug">{data.bookTitle}</p>
        <div className="flex justify-between items-start gap-2 pt-0.5">
          <span className="text-muted-foreground">No. Inventaris:</span>
          <span className="font-bold text-right">{data.inventoryCode}</span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">Call Number:</span>
          <span className="text-right">{data.callNumber || "-"}</span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">Tgl Pinjam:</span>
          <span className="text-right">{formattedLoanDate}</span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">Batas Waktu:</span>
          <span className="text-right">{formattedDueDate}</span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">Tgl Kembali:</span>
          <span className="text-right font-bold text-emerald-600 dark:text-emerald-400">
            {formattedReturnDate}
          </span>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="text-muted-foreground">Kondisi Buku:</span>
          <span className="font-bold text-right">[{conditionLabel}]</span>
        </div>
      </div>

      {/* Section 3: Fine / Denda */}
      <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-[9.5px] font-bold uppercase">Biaya / Denda:</span>
          <span
            className={`font-bold ${
              fineAmount > 0
                ? "text-red-600 dark:text-red-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {fineAmount > 0 ? `Rp ${fineAmount.toLocaleString("id-ID")}` : "Rp 0 (Bebas Denda)"}
          </span>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-muted-foreground">Status Pembayaran:</span>
          <span className="font-bold">{fineAmount > 0 ? data.fineStatus || "LUNAS" : "NIHIL"}</span>
        </div>
      </div>

      {/* Section 4: Verification & Officer Signature */}
      <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 text-center space-y-1">
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
          <ShieldCheck size={11} />
          TERVERIFIKASI SAH SISTEM
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          Petugas Penerima: <strong className="text-foreground">{data.staffName}</strong>
        </div>
        {data.signature && data.signature.startsWith("data:image") ? (
          <div className="py-1">
            <img
              src={data.signature}
              alt="Tanda Tangan Petugas"
              className="max-h-9 max-w-[120px] mx-auto object-contain dark:invert"
            />
          </div>
        ) : (
          <div className="text-[9px] text-muted-foreground italic py-1">[Tanda Tangan Digital]</div>
        )}
      </div>

      {/* Section 5: Notes if any */}
      {data.notes && (
        <div className="py-1.5 border-b border-dashed border-slate-300 dark:border-zinc-700 text-[9.5px]">
          <span className="text-muted-foreground font-bold">Catatan: </span>
          <span className="text-foreground">{data.notes}</span>
        </div>
      )}

      {/* Receipt Footer Message */}
      <div className="pt-3 text-center text-[9px] text-muted-foreground leading-normal space-y-0.5">
        <p>Terima kasih telah mengembalikan tepat waktu.</p>
        <p className="font-semibold text-foreground">Simpan resi ini sebagai tanda bukti sah.</p>
        <p className="text-[8px] pt-1 tracking-widest uppercase">*** PERPUSTAKAAN UMC ***</p>
      </div>
    </div>
  );
};

export interface ReturnReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  receiptData?: Partial<ReturnReceiptData>;
  onDownloadPdf?: () => void;
}

export const ReturnReceiptModal: React.FC<ReturnReceiptModalProps> = ({
  isOpen,
  onClose,
  loan,
  receiptData,
  onDownloadPdf,
}) => {
  if (!loan) return null;

  const fullData = extractReceiptDataFromLoan(loan, receiptData);

  const handlePrint = () => {
    printThermalReceipt(fullData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resi Bukti Pengembalian Buku"
      size="md"
    >
      <div className="space-y-4">
        {/* Receipt Content Preview */}
        <div className="max-h-[60vh] overflow-y-auto py-1 px-0.5">
          <ReturnReceiptCard data={fullData} />
        </div>

        {/* Modal Actions - Exact styling as in dashboard modals */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
          >
            Tutup
          </button>

          {onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <FileDown size={15} />
              Unduh PDF
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-colors"
          >
            <Printer size={15} />
            Cetak Resi
          </button>
        </div>
      </div>
    </Modal>
  );
};
