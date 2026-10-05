import {
  Book,
  Users,
  Clock,
  Wallet,
  User as UserIcon,
  DownloadCloud,
  UploadCloud,
  Globe,
  Layers
} from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { API_BASE_URL } from "@/utils/api-config";
import { useToast } from "@/hooks/useToast";
import { useDashboardOverview } from "@/hooks/dashboard/useDashboardOverview";
import type { DashboardStats } from "@/services/dashboard/dashboardDataService";
import { analyzeReportCsv } from "@/utils/dashboardReportImport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface DashboardSectionProps {
  stats: DashboardStats;
}

export default function DashboardSection({ stats }: DashboardSectionProps) {
  const { success, error, info } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const {
    displayStats,
    loanLoading,
    formattedRecentLoans,
    applyImportedSummary
  } = useDashboardOverview(stats);

  const statusMeta: Record<string, { label: string; className: string }> = {
    approved: {
      label: "Dipinjam",
      className: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
    },
    pending: {
      label: "Menunggu",
      className: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
    },
    returned: {
      label: "Dikembalikan",
      className: "bg-green-50 dark:bg-green-950 text-green-600 dark:bg-green-950 dark:text-green-400"
    },
    rejected: {
      label: "Ditolak",
      className: "bg-red-50 dark:bg-red-950 text-destructive dark:bg-red-950"
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportReport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      error(
        "Format tidak didukung",
        "Gunakan file laporan CSV dari menu export."
      );
      event.target.value = "";
      return;
    }

    try {
      const raw = await file.text();
      const summary = analyzeReportCsv(raw);

      if (!summary) {
        error("Import gagal", "Isi file kosong atau format CSV tidak valid.");
        event.target.value = "";
        return;
      }

      applyImportedSummary(summary);

      success(
        "Import laporan berhasil",
        `Data dari ${file.name} sudah diterapkan ke overview dashboard.`
      );
      info(
        "Mode data lokal aktif",
        "Refresh halaman untuk kembali ke data realtime API."
      );
    } catch (importErr) {
      console.error("Gagal import laporan overview:", importErr);
      error("Import gagal", "Terjadi kesalahan saat membaca file CSV.");
    } finally {
      event.target.value = "";
    }
  };

  const statCards = [
    {
      label: "Total Judul",
      value: displayStats.totalBibliographies,
      icon: <Book />,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950"
    },
    {
      label: "Total Buku",
      value: displayStats.totalItems || 0,
      icon: <Layers />,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950"
    },
    {
      label: "Sedang Dipinjam",
      value: displayStats.activeBorrowings ?? 0,
      icon: <Clock />,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950"
    },
    {
      label: "Kunjungan Fisik",
      value: displayStats.totalGuests,
      icon: <Users />,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950"
    },
    {
      label: "Kunjungan Web",
      value: displayStats.webVisits,
      icon: <Globe />,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950"
    },
    {
      label: "Antrean Reservasi",
      value: displayStats.waitingReservations ?? 0,
      icon: <Clock />,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950"
    },
    {
      label: "Tagihan Denda Aktif",
      value: `Rp ${(displayStats.outstandingFines ?? 0).toLocaleString("id-ID")}`,
      icon: <Wallet />,
      color: "text-destructive",
      bg: "bg-red-50 dark:bg-red-950"
    },
    {
      label: "Pendapatan Denda",
      value: `Rp ${(displayStats.totalFineRevenue ?? 0).toLocaleString("id-ID")}`,
      icon: <Wallet />,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Ringkasan */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Ringkasan Sistem
          </h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Pantau aktivitas perpustakaan hari ini.
          </p>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleImportReport}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleImportClick}
            className="flex items-center gap-2 bg-card text-foreground px-5 py-2.5 rounded-xl font-bold text-sm border border-border hover:bg-surface-hover transition-colors shadow-sm"
          >
            <UploadCloud size={18} />
            Import Laporan
          </button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm shadow-red-500/20">
                <DownloadCloud size={18} />
                Export Laporan
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 rounded-2xl shadow-xl border-border bg-card"
            >
              <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Format Laporan (PDF)
              </div>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/loans/export?format=pdf`,
                    "_blank"
                  )
                }
                className="px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-primary"
              >
                Laporan Peminjaman
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/fines/export?format=pdf`,
                    "_blank"
                  )
                }
                className="px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-primary"
              >
                Laporan Denda
              </DropdownMenuItem>

              <div className="h-px bg-muted my-1 mx-2" />

              <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Format Excel (CSV)
              </div>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/loans/export?format=csv`,
                    "_blank"
                  )
                }
                className="px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-blue-600 dark:text-blue-400"
              >
                Laporan Peminjaman
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/fines/export?format=csv`,
                    "_blank"
                  )
                }
                className="px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-blue-600 dark:text-blue-400"
              >
                Laporan Denda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-card p-6 rounded-[24px] border border-border shadow-sm flex items-center gap-5 hover:shadow-md transition-all"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-foreground leading-none">
                {stat.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Aktivitas Peminjaman Terbaru */}
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden mt-6">
        <div className="p-6 md:px-8 md:py-6 flex items-center justify-between border-b border-border">
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">
            Aktivitas Peminjaman Terbaru
          </h3>
          <button className="text-primary font-bold text-sm hover:underline flex items-center gap-1 group">
            Lihat Semua{" "}
            <span className="text-lg group-hover:translate-x-1 transition-transform">
              →
            </span>
          </button>
        </div>

        <div className="p-4 md:p-6 flex flex-col">
          {loanLoading ? (
            <div className="p-4 px-6 text-sm text-muted-foreground font-semibold">
              Memuat aktivitas peminjaman...
            </div>
          ) : formattedRecentLoans.length === 0 ? (
            <div className="p-4 px-6 text-sm text-muted-foreground font-semibold">
              Belum ada aktivitas peminjaman terbaru.
            </div>
          ) : (
            formattedRecentLoans.map((loan) => {
              const meta = statusMeta[loan.status] || {
                label: loan.status,
                className: "bg-muted text-muted-foreground"
              };

              return (
                <div
                  key={loan.id}
                  className="flex items-center justify-between p-4 px-6 hover:bg-surface-hover transition-colors border-b border-border last:border-0 group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-foreground">
                        {loan.memberName}{" "}
                        <span className="font-normal text-muted-foreground mx-0.5">
                          meminjam
                        </span>{" "}
                        {loan.bookTitle}
                      </p>
                      <p className="text-[12px] text-muted-foreground font-medium mt-0.5">
                        {loan.timeText}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`px-4 py-1.5 rounded-lg text-[13px] font-bold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
