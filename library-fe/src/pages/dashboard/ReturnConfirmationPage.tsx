import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileDown,
  AlertTriangle,
  User,
  Barcode,
  Layers,
  ShieldCheck,
  Check,
  Printer,
} from "lucide-react";
import loanService, { type Loan } from "@/services/loanService";
import { authClient } from "@/utils/auth-client";
import { SignaturePad } from "@/components/common/SignaturePad";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";
import {
  ReturnReceiptCard,
  ReturnReceiptModal,
  extractReceiptDataFromLoan,
} from "@/components/common/ReturnReceiptModal";
import Modal from "@/components/ui/modal";
import { printThermalReceipt, formatReceiptDate } from "@/utils/printReceipt";

export default function ReturnConfirmationPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get("requestId");
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();

  const { data: session } = authClient.useSession();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [condition, setCondition] = useState<"good" | "damaged" | "lost">("good");
  const [staffName, setStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successReceiptNo, setSuccessReceiptNo] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const staffNameInitialized = React.useRef(false);

  useEffect(() => {
    if (session?.user?.name && !staffNameInitialized.current) {
      setStaffName(session.user.name);
      staffNameInitialized.current = true;
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (!loanId) {
      setError("ID Peminjaman tidak valid.");
      setLoading(false);
      return;
    }

    const fetchLoan = async () => {
      try {
        setLoading(true);
        const data = await loanService.getLoanById(loanId);
        setLoan(data);
        if (data.status === "returned") {
          setSuccessReceiptNo(data.returnReceiptNo || "BA-RET-DONE");
        }
      } catch (err: any) {
        setError(err.message || "Gagal memuat rincian peminjaman.");
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [loanId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanId) return;

    if (!staffName.trim()) {
      warning("Perhatian", "Nama petugas pemeriksa wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        condition,
        staffName: staffName.trim(),
        signature: signature || undefined,
        notes: notes.trim() || undefined,
      };

      let res: any;
      if (requestId) {
        res = await loanService.approveReturnRequest(requestId, payload);
      } else {
        res = await loanService.returnLoan(loanId, payload);
      }

      const receiptNo = res.data?.returnReceiptNo || res.loan?.returnReceiptNo || `BA-RET-${Date.now()}`;
      setSuccessReceiptNo(receiptNo);
      setIsSuccessModalOpen(true);
      success("Pengembalian Berhasil", "Berita acara pengembalian buku telah diterbitkan.");
    } catch (err: any) {
      toastError("Gagal Memproses", err.message || "Terjadi kesalahan saat memproses pengembalian.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!loanId) return;
    try {
      await loanService.downloadReturnReceiptPdf(loanId);
      success("Unduh Berhasil", "Tanda terima pengembalian PDF berhasil diunduh.");
    } catch (err: any) {
      toastError("Gagal Mengunduh PDF", err.message || "Terjadi kesalahan saat mengunduh dokumen.");
    }
  };

  const currentReceiptData = loan
    ? extractReceiptDataFromLoan(loan, {
        receiptNo: successReceiptNo || loan.returnReceiptNo,
        staffName: staffName.trim() || loan.returnStaffName,
        condition: condition || loan.returnCondition,
        notes: notes.trim() || loan.notes,
        signature: signature || loan.returnStaffSignature,
        returnDate: loan.returnDate || new Date().toISOString(),
      })
    : null;

  const handlePrintReceipt = () => {
    if (currentReceiptData) {
      printThermalReceipt(currentReceiptData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Memuat data peminjaman...</p>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card p-6 rounded-2xl border border-border shadow-xs text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Terjadi Kesalahan</h2>
          <p className="text-sm text-muted-foreground mb-6">{error || "Peminjaman tidak ditemukan"}</p>
          <Button onClick={() => navigate("/dashboard/super-admin?tab=loans")} className="w-full">
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const bib = loan.item?.bibliography;
  const member = loan.member as any;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);
  const isLate = dueDate ? today > dueDate : false;
  const daysLate = dueDate && isLate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={requestId ? "/dashboard/super-admin?tab=return-approvals" : "/dashboard/super-admin?tab=loans"}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke {requestId ? "Permintaan Pengembalian" : "Daftar Peminjaman"}
          </Link>
          <Badge variant="outline" className="text-xs font-mono px-2.5 py-0.5">
            ID: {loan.id.slice(0, 8)}...
          </Badge>
        </div>

        {/* Page Header */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileCheck2 className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">
                  Berita Acara & Verifikasi Pengembalian Buku
                </h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Periksa kondisi fisik koleksi secara cermat dan tanda tangani tanda terima serah-terima pengembalian.
              </p>
            </div>
            {loan.status === "returned" && (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 font-semibold text-xs">
                Sudah Dikembalikan
              </Badge>
            )}
          </div>
        </div>

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Detail Buku & Peminjam */}
          <div className="lg:col-span-5 space-y-5">
            {/* Informasi Koleksi */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen size={14} className="text-primary" />
                Koleksi yang Dikembalikan
              </h3>

              <div className="flex gap-4 items-start">
                <div className="w-16 h-24 bg-muted rounded-xl shrink-0 overflow-hidden border border-border shadow-2xs flex items-center justify-center">
                  {bib?.image ? (
                    <img src={bib.image} alt={bib.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                    {bib?.title || "Judul Buku"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {bib?.author || (bib?.authors && bib.authors[0]?.name) || "Penulis Tidak Diketahui"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {(loan.item?.itemCode || loan.item?.barcode) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        <Barcode size={11} />
                        {loan.item?.itemCode || loan.item?.barcode}
                      </span>
                    )}
                    {bib?.callNumber && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        <Layers size={11} />
                        {bib.callNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Informasi Anggota / Peminjam */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User size={14} className="text-primary" />
                Data Peminjam
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Nama Anggota</span>
                  <span className="font-semibold text-foreground">
                    {member?.name || (loan as any).userName || "Nama Member"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Nomor Anggota / NIM</span>
                  <span className="font-mono text-foreground">
                    {member?.memberNo || member?.nim || member?.nidn || "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Program Studi / Instansi</span>
                  <span className="text-foreground">
                    {member?.studyProgram || "Universitas Muhammadiyah Cirebon"}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Peminjaman */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                Periode Peminjaman
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Tanggal Pinjam</span>
                  <span className="font-medium text-foreground">
                    {loan.loanDate ? new Date(loan.loanDate).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Jatuh Tempo</span>
                  <span className={`font-medium ${isLate ? "text-destructive font-bold" : "text-foreground"}`}>
                    {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                  </span>
                </div>
                <div className="flex justify-between py-1 items-center">
                  <span className="text-muted-foreground">Status Keterlambatan</span>
                  {isLate ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive">
                      <Clock size={12} />
                      Terlambat {daysLate} Hari
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Tepat Waktu</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Formulir Verifikasi Fisik & Tanda Tangan ATAU Resi Resmi jika sudah dikembalikan */}
          <div className="lg:col-span-7">
            {loan.status === "returned" ? (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Buku Telah Selesai Dikembalikan
                      </h3>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Berita acara resmi:{" "}
                        <span className="font-mono font-bold">
                          {loan.returnReceiptNo || successReceiptNo || "BA-RET-DONE"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">SAH</Badge>
                </div>

                {/* Ringkasan Pengesahan & Resi */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5 text-xs">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Bentuk Fisik Resi Pengembalian
                  </p>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Peminjam:</span>
                    <span className="font-bold text-foreground">{currentReceiptData?.borrowerName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">NIM/ID:</span>
                    <span className="font-mono font-semibold">{currentReceiptData?.borrowerCode}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground font-semibold">Fakultas:</span>
                    <span className="font-bold text-foreground">{currentReceiptData?.borrowerFaculty || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Bahan Pustaka:</span>
                    <span className="font-medium text-foreground line-clamp-1">{currentReceiptData?.bookTitle}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Tanggal Pengembalian:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatReceiptDate(loan.returnDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Status Verifikasi:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">TERVERIFIKASI SAH SISTEM</span>
                  </div>
                </div>

                {/* Print & Download Actions */}
                <div className="pt-4 flex flex-col sm:flex-row gap-3 border-t border-border">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsReceiptModalOpen(true);
                      handlePrintReceipt();
                    }}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center justify-center gap-2 cursor-pointer py-2.5 shadow-xs"
                  >
                    <Printer size={15} />
                    Cetak Resi Pengembalian
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsReceiptModalOpen(true)}
                    variant="secondary"
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Buka Dialog Resi
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDownloadPdf}
                    variant="outline"
                    className="flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <FileDown size={14} />
                    Unduh PDF
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-2xs">
                <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Formulir Pemeriksaan Fisik & Validasi</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lakukan pemeriksaan fisik buku sebelum memberikan tanda tangan pengesahan pengembalian.
                  </p>
                </div>

                {/* Kondisi Fisik Buku */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Kondisi Fisik Koleksi
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setCondition("good")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        condition === "good"
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                          : "border-border hover:border-muted-foreground/30 bg-background text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">Baik</span>
                        {condition === "good" && <Check size={14} className="text-emerald-600" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        Lengkap, bersih & tanpa kerusakan
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCondition("damaged")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        condition === "damaged"
                          ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20"
                          : "border-border hover:border-muted-foreground/30 bg-background text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">Rusak</span>
                        {condition === "damaged" && <Check size={14} className="text-amber-600" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        Cover lepas, robek, atau basah
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCondition("lost")}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        condition === "lost"
                          ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20"
                          : "border-border hover:border-muted-foreground/30 bg-background text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold">Hilang</span>
                        {condition === "lost" && <Check size={14} className="text-rose-600" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        Eksemplar hilang oleh peminjam
                      </span>
                    </button>
                  </div>
                </div>

                {/* Catatan Petugas */}
                <div className="space-y-1.5">
                  <label htmlFor="notes" className="text-xs font-medium text-foreground">
                    Catatan Pemeriksaan (Opsional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Ada sedikit lipatan pada sudut halaman 45, denda lunas..."
                    className="w-full text-xs rounded-xl border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[70px] resize-none"
                  />
                </div>

                {/* Nama Petugas Penerima */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="staffName" className="text-xs font-medium text-foreground">
                      Nama Petugas Penerima <span className="text-destructive">*</span>
                    </label>
                    {session?.user?.name && staffName !== session.user.name && (
                      <button
                        type="button"
                        onClick={() => setStaffName(session.user.name)}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        Gunakan nama saya ({session.user.name})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="staffName"
                      type="text"
                      required
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="Nama lengkap pustakawan / petugas"
                      className="w-full text-xs rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <ShieldCheck size={15} className="absolute left-3 top-3 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Dapat disesuaikan jika pengembalian fisik diperiksa oleh pustakawan atau staf lain.
                  </p>
                </div>

                {/* Canvas Tanda Tangan Digital */}
                <SignaturePad onSignatureChange={setSignature} />

                {/* Action Buttons */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    disabled={submitting}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Menerbitkan Berita Acara...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 size={16} />
                        Konfirmasi & Terbitkan Berita Acara
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Modal using standard UI Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() =>
          navigate(
            requestId
              ? "/dashboard/super-admin?tab=return-approvals"
              : "/dashboard/super-admin?tab=loans"
          )
        }
        title="Pengembalian Berhasil Dikonfirmasi!"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 size={28} />
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              Berita acara sah telah diterbitkan. Anda dapat langsung mencetak resi pengembalian tanpa harus mengunduh berkas.
            </p>
            {successReceiptNo && (
              <div className="mt-2 inline-block px-3 py-1 bg-muted rounded-lg border border-border">
                <span className="text-[11px] font-mono font-bold text-foreground">
                  No. Berita Acara: {successReceiptNo}
                </span>
              </div>
            )}
          </div>

          {/* Receipt Preview */}
          <div className="max-h-[46vh] overflow-y-auto p-1 rounded-xl bg-muted/40 border border-border/60">
            {currentReceiptData && <ReturnReceiptCard data={currentReceiptData} />}
          </div>

          {/* Actions matching standard dashboard modal button styles */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() =>
                navigate(
                  requestId
                    ? "/dashboard/super-admin?tab=return-approvals"
                    : "/dashboard/super-admin?tab=loans"
                )
              }
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              Ke Dashboard
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted cursor-pointer transition-colors"
            >
              <FileDown size={15} />
              Unduh Tanda Terima (PDF)
            </button>
            <button
              type="button"
              onClick={handlePrintReceipt}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition-colors"
            >
              <Printer size={15} />
              Cetak Resi Langsung
            </button>
          </div>
        </div>
      </Modal>
      {/* Floating Receipt Modal */}
      {isReceiptModalOpen && loan && (
        <ReturnReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          loan={loan}
          receiptData={currentReceiptData || undefined}
          onDownloadPdf={handleDownloadPdf}
        />
      )}
    </div>
  );
}
