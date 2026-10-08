import { useState, useEffect } from "react";
import {
  FileDown,
  Book,
  Package,
  Loader2,
  CheckCircle,
  AlertCircle,
  Filter,
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

  const [exportingBiblio, setExportingBiblio] = useState(false);
  const [exportingItem, setExportingItem] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBiblio, setSuccessBiblio] = useState(false);
  const [successItem, setSuccessItem] = useState(false);

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

  const handleExportBibliographies = async () => {
    setExportingBiblio(true);
    setError(null);
    setSuccessBiblio(false);
    try {
      await exportApi.downloadBibliographies({
        facultyId: selectedFacultyId ? Number(selectedFacultyId) : undefined,
        studyProgramId: selectedStudyProgramId ? Number(selectedStudyProgramId) : undefined,
      });
      setSuccessBiblio(true);
      setTimeout(() => setSuccessBiblio(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export gagal");
    } finally {
      setExportingBiblio(false);
    }
  };

  const handleExportItems = async () => {
    setExportingItem(true);
    setError(null);
    setSuccessItem(false);
    try {
      await exportApi.downloadItems({
        facultyId: selectedFacultyId ? Number(selectedFacultyId) : undefined,
        studyProgramId: selectedStudyProgramId ? Number(selectedStudyProgramId) : undefined,
      });
      setSuccessItem(true);
      setTimeout(() => setSuccessItem(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export gagal");
    } finally {
      setExportingItem(false);
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

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Bibliography Export */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950">
              <Book className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Export Bibliografi</h3>
              <p className="text-xs text-muted-foreground">Format Senayan CSV</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Export semua data bibliografi dengan informasi penulis, subjek, dan kode item.
            Format: CSV dengan delimiter titik koma, encoding UTF-8 dengan BOM.
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Catatan: Token QR dan ID internal tidak disertakan dalam export.
          </p>
          <button
            onClick={handleExportBibliographies}
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
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950">
              <Package className="size-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Export Item / Eksemplar</h3>
              <p className="text-xs text-muted-foreground">Format Senayan CSV</p>
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Export semua data item dengan informasi lokasi, status, dan metadata.
            Format: CSV dengan delimiter titik koma, encoding UTF-8 dengan BOM.
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Catatan: Token QR dan UUID internal tidak disertakan dalam export.
          </p>
          <button
            onClick={handleExportItems}
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
      </div>
    </div>
  );
}
