import { useEffect, useState, useCallback } from "react";
import {
  Book,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  Package,
  ArrowLeft,
  Users,
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Info,
  BookOpen,
  Database,
  Image as ImageIcon,
  UploadCloud,
  Check,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { bibliographyApi, type Bibliography, type BibliographyListResponse, type Location, type Item, locationApi, itemApi } from "@/api/client";

interface BibliographySectionProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function BibliographySection({
  searchTerm,
  onSearchChange,
}: BibliographySectionProps) {
  const [data, setData] = useState<BibliographyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [selectedBib, setSelectedBib] = useState<Bibliography | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBib, setEditingBib] = useState<Bibliography | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; title: string; isbnIssn?: string; authors: Array<{ name: string }>; similarity: string }>>([]);
  const [checkingDup, setCheckingDup] = useState(false);
  const limit = 10;

  const fetchData = useCallback(async (pageNum: number, query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page: pageNum, limit };
      if (query) params.q = query;
      const result = await bibliographyApi.list(params);
      setData(result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, searchTerm || undefined);
  }, [page, searchTerm, fetchData]);

  const handleSearch = () => {
    setPage(1);
    onSearchChange(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClearSearch = () => {
    setSearchInput("");
    onSearchChange("");
    setPage(1);
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const result = await bibliographyApi.getById(id);
      setSelectedBib(result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelectedBib(null);

  const handleCreate = () => {
    setEditingBib(null);
    setShowForm(true);
  };

  const handleEdit = (bib: Bibliography) => {
    setEditingBib(bib);
    setShowForm(true);
  };

  const handleDelete = async (bib: Bibliography) => {
    if (!confirm(`Arsipkan bibliografi "${bib.title}"?`)) return;
    try {
      await bibliographyApi.delete(bib.id);
      await fetchData(page, searchTerm || undefined);
      if (selectedBib?.id === bib.id) setSelectedBib(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal mengarsipkan");
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
      <BibliographyDetail
        bib={selectedBib}
        loading={detailLoading}
        onBack={closeDetail}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Bibliografi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola data bibliografi perpustakaan
            {data && (
              <span className="ml-2 text-primary font-semibold">
                ({data.total} total)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari bibliografi..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Cari
          </button>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-hover"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="size-4" />
            Tambah
          </button>
        </div>
      </div>

      {/* Table */}
      {!data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Book className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            {searchTerm ? "Tidak ada hasil" : "Belum ada bibliografi"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm
              ? `Tidak ditemukan bibliografi untuk "${searchTerm}"`
              : "Bibliografi akan muncul di sini setelah ditambahkan"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Judul</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Penulis</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Penerbit</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tahun</th>
                  <th className="px-4 py-3 text-left font-semibold text-muted-foreground">ISBN</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Stok</th>
                  <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((bib) => (
                  <tr key={bib.id} className="border-b border-border hover:bg-surface-hover/50">
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate font-medium text-foreground">
                        {bib.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[200px] truncate text-muted-foreground">
                        {bib.authors?.map((a) => a.name).join(", ") || "-"}
                        {bib.unlistedAuthorsLabel && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            +{bib.unlistedAuthorsLabel}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {bib.publisher?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {bib.publishYear || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {bib.isbnIssn || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <Package className="size-3" />
                        {bib.availableItems}/{bib.totalItems}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openDetail(bib.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
                          title="Lihat detail"
                        >
                          <Eye className="size-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(bib)}
                          className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-50 dark:bg-blue-950 hover:text-blue-600 dark:text-blue-400"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(bib)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-warning-bg hover:text-destructive"
                          title="Arsipkan"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Halaman {data.page} dari {data.totalPages} ({data.total} total)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page === data.totalPages}
                  className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// BIBLIOGRAPHY DETAIL COMPONENT
// ==========================================

function BibliographyDetail({
  bib,
  loading,
  onBack,
  onEdit,
  onDelete,
}: {
  bib: Bibliography;
  loading: boolean;
  onBack: () => void;
  onEdit: (bib: Bibliography) => void;
  onDelete: (bib: Bibliography) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(bib)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Pencil className="size-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(bib)}
            className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
          >
            <Trash2 className="size-4" />
            Arsipkan
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{bib.title}</h2>
            {bib.sor && (
              <p className="mt-1 text-sm text-muted-foreground">{bib.sor}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Package className="size-4" />
            {bib.availableItems}/{bib.totalItems} tersedia
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetaField label="ISBN/ISSN" value={bib.isbnIssn} />
          <MetaField label="Edisi" value={bib.edition} />
          <MetaField label="Penerbit" value={bib.publisher?.name} />
          <MetaField label="Tahun Terbit" value={bib.publishYear?.toString()} />
          <MetaField label="Bahasa" value={bib.language?.name} />
          <MetaField label="GMD" value={bib.gmd?.name} />
          <MetaField label="Call Number" value={bib.callNumber} />
          <MetaField label="Klasifikasi" value={bib.classification} />
          <MetaField label="Deskripsi Fisik/Kolasi" value={bib.collation} />
          <MetaField label="Seri" value={bib.seriesTitle} />
          {bib.faculties && bib.faculties.length > 0 && (
            <MetaField label="Fakultas" value={bib.faculties.map((f: any) => f.name).join(", ")} />
          )}
          {bib.studyPrograms && bib.studyPrograms.length > 0 && (
            <MetaField label="Program Studi" value={bib.studyPrograms.map((sp: any) => sp.name).join(", ")} />
          )}
        </div>

        {/* Description */}
        {bib.description && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Deskripsi</h3>
            <p className="text-sm text-muted-foreground">{bib.description}</p>
          </div>
        )}

        {/* Notes */}
        {bib.notes && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Catatan</h3>
            <p className="text-sm text-muted-foreground">{bib.notes}</p>
          </div>
        )}
      </div>

      {/* Authors */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Users className="size-4" />
          Penulis
        </h3>
        {bib.authors && bib.authors.length > 0 ? (
          <div className="space-y-2">
            {bib.authors.map((author, idx) => (
              <div
                key={author.id || idx}
                className="flex items-center gap-3 rounded-lg bg-muted px-4 py-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {author.position}
                </span>
                <span className="font-medium text-foreground">{author.name}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {author.role}
                </span>
              </div>
            ))}
            {bib.unlistedAuthorsLabel && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-950 px-4 py-2">
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  + {bib.unlistedAuthorsLabel} (penulis lainnya)
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada penulis tercatat</p>
        )}
      </div>

      {/* Subjects */}
      {bib.subjects && bib.subjects.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Tag className="size-4" />
            Subjek
          </h3>
          <div className="flex flex-wrap gap-2">
            {bib.subjects.map((subject) => (
              <span
                key={subject.id}
                className="rounded-full bg-blue-50 dark:bg-blue-950 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400"
              >
                {subject.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// BIBLIOGRAPHY FORM COMPONENT
// ==========================================

interface DuplicateItem {
  id: string; title: string; isbnIssn?: string;
  authors: Array<{ name: string }>; similarity: string;
}

interface BibliographyFormProps {
  bib: Bibliography | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BibliographyForm({ bib, onClose, onSuccess }: BibliographyFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: bib?.title || "",
    isbnIssn: bib?.isbnIssn || "",
    edition: bib?.edition || "",
    publishYear: bib?.publishYear?.toString() || "",
    collation: bib?.collation || "",
    seriesTitle: bib?.seriesTitle || "",
    callNumber: bib?.callNumber || "",
    classification: bib?.classification || "",
    notes: bib?.notes || "",
    sor: bib?.sor || "",
    description: bib?.description || "",
    type: bib?.type || "physical_book",
    image: bib?.image || "",
    isPopular: bib?.isPopular || false,
    publisherName: bib?.publisher?.name || "",
    // Extra fields from design UI
    gmdId: bib?.gmd?.id?.toString() || "1", // Defaults to Text GMD
    contentType: "Text",
    mediaType: "Unmediated",
    carrierType: "Volume",
    frequency: "Satu Kali Terbit",
    publishPlace: bib?.publicationPlace?.name || "",
  });

  const [authors, setAuthors] = useState<Array<{ name: string; role: string }>>(
    bib?.authors?.map((a) => ({ name: a.name, role: a.role })) || [{ name: "", role: "primary" }]
  );
  const [subjects, setSubjects] = useState<Array<{ name: string }>>(
    bib?.subjects?.map((s) => ({ name: s.name })) || []
  );
  const [unlistedAuthorsLabel, setUnlistedAuthorsLabel] = useState(bib?.unlistedAuthorsLabel || "");

  // Subject adding input state
  const [subjectInput, setSubjectInput] = useState("");

  // Faculty / Study Program
  const [facultyOptions, setFacultyOptions] = useState<{ id: number; name: string }[]>([]);
  const [studyProgramOptions, setStudyProgramOptions] = useState<{ id: number; name: string; facultyId: number }[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>(bib?.faculties?.map((f: any) => f.id) || []);
  const [selectedStudyProgramIds, setSelectedStudyProgramIds] = useState<number[]>(bib?.studyPrograms?.map((sp: any) => sp.id) || []);

  // Duplicate detection
  useEffect(() => {
    if (editingBib || !showForm) { setDuplicates([]); return; }
    const title = formData.title.trim();
    const isbn = formData.isbnIssn.trim().replace(/[^0-9Xx]/g, "");
    if (title.length < 3 && isbn.length < 3) { setDuplicates([]); return; }
    const timer = setTimeout(async () => {
      setCheckingDup(true);
      try {
        const params: Record<string, string> = {};
        if (isbn.length >= 3) params.isbn = isbn;
        if (title.length >= 3) params.title = title;
        if (Object.keys(params).length === 0) { setDuplicates([]); return; }
        const res = await bibliographyApi.checkDuplicate(params);
        setDuplicates(res.data.duplicates.filter((d) => d.id !== editingBib?.id) || []);
      } catch { setDuplicates([]); } finally { setCheckingDup(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [formData?.title, formData?.isbnIssn, editingBib, showForm]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [facRes, spRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/faculties`),
          fetch(`${API_BASE_URL}/api/study-programs`),
        ]);
        const facJson = await facRes.json();
        const spJson = await spRes.json();
        if (facJson.success) setFacultyOptions(facJson.data);
        if (spJson.success) setStudyProgramOptions(spJson.data);
      } catch {}
    };
    fetch();
  }, []);

  const toggleFaculty = (id: number) => {
    setSelectedFacultyIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const toggleStudyProgram = (id: number) => {
    setSelectedStudyProgramIds((prev) =>
      prev.includes(id) ? prev.filter((spid) => spid !== id) : [...prev, id]
    );
  };

  const filteredStudyPrograms = selectedFacultyIds.length > 0
    ? studyProgramOptions.filter((sp) => selectedFacultyIds.includes(sp.facultyId))
    : studyProgramOptions;

  const handleIsbnChange = (val: string) => {
    // Strip everything except digits and x/X
    let clean = val.replace(/[^0-9Xx]/g, "");
    let formatted = clean;

    if (clean.startsWith("9")) {
      // Limit to 13 digits for ISBN-13
      clean = clean.substring(0, 13);
      if (clean.length <= 3) {
        formatted = clean;
      } else if (clean.length <= 6) {
        formatted = `${clean.substring(0, 3)}-${clean.substring(3)}`;
      } else if (clean.length <= 9) {
        formatted = `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6)}`;
      } else if (clean.length <= 12) {
        formatted = `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6, 9)}-${clean.substring(9)}`;
      } else {
        formatted = `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6, 9)}-${clean.substring(9, 12)}-${clean.substring(12)}`;
      }
    } else {
      // Limit to 8 characters for ISSN
      clean = clean.substring(0, 8);
      if (clean.length <= 4) {
        formatted = clean;
      } else {
        formatted = `${clean.substring(0, 4)}-${clean.substring(4)}`;
      }
    }

    setFormData((prev) => ({ ...prev, isbnIssn: formatted }));
  };

  // Step 3: Copies & Inventory states
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // New items added locally (for new bibliography)
  const [localNewItems, setLocalNewItems] = useState<Array<{ itemCode: string; inventoryCode?: string; locationId: number; locationName: string }>>([]);

  // Form for adding single copy
  const [polaKodeItem, setPolaKodeItem] = useState("");
  const [inventoryCodeInput, setInventoryCodeInput] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  const handleGenerateCode = async () => {
    if (!bib && localNewItems.length === 0) {
      setStep3Error("Simpan bibliografi terlebih dahulu, atau tambahkan item manual");
      return;
    }
    const bibId = bib?.id;
    if (!bibId) {
      setStep3Error("Bibliografi belum disimpan. Gunakan input manual untuk kode item.");
      return;
    }
    setGeneratingCode(true);
    setStep3Error(null);
    try {
      const res = await itemApi.generateCode(bibId);
      setPolaKodeItem(res.data.itemCode);
    } catch (err: unknown) {
      setStep3Error(err instanceof Error ? err.message : "Gagal generate kode item");
    } finally {
      setGeneratingCode(false);
    }
  };

  // Load locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const result = await locationApi.list();
        setLocations(result.data || []);
        if (result.data && result.data.length > 0) {
          setSelectedLocationId(result.data[0].id.toString());
        }
      } catch (err) {
        console.error("Gagal memuat lokasi", err);
      }
    };
    loadLocations();
  }, []);

  // Load existing items if editing
  const loadItems = useCallback(async () => {
    if (!bib) return;
    setItemsLoading(true);
    try {
      const result = await bibliographyApi.getItems(bib.id);
      setItemsList(result.data || []);
    } catch (err) {
      console.error("Gagal memuat eksemplar", err);
    } finally {
      setItemsLoading(false);
    }
  }, [bib]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addAuthor = () => setAuthors([...authors, { name: "", role: "primary" }]);
  const removeAuthor = (idx: number) => {
    if (authors.length > 1) {
      setAuthors(authors.filter((_, i) => i !== idx));
    } else {
      setAuthors([{ name: "", role: "primary" }]);
    }
  };
  const updateAuthor = (idx: number, field: string, value: string) => {
    const updated = [...authors];
    updated[idx] = { ...updated[idx], [field]: value };
    setAuthors(updated);
  };

  const handleAddSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = subjectInput.trim();
    if (!val) return;
    if (subjects.some((s) => s.name.toLowerCase() === val.toLowerCase())) {
      setSubjectInput("");
      return;
    }
    setSubjects([...subjects, { name: val }]);
    setSubjectInput("");
  };

  const removeSubject = (idx: number) => {
    setSubjects(subjects.filter((_, i) => i !== idx));
  };

  // Step 3 Copy Handlers
  const handleSaveCopy = async () => {
    setStep3Error(null);
    const code = polaKodeItem.trim();
    if (!code) {
      setStep3Error("Kode item tidak boleh kosong");
      return;
    }
    if (!selectedLocationId) {
      setStep3Error("Silakan pilih tipe koleksi / lokasi");
      return;
    }

    const locId = parseInt(selectedLocationId);
    const locObj = locations.find((l) => l.id === locId);
    const locName = locObj ? `${locObj.room} - ${locObj.rack} - ${locObj.shelf}` : "Sirkulasi";
    const invCode = inventoryCodeInput.trim() || undefined;

    if (bib) {
      // Editing Mode: Save to DB immediately
      try {
        setItemsLoading(true);
        const res = await itemApi.create(bib.id, {
          itemCode: code,
          locationId: locId,
          inventoryCode: invCode,
          status: "available",
        });
        if (res.success) {
          setPolaKodeItem("");
          setInventoryCodeInput("");
          await loadItems();
        } else {
          setStep3Error(res.message || "Gagal menyimpan eksemplar");
        }
      } catch (err: unknown) {
        setStep3Error(err instanceof Error ? err.message : "Kode item sudah digunakan atau error sistem");
      } finally {
        setItemsLoading(false);
      }
    } else {
      // Creating Mode: Save to local state array
      if (localNewItems.some((item) => item.itemCode.toLowerCase() === code.toLowerCase())) {
        setStep3Error("Kode item sudah ada di daftar");
        return;
      }
      setLocalNewItems([...localNewItems, { itemCode: code, inventoryCode: invCode, locationId: locId, locationName: locName }]);
      setPolaKodeItem("");
      setInventoryCodeInput("");
    }
  };

  const handleDeleteCopy = async (indexOrId: number | string, itemCode: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus salinan item "${itemCode}"?`)) return;

    if (bib && typeof indexOrId === "string") {
      // Editing Mode: Delete from DB immediately
      try {
        setItemsLoading(true);
        await itemApi.delete(indexOrId);
        await loadItems();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Gagal menghapus eksemplar");
      } finally {
        setItemsLoading(false);
      }
    } else if (typeof indexOrId === "number") {
      // Creating Mode: Filter local list
      setLocalNewItems(localNewItems.filter((_, i) => i !== indexOrId));
    }
  };

  // Step 4 File Upload Handlers (read cover as Base64)
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert("Ukuran gambar melebihi 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // PDF file mock upload
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const handleDigitalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDigitalFile(file);
    }
  };

  // Submit all steps
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Auto-format ISBN / ISSN — send clean digits only
    let formattedIsbn = formData.isbnIssn.trim();
    if (formattedIsbn) {
      const clean = formattedIsbn.replace(/[^0-9Xx]/g, "");
      if (clean.length === 10 || clean.length === 13) {
        formattedIsbn = clean;
      } else if (clean.length === 8) {
        formattedIsbn = `ISSN ${clean.substring(0, 4)}-${clean.substring(4, 8).toUpperCase()}`;
      }
    }

    try {
      const payload = {
        ...formData,
        isbnIssn: formattedIsbn || undefined,
        publishYear: formData.publishYear ? parseInt(formData.publishYear) : undefined,
        authors: authors.filter((a) => a.name.trim()),
        subjects: subjects.filter((s) => s.name.trim()),
        unlistedAuthorsLabel: unlistedAuthorsLabel || undefined,
        gmdId: formData.gmdId ? parseInt(formData.gmdId) : undefined,
        facultyIds: selectedFacultyIds.length > 0 ? selectedFacultyIds : undefined,
        studyProgramIds: selectedStudyProgramIds.length > 0 ? selectedStudyProgramIds : undefined,
      };

      if (bib) {
        // Update Bibliography
        await bibliographyApi.update(bib.id, payload);
        onSuccess();
      } else {
        // Create Bibliography
        const res = await bibliographyApi.create(payload);
        const newBib = res.data;

        // If there are local items to add, create them now
        if (localNewItems.length > 0 && newBib?.id) {
          await itemApi.bulkCreate(newBib.id, {
            items: localNewItems.map((item) => ({
              itemCode: item.itemCode,
              locationId: item.locationId,
              ...(item.inventoryCode ? { inventoryCode: item.inventoryCode } : {}),
            })),
          });
        }
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bibliografi");
    } finally {
      setLoading(false);
    }
  };

  // Navigation validation
  const nextStep = () => {
    if (step === 1) {
      if (!formData.title.trim()) {
        setError("Judul buku wajib diisi");
        return;
      }
      if (authors.some((a) => !a.name.trim())) {
        setError("Silakan isi nama penulis atau hapus baris kosong");
        return;
      }
    }
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  // Rendering step indicator UI
  const stepsConfig = [
    { num: 1, label: "1. Informasi Dasar & Pengarang", icon: Info },
    { num: 2, label: "2. Penerbitan & Klasifikasi", icon: BookOpen },
    { num: 3, label: "3. Inventaris & Salinan", icon: Database },
    { num: 4, label: "4. Konten, Sampul & Berkas", icon: ImageIcon },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {bib ? "Edit Bibliografi" : "Tambah Bibliografi Baru"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Isi rincian data buku lengkap sesuai dengan format standar katalogisasi bibliografi
          </p>
        </div>
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <ArrowLeft className="size-4" />
            Kembali ke Daftar
          </button>
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-2">
          {stepsConfig.map((item) => {
            const isActive = step === item.num;
            const isCompleted = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => {
                  if (item.num < step || (item.num === 2 && formData.title.trim())) {
                    setStep(item.num);
                  }
                }}
                className={`flex items-center gap-3 py-3 px-2 border-b-2 transition-all text-left ${
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : isCompleted
                    ? "border-success/80 text-success/80 font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs transition-all ${
                    isActive
                      ? "bg-primary text-white"
                      : isCompleted
                      ? "bg-success text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="size-4" /> : item.num}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Langkah {item.num}
                  </span>
                  <span className="text-sm line-clamp-1">{item.label.substring(3)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-warning-border bg-warning-bg p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="size-5 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">{duplicates.some((d) => d.similarity === "isbn") ? "ISBN sudah terdaftar" : "Judul serupa ditemukan"}</span>
            {checkingDup && <Loader2 className="size-4 animate-spin text-amber-600" />}
          </div>
          <div className="space-y-2">
            {duplicates.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-900 truncate">{d.title}</p>
                  <p className="text-xs text-amber-700">{d.authors.map((a) => a.name).join(", ")}{d.isbnIssn ? ` — ${d.isbnIssn}` : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openDetail(d.id)}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline"
                >
                  Lihat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wizard Form Panels */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: INFORMASI DASAR & PENGARANG */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Informasi Utama Buku
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Judul Buku *
                </label>
                <input
                  type="text"
                  placeholder="Masukkan judul utama buku"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Edisi / Cetakan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Edisi Revisi, Cetakan ke-3"
                  value={formData.edition}
                  onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Pernyataan Tanggung Jawab (Statement of Responsibility)
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama penulis, editor, atau penerjemah"
                  value={formData.sor}
                  onChange={(e) => setFormData({ ...formData, sor: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  General Material Designation (GMD)
                </label>
                <select
                  value={formData.gmdId}
                  onChange={(e) => setFormData({ ...formData, gmdId: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                >
                  <option value="1">Text</option>
                  <option value="2">Electronic</option>
                  <option value="3">Audio</option>
                  <option value="4">Video</option>
                  <option value="5">Image</option>
                  <option value="6">Map</option>
                  <option value="7">Mixed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tipe Koleksi
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                >
                  <option value="physical_book">Buku Fisik</option>
                  <option value="ebook">E-Book</option>
                  <option value="journal">Jurnal</option>
                  <option value="thesis">Skripsi</option>
                </select>
              </div>
            </div>

            {/* Author List */}
            <div className="border border-border rounded-xl p-4 bg-muted/40 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Daftar Pengarang / Penulis
                </label>
                <button
                  type="button"
                  onClick={addAuthor}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-all"
                >
                  <Plus className="size-3.5" />
                  Tambah Pengarang
                </button>
              </div>

              <div className="space-y-3">
                {authors.map((author, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <select
                      value={author.role}
                      onChange={(e) => updateAuthor(idx, "role", e.target.value)}
                      className="w-1/4 rounded-lg border border-border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="primary">Utama</option>
                      <option value="secondary">Tambahan</option>
                      <option value="editor">Penyunting</option>
                      <option value="translator">Penerjemah</option>
                    </select>
                    <input
                      type="text"
                      value={author.name}
                      onChange={(e) => updateAuthor(idx, "name", e.target.value)}
                      placeholder="Ketikkan nama penulis lengkap"
                      required
                      className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeAuthor(idx)}
                      className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors shrink-0"
                    >
                      <Trash2 className="size-4.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border/60">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Label Penulis Tambahan Lainnya (cth: dkk, et al.)
                </label>
                <input
                  type="text"
                  value={unlistedAuthorsLabel}
                  onChange={(e) => setUnlistedAuthorsLabel(e.target.value)}
                  placeholder="cth: dkk"
                  className="w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>
            </div>

            {/* Carrier, Media, Content Type Dropdowns */}
            <div className="grid gap-4 md:grid-cols-3 pt-4 border-t border-border">
              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tipe Isi (Content Type)
                </label>
                <select
                  value={formData.contentType}
                  onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                >
                  <option value="Text">Text</option>
                  <option value="Performed Music">Performed Music</option>
                  <option value="Spoken Word">Spoken Word</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tipe Media (Media Type)
                </label>
                <select
                  value={formData.mediaType}
                  onChange={(e) => setFormData({ ...formData, mediaType: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                >
                  <option value="Unmediated">Unmediated</option>
                  <option value="Computer">Computer</option>
                  <option value="Microform">Microform</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tipe Pembawa (Carrier Type)
                </label>
                <select
                  value={formData.carrierType}
                  onChange={(e) => setFormData({ ...formData, carrierType: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                >
                  <option value="Volume">Volume</option>
                  <option value="Online Resource">Online Resource</option>
                  <option value="Microfiche">Microfiche</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: PENERBITAN & KLASIFIKASI */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Rincian Penerbitan & Klasifikasi
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  ISBN / ISSN
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 978-090-231-122-6"
                  value={formData.isbnIssn}
                  onChange={(e) => handleIsbnChange(e.target.value)}
                  maxLength={17}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tahun Terbit
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 2026"
                  value={formData.publishYear}
                  onChange={(e) => setFormData({ ...formData, publishYear: e.target.value })}
                  min="1000"
                  max="9999"
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Frekuensi Penerbitan
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                >
                  <option value="Satu Kali Terbit">Satu Kali Terbit</option>
                  <option value="Mingguan">Mingguan</option>
                  <option value="Bulanan">Bulanan</option>
                  <option value="Tahunan">Tahunan</option>
                  <option value="Tidak Teratur">Tidak Teratur</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Penerbit (Publisher)
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama penerbit"
                  value={formData.publisherName}
                  onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tempat Terbit
                </label>
                <input
                  type="text"
                  placeholder="Nama kota terbit"
                  value={formData.publishPlace}
                  onChange={(e) => setFormData({ ...formData, publishPlace: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Deskripsi Fisik / Kolasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: x, 248 hlm.: ilus; 21 cm."
                  value={formData.collation}
                  onChange={(e) => setFormData({ ...formData, collation: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Judul Seri (Series Title)
                </label>
                <input
                  type="text"
                  placeholder="Masukkan judul seri jika ada"
                  value={formData.seriesTitle}
                  onChange={(e) => setFormData({ ...formData, seriesTitle: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Klasifikasi (Classification)
                </label>
                <input
                  type="text"
                  placeholder="Kode klasifikasi DDC"
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Nomor Panggil (Call Number)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 371.4 ANW b"
                  value={formData.callNumber}
                  onChange={(e) => setFormData({ ...formData, callNumber: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>
            </div>

            {/* Faculty / Study Program Multiselect */}
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Fakultas & Program Studi</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Fakultas</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-lg">
                    {facultyOptions.length === 0 && <span className="text-xs text-muted-foreground">Memuat...</span>}
                    {facultyOptions.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFaculty(f.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                          selectedFacultyIds.includes(f.id)
                            ? "bg-primary text-white border-primary"
                            : "bg-muted text-muted-foreground border-border hover:border-primary"
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Program Studi</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-lg">
                    {filteredStudyPrograms.length === 0 && <span className="text-xs text-muted-foreground">Pilih fakultas terlebih dahulu</span>}
                    {filteredStudyPrograms.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => toggleStudyProgram(sp.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${
                          selectedStudyProgramIds.includes(sp.id)
                            ? "bg-primary text-white border-primary"
                            : "bg-muted text-muted-foreground border-border hover:border-primary"
                        }`}
                      >
                        {sp.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer"
                />
                <label
                  htmlFor="isPopular"
                  className="text-sm font-semibold text-foreground cursor-pointer select-none"
                >
                  Tampilkan di Beranda (Buku Populer)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INVENTARIS & SALINAN */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Manajemen Inventaris & Salinan Buku
            </h3>

            {/* OPSI POLA KODE ITEM INVENTARISASI */}
            <div className="border border-border rounded-xl p-5 bg-muted/40 space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                OPSI POLA KODE ITEM INVENTARISASI
              </h4>

              {step3Error && (
                <p className="text-xs text-destructive font-medium bg-red-50 p-2 rounded border border-red-200">
                  {step3Error}
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-4 items-end">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                    Kode Item
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Otomatis jika klik Generate"
                      value={polaKodeItem}
                      onChange={(e) => setPolaKodeItem(e.target.value.replace(/\s/g, ""))}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                      className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      {generatingCode ? <Loader2 className="size-4 animate-spin" /> : "Generate"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                    Kode Inventaris
                  </label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    value={inventoryCodeInput}
                    onChange={(e) => setInventoryCodeInput(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                    Tipe Koleksi / Lokasi
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.room} - Rak {loc.rack} (Shelf {loc.shelf})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleSaveCopy}
                    className="w-full rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/95 transition-all"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>

            {/* SALINAN FISIK & LOKASI BUKU */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  SALINAN FISIK & LOKASI BUKU
                </h4>
                <div className="text-sm font-medium text-muted-foreground">
                  Jumlah Salinan:{" "}
                  <span className="font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-lg">
                    {bib ? itemsList.length : localNewItems.length}
                  </span>
                </div>
              </div>

              {itemsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/70 text-muted-foreground text-xs uppercase font-bold border-b border-border">
                        <th className="px-4 py-3">Kode Item</th>
                        <th className="px-4 py-3">Lokasi / Rak</th>
                        <th className="px-4 py-3">Status Ketersediaan</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* For Editing Mode */}
                      {bib &&
                        (itemsList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              Belum ada eksemplar fisik. Silakan input kode item di atas.
                            </td>
                          </tr>
                        ) : (
                          itemsList.map((item) => (
                            <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                              <td className="px-4 py-3 font-semibold text-foreground">
                                {item.itemCode}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {item.location
                                  ? `${item.location.room} - Rak ${item.location.rack} (${item.location.shelf})`
                                  : "Sirkulasi"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    item.status === "available"
                                      ? "bg-success/10 text-success"
                                      : "bg-amber-500/10 text-amber-600"
                                  }`}
                                >
                                  {item.status === "available" ? "Tersedia" : item.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCopy(item.id, item.itemCode)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ))}

                      {/* For Creating Mode */}
                      {!bib &&
                        (localNewItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              Belum ada eksemplar fisik. Silakan input kode item di atas.
                            </td>
                          </tr>
                        ) : (
                          localNewItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-border hover:bg-muted/30">
                              <td className="px-4 py-3 font-semibold text-foreground">
                                {item.itemCode}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {item.locationName}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                                  Tersedia
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCopy(idx, item.itemCode)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: KONTEN, SAMPUL & BERKAS */}
        {step === 4 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Konten, Sampul & Lampiran Digital
            </h3>

            {/* Keyword / Subjects */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Subyek / Kata Kunci Buku
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tambah subjek baru"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubject()}
                  className="rounded-lg bg-sidebar px-4 py-2 text-sm font-semibold text-white hover:bg-sidebar/95 transition-all"
                >
                  Tambah
                </button>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 border border-border rounded-xl">
                  {subjects.map((subj, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary border border-primary/20"
                    >
                      {subj.name}
                      <button
                        type="button"
                        onClick={() => removeSubject(idx)}
                        className="text-primary hover:text-red-700 font-bold ml-1 rounded-full hover:bg-primary/15 p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Cover and Visual Preview block */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Unggah Gambar Sampul Buku
                </label>
                <div className="relative border-2 border-dashed border-border hover:border-primary/50 transition-all rounded-xl p-8 bg-muted/20 text-center flex flex-col items-center justify-center gap-3 group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="size-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-sm font-medium text-foreground">
                    Klik untuk jelajah berkas atau tarik gambar ke sini
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Hanya file JPG, JPEG atau PNG. Maksimal 1MB
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Atau Masukkan URL Gambar Sampul
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                  />
                </div>
              </div>

              {/* PRATINJAU SAMPUL VISUAL */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Pratinjau Sampul Visual
                </label>
                <div className="border border-border rounded-xl p-4 bg-muted/30 flex items-start gap-4 h-[180px] overflow-hidden">
                  <div className="relative w-28 h-full bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Preview cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Book className="size-12 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex flex-col justify-center h-full space-y-2 py-1">
                    <h4 className="font-bold text-base text-foreground line-clamp-2">
                      {formData.title || "Judul Buku"}
                    </h4>
                    <p className="text-sm text-muted-foreground font-semibold line-clamp-1">
                      {authors.filter((a) => a.name.trim()).map((a) => a.name).join(", ") || "Penulis"}
                    </p>
                    <p className="text-xs text-muted-foreground/80 font-mono line-clamp-1">
                      {formData.isbnIssn || "ISBN:"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lampiran Berkas Digital */}
            <div className="space-y-3 pt-4 border-t border-border">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Lampiran Berkas Digital (E-BOOK/PDF)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs px-4 py-2.5 rounded-lg border border-border transition-all">
                  Browse...
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleDigitalFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-muted-foreground">
                  {digitalFile ? digitalFile.name : "No file selected."}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Action Controls */}
        <div className="flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-sm">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
            >
              Batalkan
            </button>
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
              >
                Sebelumnya
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/95 transition-all"
              >
                Selanjutnya
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/95 disabled:opacity-50 transition-all"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {bib ? "Simpan Perubahan" : "Simpan Bibliografi"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// META FIELD COMPONENT
// ==========================================

function MetaField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
