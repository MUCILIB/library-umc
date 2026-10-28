import {
  Book,
  Users,
  Clock,
  Wallet,
  User as UserIcon,
  DownloadCloud,
  UploadCloud,
  Globe,
  Layers,
  ArrowRight,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useRef, useState, useEffect, type ChangeEvent } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { API_BASE_URL } from "@/utils/api-config";
import { getAuthHeaders } from "@/api/client";
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
  onNavigateLoans?: () => void;
}

interface DailyTrafficItem {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  sessions?: number;
}

interface TrafficSummary {
  todayPageViews: number;
  todayUniqueVisitors: number;
  todaySessions: number;
  totalPageViews: number;
  totalUniqueVisitors: number;
  totalSessions: number;
}

export default function DashboardSection({
  stats,
  onNavigateLoans
}: DashboardSectionProps) {
  const { success, error, info } = useToast();
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const {
    displayStats,
    loanLoading,
    formattedRecentLoans,
    applyImportedSummary
  } = useDashboardOverview(stats);

  const [trafficRange, setTrafficRange] = useState<number>(7);
  const [trafficData, setTrafficData] = useState<DailyTrafficItem[]>([]);
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummary | null>(null);
  const [trafficLoading, setTrafficLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchTraffic = async () => {
      setTrafficLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/reports/web-traffic?days=${trafficRange}`,
          {
            credentials: "include",
            headers: {
              ...getAuthHeaders()
            }
          }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && isMounted) {
          if (Array.isArray(json.data?.daily)) {
            setTrafficData(json.data.daily);
          }
          if (json.data?.summary) {
            setTrafficSummary(json.data.summary);
          }
        }
      } catch (err) {
        console.error("Gagal memuat trafik web:", err);
      } finally {
        if (isMounted) setTrafficLoading(false);
      }
    };

    void fetchTraffic();

    return () => {
      isMounted = false;
    };
  }, [trafficRange]);

  const statusMeta: Record<string, { label: string; className: string }> = {
    approved: {
      label: "Dipinjam",
      className: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
    },
    pending: {
      label: "Menunggu",
      className: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
    },
    returned: {
      label: "Dikembalikan",
      className: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
    },
    rejected: {
      label: "Ditolak",
      className: "bg-red-50 text-destructive dark:bg-red-950"
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

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
        "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
      ];
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10) - 1;
      return `${day} ${monthNames[month] || ""}`;
    }
    return dateStr;
  };

  const primaryCards = [
    {
      title: "Koleksi Judul",
      value: (displayStats.totalBibliographies || 0).toLocaleString("id-ID"),
      subtitle: `${(displayStats.totalItems || 0).toLocaleString("id-ID")} total eksemplar`,
      icon: Book,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/60"
    },
    {
      title: "Buku Dipinjam",
      value: (displayStats.activeBorrowings || 0).toLocaleString("id-ID"),
      subtitle: "Sedang dipinjam civitas",
      icon: Clock,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/60"
    },
    {
      title: "Antrean Reservasi",
      value: (displayStats.waitingReservations || 0).toLocaleString("id-ID"),
      subtitle: "Menunggu verifikasi admin",
      icon: Layers,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/60"
    },
    {
      title: "Pendapatan Denda",
      value: `Rp ${(displayStats.totalFineRevenue || 0).toLocaleString("id-ID")}`,
      subtitle: `Tagihan aktif: Rp ${(displayStats.outstandingFines || 0).toLocaleString("id-ID")}`,
      icon: Wallet,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/60"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Ringkasan Sistem
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
            Pantau aktivitas perpustakaan, sirkulasi, dan intensitas kunjungan hari ini.
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
            className="flex items-center gap-2 bg-card text-foreground px-4 py-2 rounded-xl font-semibold text-xs border border-border hover:bg-muted/50 transition-colors shadow-xs"
          >
            <UploadCloud size={16} />
            Import Laporan
          </button>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-semibold text-xs hover:bg-primary/90 transition-colors shadow-xs">
                <DownloadCloud size={16} />
                Export Laporan
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 p-2 rounded-2xl shadow-xl border-border bg-card"
            >
              <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Format Laporan (PDF)
              </div>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/loans/export?format=pdf`,
                    "_blank"
                  )
                }
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-primary"
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
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-primary"
              >
                Laporan Denda
              </DropdownMenuItem>

              <div className="h-px bg-muted my-1 mx-2" />

              <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Format Excel (CSV)
              </div>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/loans/export?format=csv`,
                    "_blank"
                  )
                }
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-blue-600 dark:text-blue-400"
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
                className="px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-blue-600 dark:text-blue-400"
              >
                Laporan Denda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-card p-5 rounded-2xl border border-border shadow-xs hover:border-border/80 transition-all flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {card.title}
                </p>
                <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
                  {card.value}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium truncate">
                  {card.subtitle}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${card.bg} ${card.color} shrink-0`}>
                <Icon className="size-4.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Web Traffic & Analytics Chart Card */}
      <div className="bg-card rounded-2xl border border-border shadow-xs p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Tren Kunjungan & Trafik Web
              </h3>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Analisis pembaca online dan intensitas lalu lintas digital perpustakaan.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl self-start sm:self-auto border border-border">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTrafficRange(days)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  trafficRange === days
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days} Hari
              </button>
            ))}
          </div>
        </div>

        {/* Traffic Mini KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Total Hits ({trafficRange} Hari)
              </p>
              <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                {(
                  trafficSummary?.totalPageViews ??
                  trafficData.reduce((acc, d) => acc + d.pageViews, 0)
                ).toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Hari ini:{" "}
                <span className="font-semibold text-foreground">
                  {(
                    trafficSummary?.todayPageViews ??
                    (trafficData[trafficData.length - 1]?.pageViews || 0)
                  ).toLocaleString("id-ID")}
                </span>{" "}
                hits
              </p>
            </div>
            <TrendingUp className="size-4 text-blue-500 shrink-0 self-start mt-0.5" />
          </div>

          <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Pengunjung Unik ({trafficRange} Hari)
              </p>
              <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                {(
                  trafficSummary?.totalUniqueVisitors ??
                  trafficData.reduce((acc, d) => acc + d.uniqueVisitors, 0)
                ).toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Hari ini:{" "}
                <span className="font-semibold text-foreground">
                  {(
                    trafficSummary?.todayUniqueVisitors ??
                    (trafficData[trafficData.length - 1]?.uniqueVisitors || 0)
                  ).toLocaleString("id-ID")}
                </span>{" "}
                orang
              </p>
            </div>
            <Users className="size-4 text-emerald-500 shrink-0 self-start mt-0.5" />
          </div>

          <div className="bg-muted/30 border border-border rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Rata-rata Hits / Hari
              </p>
              <p className="text-base font-bold text-foreground tabular-nums mt-0.5">
                {Math.round(
                  (trafficSummary?.totalPageViews ??
                    trafficData.reduce((acc, d) => acc + d.pageViews, 0)) /
                    (trafficData.length || trafficRange)
                ).toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                Rentang aktif {trafficRange} hari terakhir
              </p>
            </div>
            <Calendar className="size-4 text-amber-500 shrink-0 self-start mt-0.5" />
          </div>
        </div>

        {/* Interactive Chart Container */}
        <div className="h-64 w-full pt-2">
          {trafficLoading ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              Memuat grafik trafik...
            </div>
          ) : trafficData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              Belum ada riwayat trafik tercatat pada rentang waktu ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                key={`traffic-chart-${trafficRange}`}
                data={trafficData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="pageViewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="uniqueVisitorsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border p-2.5 rounded-xl shadow-lg text-xs space-y-1">
                          <p className="font-bold text-foreground">
                            {formatShortDate(String(label))}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-blue-600 dark:text-blue-400 font-medium">
                            <span>Page Views:</span>
                            <span className="font-bold tabular-nums">
                              {payload[0]?.value}
                            </span>
                          </div>
                          {payload[1] && (
                            <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400 font-medium">
                              <span>Pengunjung Unik:</span>
                              <span className="font-bold tabular-nums">
                                {payload[1]?.value}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pageViews"
                  name="Page Views"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pageViewsGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="uniqueVisitors"
                  name="Pengunjung Unik"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#uniqueVisitorsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Aktivitas Peminjaman Terbaru */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-border">
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Aktivitas Peminjaman Terbaru
            </h3>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Riwayat transaksi sirkulasi dan permohonan terkini.
            </p>
          </div>
          {onNavigateLoans && (
            <button
              type="button"
              onClick={onNavigateLoans}
              className="text-primary font-semibold text-xs hover:underline flex items-center gap-1 group"
            >
              Lihat Semua
              <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        <div className="divide-y divide-border">
          {loanLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground font-medium">
              Memuat aktivitas peminjaman...
            </div>
          ) : formattedRecentLoans.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground font-medium">
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
                  className="p-4 px-5 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-9 bg-muted rounded-xl flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                      <UserIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {loan.memberName}{" "}
                        <span className="font-normal text-muted-foreground mx-0.5">
                          meminjam
                        </span>{" "}
                        <span className="text-foreground">{loan.bookTitle}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {loan.timeText}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${meta.className}`}
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