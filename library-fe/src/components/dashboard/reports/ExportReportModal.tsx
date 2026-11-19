import { useState, useEffect } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  GraduationCap,
  Building2,
  Calendar,
  Filter,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { API_BASE_URL } from "@/utils/api-config";
import { facultyApi, studyProgramApi, type Faculty, type StudyProgram } from "@/api/client";
import { useToast } from "@/hooks/useToast";

export type ReportType = "loans" | "bibliographies" | "items" | "fines";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ReportType;
}

export default function ExportReportModal({
  isOpen,
  onClose,
  initialType = "loans",
}: ExportReportModalProps) {
  const { success, error } = useToast();
  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
  const [selectedStudyProgramId, setSelectedStudyProgramId] = useState<string>("all");

  // Filter tambahan
  const [loanStatus, setLoanStatus] = useState<string>("all");
  const [fineStatus, setFineStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initialType when modal opens or initialType changes
  useEffect(() => {
    if (isOpen) {
      setReportType(initialType);
    }
  }, [isOpen, initialType]);

  // Fetch faculties and study programs on mount
  useEffect(() => {
    if (!isOpen) return;

    facultyApi
      .list()
      .then((res) => setFaculties(res.data || []))
      .catch(() => {});

    studyProgramApi
      .list()
      .then((res) => setStudyPrograms(res.data || []))
      .catch(() => {});
  }, [isOpen]);

  // Filter study programs based on selected faculty
  const filteredStudyPrograms = selectedFacultyId && selectedFacultyId !== "all"
    ? studyPrograms.filter((sp) => String(sp.facultyId) === selectedFacultyId)
    : studyPrograms;

  const handleFacultyChange = (facId: string) => {
    setSelectedFacultyId(facId);
    if (facId !== "all") {
      // Jika prodi saat ini tidak termasuk dalam fakultas ini, reset ke "all"
      const matched = studyPrograms.find(
        (sp) => String(sp.id) === selectedStudyProgramId && String(sp.facultyId) === facId
      );
      if (!matched) {
        setSelectedStudyProgramId("all");
      }
    }
  };

  const handleStudyProgramChange = (spId: string) => {
    setSelectedStudyProgramId(spId);
    if (spId !== "all") {
      const sp = studyPrograms.find((item) => String(item.id) === spId);
      if (sp?.facultyId) {
        setSelectedFacultyId(String(sp.facultyId));
      }
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case "loans":
        return "Export Laporan Peminjaman";
      case "bibliographies":
        return "Export Katalog Koleksi Buku";
      case "items":
        return "Export Eksemplar / Salinan Buku";
      case "fines":
        return "Export Laporan Denda";
      default:
        return "Export Laporan Perpustakaan";
    }
  };

  const handleDownload = async () => {
    setIsSubmitting(true);
    try {
      const params = new URLSearchParams();

      if (selectedStudyProgramId && selectedStudyProgramId !== "all") {
        params.set("studyProgramId", selectedStudyProgramId);
      }
      if (selectedFacultyId && selectedFacultyId !== "all") {
        params.set("facultyId", selectedFacultyId);
      }

      let url = "";

      if (reportType === "loans") {
        params.set("format", format);
        if (loanStatus && loanStatus !== "all") {
          params.set("status", loanStatus);
        }
        if (startDate) params.set("from", startDate);
        if (endDate) params.set("to", endDate);
        url = `${API_BASE_URL}/api/reports/loans/export?${params.toString()}`;
      } else if (reportType === "bibliographies") {
        if (format === "pdf") {
          url = `${API_BASE_URL}/api/export/bibliographies/pdf?${params.toString()}`;
        } else {
          params.set("format", "library");
          url = `${API_BASE_URL}/api/export/bibliographies?${params.toString()}`;
        }
      } else if (reportType === "items") {
        params.set("format", "library");
        url = `${API_BASE_URL}/api/export/items?${params.toString()}`;
      } else if (reportType === "fines") {
        params.set("format", format);
        if (fineStatus && fineStatus !== "all") {
          params.set("status", fineStatus);
        }
        url = `${API_BASE_URL}/api/reports/fines/export?${params.toString()}`;
      }

      // Trigger download via native browser new window/tab
      window.open(url, "_blank");

      const prodiName = selectedStudyProgramId !== "all"
        ? studyPrograms.find((sp) => String(sp.id) === selectedStudyProgramId)?.name
        : "Semua Program Studi";

      success(
        "Mengunduh Laporan",
        `Laporan (${prodiName}) format ${format.toUpperCase()} sedang diproses peramban.`
      );

      // Tutup modal setelah mengunduh
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      error("Gagal Mengunduh Laporan", err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getReportTitle()}
      size="lg"
    >
      <div className="space-y-5 p-5 text-foreground">
        {/* Tipe Laporan Picker */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Jenis Laporan
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setReportType("loans")}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                reportType === "loans"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <FileText className="mb-1.5 size-5" />
              <span className="text-xs">Peminjaman</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType("bibliographies")}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                reportType === "bibliographies"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Building2 className="mb-1.5 size-5" />
              <span className="text-xs">Katalog Buku</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setReportType("items");
                setFormat("csv"); // Item export is CSV
              }}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                reportType === "items"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <FileSpreadsheet className="mb-1.5 size-5" />
              <span className="text-xs">Eksemplar</span>
            </button>

            <button
              type="button"
              onClick={() => setReportType("fines")}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                reportType === "fines"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Filter className="mb-1.5 size-5" />
              <span className="text-xs">Denda</span>
            </button>
          </div>
        </div>

        {/* Pemilihan Program Studi & Fakultas */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="size-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">
              Filter Program Studi & Fakultas
            </h4>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="export-study-program"
                className="mb-1 block text-xs font-semibold text-foreground"
              >
                Program Studi (Pilihan Spesifik) *
              </label>
              <select
                id="export-study-program"
                value={selectedStudyProgramId}
                onChange={(e) => handleStudyProgramChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Semua Program Studi (Universitas)</option>
                {filteredStudyPrograms.map((sp) => (
                  <option key={sp.id} value={String(sp.id)}>
                    {sp.name} {sp.faculty?.name && selectedFacultyId === "all" ? `(${sp.faculty.name})` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Pilih prodi untuk mengambil laporan khusus prodi tersebut saja.
              </p>
            </div>

            <div>
              <label
                htmlFor="export-faculty"
                className="mb-1 block text-xs font-semibold text-foreground"
              >
                Fakultas (Opsional)
              </label>
              <select
                id="export-faculty"
                value={selectedFacultyId}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Semua Fakultas</option>
                {faculties.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Menyaring daftar prodi di samping.
              </p>
            </div>
          </div>
        </div>

        {/* Format Dokumen */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Format Berkas
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={reportType === "items"}
              onClick={() => setFormat("pdf")}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                format === "pdf" && reportType !== "items"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              } ${reportType === "items" ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                <FileText className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Dokumen PDF (.pdf)</p>
                <p className="text-[11px] text-muted-foreground">Siap cetak & arsip resmi</p>
              </div>
              {format === "pdf" && reportType !== "items" && (
                <CheckCircle2 className="ml-auto size-4 text-primary shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                format === "csv" || reportType === "items"
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Excel / CSV (.csv)</p>
                <p className="text-[11px] text-muted-foreground">Olah data di spreadsheet</p>
              </div>
              {(format === "csv" || reportType === "items") && (
                <CheckCircle2 className="ml-auto size-4 text-primary shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Kondisional: Status & Periode Tanggal */}
        {reportType === "loans" && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <h5 className="text-xs font-bold text-foreground">
                Periode & Status Peminjaman (Opsional)
              </h5>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <select
                  value={loanStatus}
                  onChange={(e) => setLoanStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Status</option>
                  <option value="borrowed">Sedang Dipinjam</option>
                  <option value="returned">Sudah Dikembalikan</option>
                  <option value="overdue">Terlambat</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {reportType === "fines" && (
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3.5">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <h5 className="text-xs font-bold text-foreground">
                Filter Status Denda (Opsional)
              </h5>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Status Pembayaran Denda
              </label>
              <select
                value={fineStatus}
                onChange={(e) => setFineStatus(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Semua Denda</option>
                <option value="paid">Sudah Lunas (Paid)</option>
                <option value="unpaid">Belum Lunas (Unpaid)</option>
              </select>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 rounded-xl border border-border px-5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span>Unduh Laporan</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
