import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import {
  bibliographyApi,
  type Bibliography,
  type BibliographyListResponse,
  facultyApi,
  type Faculty,
  studyProgramApi,
  type StudyProgram,
  exportApi,
} from "@/api/client";

import QuickAddItemModal from "./bibliography/QuickAddItemModal";
import DeleteBibliographyDialog from "./bibliography/DeleteBibliographyDialog";
import BibliographyDetail from "./bibliography/BibliographyDetail";
import BibliographyForm from "./bibliography/BibliographyForm";
import BibliographyFilterBar, { type ColumnDef } from "./bibliography/BibliographyFilterBar";
import BibliographyTable from "./bibliography/BibliographyTable";

interface BibliographySectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onViewItems?: (bib: Bibliography) => void;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "fakultasProdi", label: "Fakultas & Prodi" },
  { key: "penulis", label: "Penulis" },
  { key: "penerbit", label: "Penerbit" },
  { key: "tahun", label: "Tahun" },
  { key: "isbn", label: "ISBN / ISSN" },
  { key: "stok", label: "Stok" },
];

const DEFAULT_COLUMNS: Set<string> = new Set([
  "fakultasProdi",
  "penulis",
  "penerbit",
  "tahun",
  "isbn",
  "stok",
]);

export default function BibliographySection({
  searchTerm,
  onSearchChange,
  onViewItems,
}: BibliographySectionProps) {
  const [data, setData] = useState<BibliographyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [selectedStudyProgramId, setSelectedStudyProgramId] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [selectedBib, setSelectedBib] = useState<Bibliography | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBib, setEditingBib] = useState<Bibliography | null>(null);
  const [quickAddBib, setQuickAddBib] = useState<Bibliography | null>(null);
  const { canAdd, canEdit, canDelete } = useRolePermissions();
  const limit = 10;

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("bibliography-visible-columns");
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        return new Set(parsed);
      }
    } catch (err) {
      console.warn("Failed to load column visibility from localStorage:", err);
    }
    return DEFAULT_COLUMNS;
  });

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        "bibliography-visible-columns",
        JSON.stringify(Array.from(visibleColumns))
      );
    } catch (err) {
      console.warn("Failed to save column visibility to localStorage:", err);
    }
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Always keep at least 1 column visible
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  useEffect(() => {
    facultyApi
      .list()
      .then((res) => {
        setFaculties(res.data || []);
      })
      .catch(() => {});

    studyProgramApi
      .list()
      .then((res) => {
        setStudyPrograms(res.data || []);
      })
      .catch(() => {});
  }, []);

  const availableStudyPrograms = selectedFacultyId
    ? studyPrograms.filter(
        (sp) =>
          sp.facultyId === Number(selectedFacultyId) ||
          sp.faculty?.id === Number(selectedFacultyId)
      )
    : studyPrograms;

  const handleFacultyFilterChange = (facultyId: string) => {
    setSelectedFacultyId(facultyId === "all" ? "" : facultyId);
    if (facultyId !== "all" && selectedStudyProgramId) {
      const belongs = studyPrograms.some(
        (sp) =>
          String(sp.id) === selectedStudyProgramId &&
          (sp.facultyId === Number(facultyId) ||
            sp.faculty?.id === Number(facultyId))
      );
      if (!belongs) {
        setSelectedStudyProgramId("");
      }
    }
    setPage(1);
  };

  const handleStudyProgramFilterChange = (studyProgramId: string) => {
    setSelectedStudyProgramId(studyProgramId === "all" ? "" : studyProgramId);
    if (studyProgramId !== "all") {
      const found = studyPrograms.find((sp) => String(sp.id) === studyProgramId);
      if (found && (!selectedFacultyId || Number(selectedFacultyId) !== found.facultyId)) {
        setSelectedFacultyId(String(found.facultyId));
      }
    }
    setPage(1);
  };

  const fetchData = useCallback(
    async (
      pageNum: number,
      query?: string,
      facultyId?: string,
      studyProgramId?: string,
      signal?: AbortSignal
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = { page: pageNum, limit };
        if (query) params.q = query;
        if (facultyId) params.facultyId = Number(facultyId);
        if (studyProgramId) params.studyProgramId = Number(studyProgramId);
        const result = await bibliographyApi.list(params, { signal });
        setData(result.data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(
      page,
      searchTerm || undefined,
      selectedFacultyId || undefined,
      selectedStudyProgramId || undefined,
      controller.signal
    );
    return () => {
      controller.abort();
    };
  }, [page, searchTerm, selectedFacultyId, selectedStudyProgramId, fetchData]);

  const handleSearch = () => {
    setPage(1);
    onSearchChange(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSelectedFacultyId("");
    setSelectedStudyProgramId("");
    onSearchChange("");
    setPage(1);
  };

  const { success: toastSuccess, error: toastError } = useToast();
  const [deduplicating, setDeduplicating] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportApi.downloadBibliographies({
        facultyId: selectedFacultyId ? Number(selectedFacultyId) : undefined,
        studyProgramId: selectedStudyProgramId ? Number(selectedStudyProgramId) : undefined,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export gagal");
    } finally {
      setExporting(false);
    }
  };

  const handleDeduplicate = async () => {
    if (
      !confirm(
        "Jalankan deduplikasi katalog? Sistem akan menggabungkan eksemplar ke satu judul utama dan membersihkan record duplikat yang kosong."
      )
    ) {
      return;
    }
    setDeduplicating(true);
    try {
      const res = await bibliographyApi.deduplicate();
      const d = res.data;
      await fetchData(1, searchTerm || undefined);
      toastSuccess(
        "Deduplikasi Berhasil",
        `Diproses: ${d.processedGroups} grup judul, ${d.cleanedDuplicates} record duplikat dibersihkan.`
      );
    } catch (err: unknown) {
      toastError(
        "Deduplikasi Gagal",
        err instanceof Error ? err.message : "Terjadi kesalahan saat deduplikasi"
      );
    } finally {
      setDeduplicating(false);
    }
  };

  const handleCreate = () => {
    setEditingBib(null);
    setShowForm(true);
  };

  const handleEdit = (bib: Bibliography) => {
    setEditingBib(bib);
    setShowForm(true);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await bibliographyApi.getById(id);
      setSelectedBib(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedBib(null);
  };

  const [bibToDelete, setBibToDelete] = useState<Bibliography | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (bib: Bibliography) => {
    setBibToDelete(bib);
  };

  const handleConfirmDelete = async () => {
    if (!bibToDelete) return;
    setIsDeleting(true);
    try {
      await bibliographyApi.delete(bibToDelete.id);
      toastSuccess(
        "Bibliografi Dihapus",
        `Bibliografi "${bibToDelete.title}" beserta seluruh eksemplarnya telah dihapus.`
      );
      if (selectedBib?.id === bibToDelete.id) setSelectedBib(null);
      setBibToDelete(null);
      await fetchData(page, searchTerm || undefined);
    } catch (err: unknown) {
      toastError(
        "Gagal Menghapus",
        err instanceof Error ? err.message : "Terjadi kesalahan saat menghapus bibliografi."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingBib(null);
  };

  const handleFormSuccess = async () => {
    setShowForm(false);
    setEditingBib(null);
    await fetchData(page, searchTerm || undefined);
  };

  // Detail View
  if (selectedBib) {
    return (
      <>
        <BibliographyDetail
          bib={selectedBib}
          loading={detailLoading}
          onBack={closeDetail}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewItems={onViewItems}
        />
        <DeleteBibliographyDialog
          bib={bibToDelete}
          isOpen={Boolean(bibToDelete)}
          onClose={() => setBibToDelete(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      </>
    );
  }

  // Form View
  if (showForm) {
    return (
      <BibliographyForm
        bib={editingBib}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    );
  }

  // List View
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-warning-border bg-warning-bg p-8 text-center">
        <AlertCircle className="mx-auto mb-4 size-12 text-red-400" />
        <h3 className="text-lg font-semibold text-destructive">Error</h3>
        <p className="mt-2 text-sm text-destructive">{error}</p>
        <button
          onClick={() => fetchData(page, searchTerm || undefined)}
          className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
        >
          <RefreshCw className="mr-2 inline size-4" />
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BibliographyFilterBar
        dataTotal={data?.total}
        faculties={faculties}
        availableStudyPrograms={availableStudyPrograms}
        selectedFacultyId={selectedFacultyId}
        selectedStudyProgramId={selectedStudyProgramId}
        searchInput={searchInput}
        searchTerm={searchTerm}
        visibleColumns={visibleColumns}
        allColumns={ALL_COLUMNS}
        defaultColumns={DEFAULT_COLUMNS}
        exporting={exporting}
        deduplicating={deduplicating}
        canAddBib={canAdd("bibliographies")}
        onFacultyChange={handleFacultyFilterChange}
        onStudyProgramChange={handleStudyProgramFilterChange}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onExport={handleExport}
        onDeduplicate={handleDeduplicate}
        onCreate={handleCreate}
        onToggleColumn={toggleColumn}
        onSetVisibleColumns={setVisibleColumns}
      />

      <BibliographyTable
        data={data}
        searchTerm={searchTerm}
        visibleColumns={visibleColumns}
        canAddItems={canAdd("items")}
        canEditBib={canEdit("bibliographies")}
        canDeleteBib={canDelete("bibliographies")}
        onViewItems={onViewItems}
        onQuickAddItem={(bib) => setQuickAddBib(bib)}
        onOpenDetail={openDetail}
        onEditBib={handleEdit}
        onDeleteBib={handleDelete}
        onPageChange={setPage}
      />

      {/* Modal Tambah Eksemplar Cepat */}
      <QuickAddItemModal
        bib={quickAddBib}
        onClose={() => setQuickAddBib(null)}
        onSuccess={() => fetchData(page, searchTerm || undefined)}
      />

      {/* Modal Konfirmasi Hapus Bibliografi & Eksemplar */}
      <DeleteBibliographyDialog
        bib={bibToDelete}
        isOpen={Boolean(bibToDelete)}
        onClose={() => setBibToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
