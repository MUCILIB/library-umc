import { useState, useEffect, Fragment } from "react";
import { CheckCircle, Clock, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import loanService from "@/services/loanService";
import { useToast } from "@/hooks/useToast";

export default function ReturnApprovalsSection() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const toast = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await loanService.getPendingReturnRequests();
      setRequests(data || []);
    } catch (err: any) {
      toast.error("Gagal", err.message || "Gagal memuat persetujuan pengembalian");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    const loadingId = toast.loading("Memproses...", "Menyetujui pengembalian...");
    try {
      const res = await loanService.approveReturnRequest(requestId);
      toast.removeToast(loadingId);
      toast.success("Berhasil", res.message || "Pengembalian berhasil disetujui");
      fetchRequests();
    } catch (err: any) {
      toast.removeToast(loadingId);
      toast.error("Gagal", err.message || "Gagal menyetujui pengembalian");
    } finally {
      setProcessingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(requests.length / itemsPerPage));
  const paginatedRequests = requests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground font-medium animate-pulse">
        Memuat data persetujuan pengembalian...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-foreground">Persetujuan Pengembalian</h2>
        <button
          onClick={fetchRequests}
          className="px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-bold hover:bg-muted transition-colors"
        >
          Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-muted border border-border rounded-2xl p-12 text-center flex flex-col items-center">
          <CheckCircle size={48} className="text-green-300 mb-4" />
          <h3 className="text-lg font-bold text-muted-foreground">Tidak ada pengajuan pengembalian</h3>
          <p className="text-sm text-muted-foreground mt-2">Semua buku yang dikembalikan telah diproses.</p>
        </div>
      ) : (
        <>
        <div className="grid gap-4">
          {paginatedRequests.map((req) => (
            <div key={req.id} className="bg-card border border-border rounded-[20px] p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-[15px]">{req.loan?.item?.bibliography?.title || 'Judul tidak tersedia'}</h4>
                  <p className="text-[11px] font-mono font-bold text-primary mt-1">
                    Kode Buku: <span className="px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20">{req.loan?.item?.itemCode || req.loan?.item?.barcode || (req.loan as any)?.itemCode || "-"}</span>
                  </p>
                  <p className="text-[13px] font-medium text-muted-foreground mt-1">
                    Oleh: {req.loan?.member?.user?.name || req.loan?.memberName || 'Peminjam tidak diketahui'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1 font-bold">
                    <Clock size={12} />
                    Batas Kembali: {new Date(req.loan?.dueDate).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={processingId === req.id}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-colors"
                >
                  {processingId === req.id ? "Memproses..." : "Konfirmasi Pengembalian"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <p className="text-xs text-muted-foreground font-medium">
              Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, requests.length)}–
              {Math.min(currentPage * itemsPerPage, requests.length)} dari {requests.length} data
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
  );
}
