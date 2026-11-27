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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE_URL } from "@/utils/api-config";
import { facultyApi, getAuthHeaders, studyProgramApi, type Faculty, type StudyProgram } from "@/api/client";
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
  const [csvFlavor, setCsvFlavor] = useState<"library" | "slims">("slims");
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
    ? studyPrograms.filter((sp) => String(sp.facultyId ?? sp.faculty?.id ?? "") === selectedFacultyId)
    : studyPrograms;

  const groupedStudyPrograms = faculties
    .map((fac) => ({
      faculty: fac,
      prodis: studyPrograms.filter((sp) => String(sp.facultyId ?? sp.faculty?.id ?? "") === String(fac.id)),
    }))
    .filter((group) => group.prodis.length > 0);

  const handleFacultyChange = (facId: string) => {
    setSelectedFacultyId(facId);
    if (facId !== "all") {
      // Jika prodi saat ini tidak termasuk dalam fakultas ini, reset ke "all"
      const matched = studyPrograms.find(
        (sp) => String(sp.id) === selectedStudyProgramId && String(sp.facultyId ?? sp.faculty?.id ?? "") === facId
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
      const facId = sp?.facultyId ?? sp?.faculty?.id;
      if (facId) {
        setSelectedFacultyId(String(facId));
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

  const buildFallbackFilename = () => {
    const now = new Date();
    const datePrefix = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
    const slugify = (val: string) =>
      val
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const spName =
      selectedStudyProgramId !== "all"
        ? studyPrograms.find((sp) => String(sp.id) === selectedStudyProgramId)?.name
        : undefined;
    const facName =
      selectedFacultyId !== "all"
        ? faculties.find((f) => String(f.id) === selectedFacultyId)?.name
        : undefined;

    const scopeSlug = spName
      ? `prodi-${slugify(spName)}`
      : facName
        ? `fakultas-${slugify(facName)}`
        : "semua-fakultas";

    const ext = reportType === "items" ? "csv" : format;
    const baseMap: Record<ReportType, string> = {
      loans: "laporan-peminjaman",
      bibliographies: "katalog-koleksi-umc",
      items: "eksemplar-koleksi",
      fines: "laporan-denda",
    };

    return `${baseMap[reportType]}_${datePrefix}_${scopeSlug}.${ext}`;
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
          params.set("format", csvFlavor);
          params.set("delimiter", ";");
          url = `${API_BASE_URL}/api/export/bibliographies?${params.toString()}`;
        }
      } else if (reportType === "items") {
        params.set("format", csvFlavor);
        params.set("delimiter", ";");
        url = `${API_BASE_URL}/api/export/items?${params.toString()}`;
      } else if (reportType === "fines") {
        params.set("format", format);
        if (fineStatus && fineStatus !== "all") {
          params.set("status", fineStatus);
        }
        url = `${API_BASE_URL}/api/reports/fines/export?${params.toString()}`;
      }

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.message || `Gagal mengunduh laporan (${response.status})`);
      }

      const disposition = response.headers?.get?.("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
      const resolvedFilename = filenameMatch?.[1]?.trim() || buildFallbackFilename();

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = resolvedFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      const prodiName = selectedStudyProgramId !== "all"
        ? studyPrograms.find((sp) => String(sp.id) === selectedStudyProgramId)?.name
        : selectedFacultyId !== "all"
          ? faculties.find((f) => String(f.id) === selectedFacultyId)?.name
          : "Semua Fakultas & Program Studi";

      success(
        "Mengunduh Laporan",
        `File ${resolvedFilename} (${prodiName}) berhasil diunduh.`
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
              <Select value={selectedStudyProgramId} onValueChange={handleStudyProgramChange}>
                <SelectTrigger
                  id="export-study-program"
                  className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <SelectValue placeholder="Semua Program Studi (Universitas)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Program Studi (Universitas)</SelectItem>
                  {selectedFacultyId === "all" && groupedStudyPrograms.length > 0
                    ? groupedStudyPrograms.map(({ faculty, prodis }) => (
                        <SelectGroup key={faculty.id}>
                          <SelectLabel>{faculty.name}</SelectLabel>
                          {prodis.map((sp) => (
                            <SelectItem key={sp.id} value={String(sp.id)}>
                              {sp.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))
                    : filteredStudyPrograms.map((sp) => (
                        <SelectItem key={sp.id} value={String(sp.id)}>
                          {sp.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
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
              <Select value={selectedFacultyId} onValueChange={handleFacultyChange}>
                <SelectTrigger
                  id="export-faculty"
                  className="w-full rounded-lg border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <SelectValue placeholder="Semua Fakultas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Fakultas</SelectItem>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {(format === "csv" || reportType === "items") && (reportType === "bibliographies" || reportType === "items") && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
              <span className="mb-2 block text-xs font-semibold text-foreground">Standar Format CSV:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCsvFlavor("slims")}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    csvFlavor === "slims"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <p className="font-bold">SLiMS 9 Bulian (;)</p>
                  <p className="text-[10px] opacity-80">100% kompatibel impor/ekspor SLiMS Perpustakaan</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCsvFlavor("library")}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    csvFlavor === "library"
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <p className="font-bold">Standar Sistem UMC</p>
                  <p className="text-[10px] opacity-80">Menyertakan kolom fakultas & prodi lengkap</p>
                </button>
              </div>
            </div>
          )}
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
                <Select value={loanStatus} onValueChange={setLoanStatus}>
                  <SelectTrigger size="sm" className="w-full rounded-lg border-border bg-card px-2.5 text-xs text-foreground">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="borrowed">Sedang Dipinjam</SelectItem>
                    <SelectItem value="returned">Sudah Dikembalikan</SelectItem>
                    <SelectItem value="overdue">Terlambat</SelectItem>
                  </SelectContent>
                </Select>
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
              <Select value={fineStatus} onValueChange={setFineStatus}>
                <SelectTrigger size="sm" className="w-full rounded-lg border-border bg-card px-2.5 text-xs text-foreground">
                  <SelectValue placeholder="Semua Denda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Denda</SelectItem>
                  <SelectItem value="paid">Sudah Lunas (Paid)</SelectItem>
                  <SelectItem value="unpaid">Belum Lunas (Unpaid)</SelectItem>
                </SelectContent>
              </Select>
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
