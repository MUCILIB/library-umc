import { useState, useEffect, useCallback } from "react";
import {
  BookMarked,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RotateCcw,
  Trash2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import recommendationService, {
  type Recommendation,
} from "@/services/recommendationService";
import { useToast } from "@/hooks/useToast";
import { formatDateID } from "@/utils/format";
import LecturerRecommendationModal from "./LecturerRecommendationModal";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  className?: string;
  hideHeaderActions?: boolean;
}

export default function LecturerRecommendationList({ className = "" }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toast = useToast();

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await recommendationService.getMyRecommendations();
      setRecommendations(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal", err.message || "Gagal memuat daftar rekomendasi buku");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Batalkan usulan buku "${title}"?`)) {
      return;
    }

    try {
      setDeletingId(id);
      await recommendationService.deleteMyRecommendation(id);
      toast.success("Berhasil", "Usulan buku berhasil dibatalkan.");
      setRecommendations((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      toast.error("Gagal", err.message || "Gagal membatalkan usulan.");
    } finally {
      setDeletingId(null);
    }
  };

  // Stats calculation
  const totalCount = recommendations.length;
  const pendingCount = recommendations.filter((r) => r.status === "pending").length;
  const approvedCount = recommendations.filter((r) => r.status === "approved").length;
  const rejectedCount = recommendations.filter((r) => r.status === "rejected").length;

  // Filtered recommendations
  const filteredData = recommendations.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.publisher || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.isbn || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60">
            <Clock size={12} className="shrink-0" />
            <span>Menunggu</span>
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60">
            <CheckCircle size={12} className="shrink-0" />
            <span>Disetujui</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-destructive dark:bg-red-950/60 dark:text-red-300 border border-red-200/60 dark:border-red-900/60">
            <XCircle size={12} className="shrink-0" />
            <span>Ditolak</span>
          </span>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner / Hero Info */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookMarked size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                Rekomendasi Buku Dosen
              </h2>
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Role Dosen
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
              Usulkan buku teks atau referensi ke perpustakaan untuk mendukung perkuliahan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:bg-primary/90 transition-all cursor-pointer shrink-0"
        >
          <Plus size={16} />
          <span>Usulkan Buku Baru</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Usulan</p>
            <BookOpen size={15} className="text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-foreground mt-1.5">{totalCount}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Menunggu</p>
            <Clock size={15} className="text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">{pendingCount}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Disetujui</p>
            <CheckCircle size={15} className="text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{approvedCount}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ditolak</p>
            <XCircle size={15} className="text-destructive" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-destructive mt-1.5">{rejectedCount}</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status Tabs */}
        <div className="grid grid-cols-4 sm:flex items-center p-1 bg-muted/80 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
              filter === "all"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
              filter === "pending"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Menunggu ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("approved")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
              filter === "approved"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Disetujui ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("rejected")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
              filter === "rejected"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Ditolak ({rejectedCount})
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative grow md:w-64">
            <Search size={14} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari judul, penulis, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-muted/50 border border-border rounded-xl font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
            />
          </div>

          <button
            type="button"
            onClick={fetchRecommendations}
            className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl transition-all cursor-pointer shrink-0"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Main Content: Responsive Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="size-9 rounded-xl" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="flex justify-between pt-2 border-t border-border">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-card border border-border border-dashed rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <Sparkles size={24} />
          </div>
          <h3 className="text-base font-bold text-foreground">
            {searchQuery
              ? "Tidak ada usulan yang cocok"
              : filter !== "all"
              ? `Belum ada usulan dengan status "${filter}"`
              : "Belum Ada Usulan Koleksi Buku"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mt-1 mb-5 leading-relaxed">
            {searchQuery
              ? "Coba sesuaikan kata kunci pencarian atau ubah tab status filter."
              : "Sebagai Dosen, Anda dapat mengusulkan pengadaan buku referensi baru untuk perpustakaan UMC kapan saja."}
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-semibold text-xs shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Usulkan Buku Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredData.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 h-full"
            >
              <div className="space-y-3">
                {/* Header: Icon & Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <BookOpen size={18} />
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                {/* Title & Author Info */}
                <div>
                  <h3
                    className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2"
                    title={item.title}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Penulis: <span className="text-foreground font-semibold">{item.author}</span>
                  </p>
                  {item.publisher && (
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      Penerbit: <span className="text-foreground">{item.publisher}</span>
                    </p>
                  )}
                </div>

                {item.isbn && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-mono text-[11px]">
                    <span className="font-sans text-[10px] font-bold text-muted-foreground uppercase">ISBN</span>
                    <span className="font-semibold text-foreground">{item.isbn}</span>
                  </div>
                )}

                {/* Reason Callout Box */}
                <div className="bg-muted/50 rounded-xl p-3 border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    Alasan Pengadaan:
                  </p>
                  <p
                    className="text-xs text-foreground leading-relaxed italic line-clamp-3"
                    title={item.reason}
                  >
                    "{item.reason}"
                  </p>
                </div>
              </div>

              {/* Footer: Date & Cancel Action */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-muted-foreground font-medium">
                  {formatDateID(item.createdAt)}
                </span>

                {item.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.title)}
                    disabled={deletingId === item.id}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    <span>{deletingId === item.id ? "Memproses..." : "Batalkan"}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog for creating recommendation */}
      <LecturerRecommendationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          void fetchRecommendations();
        }}
      />
    </div>
  );
}
