import { useState, useEffect, Fragment } from "react";
import {
  BookMarked,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { formatDateID } from "@/utils/format";

interface Recommendation {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  dosenId: string;
  dosen?: {
    name: string;
    email: string;
  };
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function RecommendationsSection() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const toast = useToast();

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);


  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusParam = filter !== "all" ? `?status=${filter}` : "";
      const response = await fetch(`${API_BASE_URL}/api/recommendations${statusParam}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setRecommendations(data.data);
      } else {
        setRecommendations([]);
        if (!data.success) setError(data.message || "Gagal memuat data");
      }
    } catch (err) {
      console.error(err);
      setError("Gagal terhubung ke server");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    const loadingId = toast.loading("Memproses...", `Mengubah status menjadi ${status}`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      toast.removeToast(loadingId);
      if (data.success) {
        toast.success("Berhasil", `Rekomendasi telah ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
        fetchRecommendations();
      } else {
        toast.error("Gagal", data.message || "Gagal memperbarui status");
      }
    } catch {
      toast.removeToast(loadingId);
      toast.error("Error", "Gagal terhubung ke server");
    }
  };

  const filteredData = recommendations.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.dosen?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: "bg-yellow-100 text-yellow-700 dark:text-yellow-400", icon: Clock, text: "Menunggu" },
      approved: { color: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400", icon: CheckCircle, text: "Disetujui" },
      rejected: { color: "bg-red-100 dark:bg-red-900 text-destructive", icon: XCircle, text: "Ditolak" },
    }[status] || { color: "bg-muted text-muted-foreground", icon: Clock, text: status };

    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${config.color}`}>
        <Icon size={14} /> {config.text}
      </span>
    );
  };

  return (
    <div className="w-full">
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Header */}
        <div className="p-6 md:px-8 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-extrabold text-foreground tracking-tight">Usulan Pengadaan Koleksi</h2>
            <p className="text-xs text-muted-foreground font-medium mt-1">Rekomendasi buku baru dari dosen untuk perpustakaan</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select
              value={filter}
              onValueChange={(val) => {
                setFilter(val as FilterStatus);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] rounded-xl text-[13px] font-bold">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Cari buku atau dosen..."
                className="w-full md:w-64 pl-11 pr-4 py-2.5 bg-background border-none rounded-xl text-[13px] font-medium text-muted-foreground focus:ring-2 focus:ring-primary/10"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:px-8">
          {error && (
            <div className="mb-6 p-4 bg-warning-bg text-destructive rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900 flex items-center gap-3">
              <XCircle size={16} />
              {error}
            </div>
          )}
          {loading ? (

            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-[120px] w-full rounded-[20px]" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
              <BookMarked className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-bold">Tidak ada data rekomendasi</p>
            </div>
          ) : (
            <>
            <div className="space-y-4">
              {paginatedData.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-background rounded-[20px] p-6 border border-border hover:bg-card hover:shadow-lg hover:shadow-lg transition-all group"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Info Buku */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border group-hover:bg-warning-bg group-hover:border-red-100 dark:border-red-900 transition-colors">
                            <BookMarked className="text-muted-foreground group-hover:text-primary" size={18} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-foreground text-[15px]">{item.title}</h4>
                            <p className="text-[13px] text-muted-foreground font-medium">{item.author}</p>
                          </div>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-start gap-4 p-3 bg-card rounded-xl border border-border">
                          <User size={14} className="text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pengusul (Dosen)</p>
                            <p className="text-[13px] font-bold text-muted-foreground">{item.dosen?.name || "Unknown"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 p-3 bg-card rounded-xl border border-border">
                          <FileText size={14} className="text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tgl Diajukan</p>
                            <p className="text-[13px] font-bold text-muted-foreground">{formatDateID(item.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-muted rounded-xl border border-border/50">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Alasan Pengadaan</p>
                        <p className="text-[13px] text-muted-foreground font-medium leading-relaxed italic">"{item.reason}"</p>
                      </div>
                    </div>

                    {/* Actions */}
                    {item.status === 'pending' && (
                      <div className="flex flex-row md:flex-col gap-2 justify-end">
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'approved')}
                          className="flex-1 md:flex-none px-6 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/10"
                        >
                          Setujui
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'rejected')}
                          className="flex-1 md:flex-none px-6 py-2.5 bg-card text-destructive border border-red-100 dark:border-red-900 rounded-xl text-xs font-bold hover:bg-warning-bg transition-all"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium">
                  Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, filteredData.length)}–
                  {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                    )
                    .map((p, idx, arr) => {
                      const showDot = idx > 0 && arr[idx - 1] !== p - 1;
                      return (
                        <Fragment key={p}>
                          {showDot && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                              currentPage === p
                                ? "bg-primary text-white shadow-md shadow-red-500/20"
                                : "text-muted-foreground hover:bg-surface-hover hover:text-muted-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        </Fragment>
                      );
                    })}

                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
