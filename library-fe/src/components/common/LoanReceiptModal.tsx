import React from "react";
import { Printer, Clock, ShieldCheck } from "lucide-react";
import Modal from "@/components/ui/modal";
import type { Loan } from "@/services/loanService";
import {
  type LoanReceiptData,
  printLoanThermalReceipt,
  formatReceiptDate,
  formatReceiptDateTime,
} from "@/utils/printReceipt";

/**
 * Ekstraksi data lengkap peminjaman buku dari objek Loan
 */
export function extractLoanReceiptData(
  loan: Loan,
  overrides?: Partial<LoanReceiptData>
): LoanReceiptData {
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
    (loan.id ? `BA-PINJ-${loan.id.slice(0, 8).toUpperCase()}` : `BA-PINJ-${Date.now().toString(36).toUpperCase()}`);

  const staffName =
    overrides?.staffName ||
    loan.returnStaffName ||
    (loan as any).approvedByName ||
    "Petugas Sirkulasi Perpustakaan";

  const signature =
    overrides?.signature !== undefined
      ? overrides.signature
      : loan.returnStaffSignature || null;

  const notes =
    overrides?.notes !== undefined
      ? overrides.notes
      : loan.notes;

  return {
    receiptNo,
    loanDate: overrides?.loanDate || loan.loanDate || new Date().toISOString(),
    dueDate: overrides?.dueDate || loan.dueDate || new Date().toISOString(),
    borrowerName,
    borrowerCode,
    borrowerType,
    borrowerFaculty,
    borrowerStudyProgram,
    borrowerInstitution,
    bookTitle,
    inventoryCode,
    callNumber,
    staffName,
    signature,
    notes,
    status: overrides?.status || "SEDANG DIPINJAM (AKTIF)",
  };
}

export interface LoanReceiptCardProps {
  data: LoanReceiptData;
  className?: string;
}

export const LoanReceiptCard: React.FC<LoanReceiptCardProps> = ({ data, className = "" }) => {
  const formattedLoanDate = formatReceiptDate(data.loanDate);
  const formattedDueDate = formatReceiptDate(data.dueDate);
  const formattedDateTime = formatReceiptDateTime(data.loanDate);

  return (
    <div
      className={`w-full max-w-[360px] mx-auto bg-amber-50/70 dark:bg-zinc-900 border-2 border-dashed border-slate-300 dark:border-zinc-700 p-5 rounded-2xl shadow-sm text-foreground font-mono text-[11px] leading-relaxed transition-all select-none ${className}`}
      data-testid="loan-receipt-card"
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
        <span className="inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 rounded mb-1">
          BUKTI PEMINJAMAN BUKU
        </span>
        <div className="font-bold text-xs text-foreground">
          No. Transaksi: <span className="text-[#9D171D] dark:text-red-400 font-mono">{data.receiptNo}</span>
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5">{formattedDateTime}</p>
      </div>

      {/* Section 1: Member Data */}
      <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1">
        <div className="text-[9.5px] font-bold uppercase text-muted-foreground tracking-wider">
          Data Pemustaka
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
          Bahan Pustaka
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
          <span className="text-muted-foreground">Status:</span>
          <span className="text-right font-bold text-blue-600 dark:text-blue-400">
            SEDANG DIPINJAM
          </span>
        </div>
      </div>

      {/* Section 3: Batas Pengembalian (Highlighted) */}
      <div className="py-2.5 border-b border-dashed border-slate-300 dark:border-zinc-700">
        <div className="bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-2 rounded-lg text-center space-y-0.5">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
            <Clock size={11} /> Batas Waktu Pengembalian
          </span>
          <div className="text-xs font-black text-[#9D171D] dark:text-red-400">
            {formattedDueDate}
          </div>
          <p className="text-[8.5px] text-muted-foreground">
            Harap kembalikan buku sebelum tanggal di atas.
          </p>
        </div>
      </div>

      {/* Section 4: Ketentuan Peminjaman */}
      <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 text-[8.5px] text-muted-foreground space-y-0.5">
        <p>1. Simpan struk ini sebagai bukti peminjaman sah.</p>
        <p>2. Keterlambatan dikenakan denda sesuai peraturan UMC.</p>
        <p>3. Peminjam wajib menjaga keutuhan bahan pustaka.</p>
      </div>

      {/* Section 5: Verifikasi Sirkulasi */}
      <div className="pt-2 text-center space-y-1">
        <div className="inline-flex items-center gap-1 text-[8.5px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
          <ShieldCheck size={11} /> TERCATAT SIRKULASI SAH
        </div>
        <p className="text-[9px] font-bold text-foreground">{data.staffName}</p>
        <p className="text-[8px] text-muted-foreground">Pelayanan Sirkulasi Perpustakaan UMC</p>
      </div>

      {/* Receipt Footer Message */}
      <div className="pt-3 border-t border-dashed border-slate-300 dark:border-zinc-700 text-center text-[8.5px] text-muted-foreground space-y-0.5">
        <p>Selamat membaca & semoga bermanfaat.</p>
        <p className="text-[8px] pt-0.5 tracking-widest uppercase">*** PERPUSTAKAAN UMC ***</p>
      </div>
    </div>
  );
};

export interface LoanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  receiptData?: Partial<LoanReceiptData>;
}

export const LoanReceiptModal: React.FC<LoanReceiptModalProps> = ({
  isOpen,
  onClose,
  loan,
  receiptData,
}) => {
  if (!loan) return null;

  const fullData = extractLoanReceiptData(loan, receiptData);

  const handlePrint = () => {
    printLoanThermalReceipt(fullData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Struk Bukti Peminjaman Buku"
      size="lg"
      className="max-w-xl sm:max-w-2xl w-full"
    >
      <div className="space-y-4">
        {/* Receipt Content Preview */}
        <div className="max-h-[60vh] overflow-y-auto py-2 px-1 flex justify-center">
          <LoanReceiptCard data={fullData} />
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="h-9.5 rounded-xl border border-border px-4 text-xs sm:text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer transition-colors whitespace-nowrap text-center"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-9.5 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-colors whitespace-nowrap"
          >
            <Printer size={15} />
            <span>Cetak Struk Pinjam</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LoanReceiptModal;
