import { useState, useEffect } from "react";
import {
  FileDown,
  Book,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  Filter,
  FileText,
  X,
} from "lucide-react";
import {
  exportApi,
  facultyApi,
  studyProgramApi,
  type Faculty,
  type StudyProgram,
} from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ExportSection() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [selectedStudyProgramId, setSelectedStudyProgramId] = useState<string>("");

  const [activeExportType, setActiveExportType] = useState<"bibliography" | "item" | null>(null);
  const [selectedDelimiter, setSelectedDelimiter] = useState<";" | ",">(";");

  const [exportingBiblio, setExportingBiblio] = useState(false);
  const [exportingItem, setExportingItem] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBiblio, setSuccessBiblio] = useState(false);
  const [successItem, setSuccessItem] = useState(false);
  const [successPdf, setSuccessPdf] = useState(false);

  useEffect(() => {
    facultyApi
      .list()
      .then((res) => {
        setFaculties(res.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedFacultyId) {
      studyProgramApi
        .list(Number(selectedFacultyId))
        .then((res) => {
          setStudyPrograms(res.data || []);
        })
        .catch(() => {});
    } else {
      setStudyPrograms([]);
      setSelectedStudyProgramId("");
    }
  }, [selectedFacultyId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeExportType) {
        setActiveExportType(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeExportType]);

  const handleOpenDelimiterModal = (type: "bibliography" | "item") => {
    setActiveExportType(type);
  };

  const handleExecuteExportCsv = async () => {
    if (!activeExportType) return;
    const type = activeExportType;
    setActiveExportType(null);

    if (type === "bibliography") {
      setExportingBiblio(true);
      setError(null);
      setSuccessBiblio(false);
      try {
        await exportApi.downloadBibliographies({
          facultyId: selectedFacultyId ? Number(selectedFacultyId) : undefined,
          studyProgramId: selectedStudyProgramId ? Number(selectedStudyProgramId) : undefined,
          delimiter: selectedDelimiter,
        });
        setSuccessBiblio(true);
        setTimeout(() => setSuccessBiblio(false), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Export gagal");
      } finally {
        setExportingBiblio(false);
      }
    } else {
      setExportingItem(true);
      setError(null);
      setSuccessItem(false);
      try {
        await exportApi.downloadItems({
          facultyId: selectedFacultyId ? Number(selectedFacultyId) : undefined,
          studyProgramId: selectedStudyProgramId ? Number(selectedStudyProgramId) : undefined,
          delimiter: selectedDelimiter,
        });
        setSuccessItem(true);
        setTimeout(() => setSuccessItem(false), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Export gagal");
      } finally {
        setExportingItem(false);
      }
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setError(null);
    setSuccessPdf(false);
    try {
      await exportApi.downloadBibliographiesPdf({
        facultyId: selectedFacultyId ? Number(selectedFacultyId) : undefined,
        studyProgramId: selectedStudyProgramId ? Number(selectedStudyProgramId) : undefined,
      });
      setSuccessPdf(true);
      setTimeout(() => setSuccessPdf(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export PDF gagal");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Export Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Export data bibliografi dan item ke format CSV
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="size-4 text-primary" />
          <h3 className="font-semibold text-foreground">Filter Data Export</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="filter-faculty"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Fakultas
            </label>
            <Select
              value={selectedFacultyId || "all"}
              onValueChange={(val) => {
                setSelectedFacultyId(val === "all" ? "" : val);
                setSelectedStudyProgramId("");
              }}
            >
              <SelectTrigger id="filter-faculty" aria-label="Filter Fakultas" className="w-full">
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
          </div>

          <div>
            <label
              htmlFor="filter-prodi"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Program Studi
            </label>
            <Select
              value={selectedStudyProgramId || "all"}
              onValueChange={(val) => setSelectedStudyProgramId(val === "all" ? "" : val)}
              disabled={!selectedFacultyId}
            >
              <SelectTrigger id="filter-prodi" aria-label="Filter Program Studi" className="w-full">
                <SelectValue placeholder="Semua Program Studi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Program Studi</SelectItem>
                {studyPrograms.map((sp) => (
                  <SelectItem key={sp.id} value={String(sp.id)}>
                    {sp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(selectedFacultyId || selectedStudyProgramId) && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Filter diterapkan pada file hasil export.</span>
            <button
              onClick={() => {
                setSelectedFacultyId("");
                setSelectedStudyProgramId("");
              }}
              className="font-medium text-primary hover:underline"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Bibliography Export */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
                <Book className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Export Bibliografi</h3>
                <p className="text-xs text-muted-foreground">Format CSV (SLiMS / Excel)</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Export data bibliografi lengkap dengan pengarang, subjek, eksemplar, dan informasi fakultas/prodi.
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Dilengkapi opsi delimiter titik koma (;) atau koma (,) dan header UTF-8 BOM anti karakter rusak.
            </p>
          </div>
          <button
            onClick={() => handleOpenDelimiterModal("bibliography")}
            disabled={exportingBiblio}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {exportingBiblio ? (
              <Loader2 className="size-4 animate-spin" />
            ) : successBiblio ? (
              <CheckCircle className="size-4" />
            ) : (
              <FileDown className="size-4" />
            )}
            {exportingBiblio ? "Mengexport..." : successBiblio ? "Berhasil!" : "Export Bibliografi"}
          </button>
        </div>

        {/* Item Export */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <Package className="size-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Export Item / Eksemplar</h3>
                <p className="text-xs text-muted-foreground">Format CSV (Inventaris)</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Export semua item fisik eksemplar dengan nomor inventaris, lokasi rak, status ketersediaan, dan judul buku.
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Mendukung pemilihan delimiter dan filter fakultas/prodi yang saling terhubung.
            </p>
          </div>
          <button
            onClick={() => handleOpenDelimiterModal("item")}
            disabled={exportingItem}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {exportingItem ? (
              <Loader2 className="size-4 animate-spin" />
            ) : successItem ? (
              <CheckCircle className="size-4" />
            ) : (
              <FileDown className="size-4" />
            )}
            {exportingItem ? "Mengexport..." : successItem ? "Berhasil!" : "Export Item"}
          </button>
        </div>

        {/* Collection PDF Export */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950">
                <FileText className="size-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Katalog Koleksi PDF</h3>
                <p className="text-xs text-muted-foreground">Dokumen Resmi Ber-Kop</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Cetak katalog koleksi buku dalam format PDF berorientasi landscape lengkap dengan Kop Resmi Perpustakaan UMC.
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Menampilkan tabel judul buku, pengarang, ISBN, klasifikasi DDC, dan rekap total eksemplar per prodi.
            </p>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {exportingPdf ? (
              <Loader2 className="size-4 animate-spin" />
            ) : successPdf ? (
              <CheckCircle className="size-4" />
            ) : (
              <FileDown className="size-4" />
            )}
            {exportingPdf ? "Mencetak..." : successPdf ? "Berhasil Diunduh!" : "Cetak Katalog PDF"}
          </button>
        </div>
      </div>

      {/* Delimiter Selection Modal */}
      {activeExportType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-delimiter-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 id="modal-delimiter-title" className="text-lg font-bold text-foreground">
                Pilih Delimiter Format CSV
              </h3>
              <button
                onClick={() => setActiveExportType(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Tutup dialog"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              Pilih karakter pemisah kolom yang sesuai dengan aplikasi yang akan Anda gunakan untuk membuka berkas CSV ini:
            </p>

            <div className="space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                  selectedDelimiter === ";"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="delimiter"
                  value=";"
                  checked={selectedDelimiter === ";"}
                  onChange={() => setSelectedDelimiter(";")}
                  className="mt-1 accent-primary"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground">Titik Koma ( ; )</div>
                  <div className="text-xs text-muted-foreground">
                    Standar SLiMS Senayan & Microsoft Excel Region Indonesia. Direkomendasikan agar teks dan angka desimal tidak teracak.
                  </div>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                  selectedDelimiter === ","
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="delimiter"
                  value=","
                  checked={selectedDelimiter === "," || false}
                  onChange={() => setSelectedDelimiter(",")}
                  className="mt-1 accent-primary"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground">Koma ( , )</div>
                  <div className="text-xs text-muted-foreground">
                    Standar universal RFC-4180. Cocok untuk Google Sheets, database SQL, skrip Python, dan software internasional.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveExportType(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteExportCsv}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <FileDown className="size-4" />
                Unduh Berkas CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
