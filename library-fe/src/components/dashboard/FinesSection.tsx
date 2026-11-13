import { useState, useEffect, useCallback } from "react";
import { TablePagination } from "@/components/common/TablePagination";
import {
  Search,
  Wallet,
  Loader,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  RotateCcw,
  RefreshCcw,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, calcLateDays } from "@/utils/format";
import { useRolePermissions } from "@/hooks/useRolePermissions";

interface UnpaidFine {
  id: string;
  amount: number;
  status: "unpaid";
  loanId: string;
  loan: {
    dueDate: string;
    status?: "pending" | "approved" | "returned" | "extended" | "rejected";
    returnDate?: string | null;
    member: { user: { name: string; email: string } };
    item: { bibliography: { title: string } };
  };
}

interface PaidFine {
  id: string;
  amount: number;
  status: "paid";
  loanId: string;
  loan: {
    dueDate: string;
    status?: "pending" | "approved" | "returned" | "extended" | "rejected";
    returnDate?: string | null;
    member: { user: { name: string; email: string } };
    item: { bibliography: { title: string } };
  };
}

// ─── Toast Component ──────────────────────────────────────────────────────
function InlineToast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  const styles =
    type === "success"
      ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800"
      : "bg-warning-bg border-warning-border text-red-800";
  const Icon = type === "success" ? CheckCircle : AlertTriangle;
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-xl border ${styles} text-sm font-semibold mb-4 animate-slide-up`}
    >
      <Icon size={16} />
      {message}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function FinesSection() {
  const { canEdit } = useRolePermissions();
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");
  const [searchTerm, setSearchTerm] = useState("");
  const [unpaidFines, setUnpaidFines] = useState<UnpaidFine[]>([]);
  const [paidFines, setPaidFines] = useState<PaidFine[]>([]);
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Fetch Data dari API ────────────────────────────────────────────────
  const fetchFines = useCallback(async () => {
    setLoading(true);
    try {
      const [unpaidRes, paidRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/fines?status=unpaid&limit=100`, {
          credentials: "include",
        }),
        fetch(`${API_BASE_URL}/api/fines?status=paid&limit=100`, {
          credentials: "include",
        }),
      ]);

      const [unpaidData, paidData] = await Promise.all([
        unpaidRes.json(),
        paidRes.json(),
      ]);

      if (unpaidData.success && Array.isArray(unpaidData.data)) {
        setUnpaidFines(unpaidData.data);
      } else {
        setUnpaidFines([]);
      }
      if (paidData.success && Array.isArray(paidData.data)) {
        setPaidFines(paidData.data);
      } else {
        setPaidFines([]);
      }
    } catch {
      showToast("Gagal memuat data denda. Periksa koneksi Anda.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  // ─── Handler: Konfirmasi Pembayaran ─────────────────────────────────────
  const handlePayFine = async (fine: UnpaidFine) => {
    setPayingId(fine.id);
    try {
      // Jika buku masih berstatus dipinjam, otomatis proses return dulu.
      if (fine.loan.status === "approved" || fine.loan.status === "extended") {
        const returnRes = await fetch(
          `${API_BASE_URL}/api/loans/${fine.loanId}/return`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({}),
          },
        );

        let returnData;
        try {
          returnData = await returnRes.json();
        } catch (jsonErr) {
          console.error("Gagal mengurai respons pengembalian:", jsonErr);
          showToast(
            `Gagal memproses pengembalian buku (HTTP ${returnRes.status}).`,
            "error"
          );
          return;
        }

        if (!returnData.success) {
          showToast(
            returnData.message ||
              "Gagal memproses pengembalian buku sebelum bayar denda.",
            "error",
          );
          return;
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/fines/${fine.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentMethod: "cash" }),
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        console.error("Gagal mengurai respons pembayaran:", jsonErr);
        showToast(
          `Gagal memproses pembayaran denda (HTTP ${response.status}).`,
          "error"
        );
        return;
      }

      if (data.success) {
        showToast("Pembayaran denda berhasil dikonfirmasi!", "success");
        // Refresh data setelah bayar
        await fetchFines();
      } else {
        showToast(data.message || "Gagal memproses pembayaran.", "error");
      }
    } catch (err) {
      console.error("Kesalahan pembayaran denda:", err);
      showToast("Terjadi kesalahan koneksi saat memproses pembayaran.", "error");
    } finally {
      setPayingId(null);
    }
  };

  // ─── Filter & Pagination ─────────────────────────────────────────────────
  const filterFines = <
    T extends { loan: { member: { user: { name: string } } } },
  >(
    list: T[],
  ) =>
    list.filter((item) =>
      item.loan.member.user.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );

  const filteredUnpaid = filterFines(unpaidFines);
  const filteredPaid = filterFines(paidFines);
  const activeList = activeTab === "unpaid" ? filteredUnpaid : filteredPaid;
  const totalPages = Math.max(1, Math.ceil(activeList.length / itemsPerPage));
  const paginatedList = activeList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset page when tab or search changes
  const handleTabChange = (tab: "unpaid" | "paid") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header Area */}
      <div>
        <h2 className="text-[28px] font-extrabold text-foreground tracking-tight">
          Manajemen Denda
        </h2>
        <p className="text-muted-foreground font-medium text-[15px] mt-1">
          Kelola tagihan keterlambatan dan riwayat denda mahasiswa.
        </p>
      </div>

      {/* Toast */}
      {toast && <InlineToast message={toast.message} type={toast.type} />}

      {/* Tabs Layout */}
      <div className="flex items-center gap-2 mb-2">
        <button
          id="tab-fines-unpaid"
          onClick={() => handleTabChange("unpaid")}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
            activeTab === "unpaid"
              ? "bg-card border-warning-border text-primary shadow-sm ring-1 ring-primary/10"
              : "bg-transparent border-transparent text-muted-foreground hover:text-slate-800 hover:bg-muted"
          }`}
        >
          Tagihan Belum Lunas
          {unpaidFines.length > 0 && (
            <span className="ml-1.5 bg-red-100 dark:bg-red-900 text-destructive px-1.5 py-0.5 rounded-full text-[10px] font-black">
              {unpaidFines.length}
            </span>
          )}
        </button>
        <button
          id="tab-fines-paid"
          onClick={() => handleTabChange("paid")}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
            activeTab === "paid"
              ? "bg-card border-warning-border text-primary shadow-sm ring-1 ring-primary/10"
              : "bg-transparent border-transparent text-muted-foreground hover:text-slate-800 hover:bg-muted"
          }`}
        >
          Riwayat Pembayaran
        </button>
      </div>

    

      {/* Main Card */}
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden flex flex-col">
        {/* Controls Bar */}
        <div className="p-6 flex flex-col sm:flex-row items-center justify-between border-b border-border gap-4">
          <div className="relative w-full sm:w-[350px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              id="fines-search"
              placeholder="Cari nama mahasiswa..."
              className="w-full pl-11 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/10 focus:border-primary/40 transition-all outline-none placeholder:text-muted-foreground text-foreground"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button
            onClick={fetchFines}
            className="text-xs flex items-center gap-2 font-bold text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-xl hover:bg-warning-bg"
          >
            Refresh <RefreshCcw className="w-4 h-4"/>
          </button>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 space-y-4 animate-in fade-in duration-500">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {activeTab === "unpaid" ? (
                    <>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        NAMA MAHASISWA
                      </th>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        BUKU &amp; KETERLAMBATAN
                      </th>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        STATUS BUKU
                      </th>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        TOTAL DENDA
                      </th>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap text-right">
                        AKSI
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        NAMA MAHASISWA
                      </th>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        BUKU
                      </th>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                        JATUH TEMPO
                      </th>
                      <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap text-right">
                        NOMINAL LUNAS
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-muted-foreground"
                    >
                      <Wallet size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-semibold">
                        {activeTab === "unpaid"
                          ? "Tidak ada tagihan denda belum lunas"
                          : "Tidak ada riwayat pembayaran"}
                      </p>
                    </td>
                  </tr>
                ) : activeTab === "unpaid" ? (
                  // ── Unpaid Table ──────────────────────────────────────────
                  (paginatedList as UnpaidFine[]).map((fine) => {
                    const computedLateDays = calcLateDays(fine.loan.dueDate);
                    const amountBasedDays = Math.max(
                      0,
                      Math.round((Number(fine.amount) || 0) / 500),
                    );
                    const lateDays =
                      fine.loan.status === "returned"
                        ? amountBasedDays
                        : Math.max(computedLateDays, amountBasedDays);
                    return (
                      <tr
                        key={fine.id}
                        className="hover:bg-surface-hover/50 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div>
                            <p className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
                              {fine.loan?.member?.user?.name || "-"}
                            </p>
                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                              {fine.loan?.member?.user?.email || "-"}
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div>
                            <p className="text-[14px] font-bold text-foreground truncate max-w-[200px]">
                              {fine.loan?.item?.bibliography?.title || "-"}
                            </p>
                            {lateDays > 0 && (
                              <p className="text-[12px] font-medium text-destructive mt-0.5">
                                Terlambat {lateDays} hari
                              </p>
                            )}
                          </div>
                        </td>
                        {/* STATUS BUKU BADGE */}
                        <td className="px-8 py-5">
                          {fine.loan.status === "returned" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-[11px] font-bold whitespace-nowrap">
                              <RotateCcw size={11} />
                              Sudah Dikembalikan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 rounded-xl text-[11px] font-bold whitespace-nowrap">
                              <BookOpen size={11} />
                              Belum Dikembalikan
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-[14px] font-bold text-primary">
                            {formatRupiah(fine.amount)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Rp 500/hari
                          </p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          {canEdit("fines") ? (
                            <button
                              id={`btn-pay-fine-${fine.id}`}
                              onClick={() => handlePayFine(fine)}
                              disabled={payingId === fine.id}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-600 hover:text-white transition-all disabled:opacity-50"
                            >
                              {payingId === fine.id ? (
                                <Loader size={12} className="animate-spin" />
                              ) : (
                                <CheckCircle size={12} />
                              )}
                              {payingId === fine.id
                                ? "Memproses..."
                                : "Konfirmasi Bayar"}
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Hanya Lihat
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // ── Paid Table ────────────────────────────────────────────
                  (paginatedList as PaidFine[]).map((fine) => (
                    <tr
                      key={fine.id}
                      className="hover:bg-surface-hover/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <p className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
                          {fine.loan?.member?.user?.name || "-"}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {fine.loan?.member?.user?.email || "-"}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[14px] font-bold text-foreground truncate max-w-[200px]">
                          {fine.loan?.item?.bibliography?.title || "-"}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[13px] font-medium text-muted-foreground">
                          {new Date(fine.loan.dueDate).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <p className="text-[14px] font-bold text-green-600 dark:text-green-400">
                          {formatRupiah(fine.amount)}
                        </p>
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-bold">
                          <CheckCircle size={10} /> Lunas
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={activeList.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="data denda"
        />
      </div>
    </div>
  );
}
