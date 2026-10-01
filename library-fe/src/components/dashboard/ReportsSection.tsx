// src/components/dashboard/ReportsSection.tsx
import { useState, useEffect } from "react";
import {
  Users,
  BookCheck,
  DollarSign,
  TrendingUp,
  DownloadCloud,
  UploadCloud
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";
import { API_BASE_URL } from "@/utils/api-config";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/useToast";
import { analyzeReportCsv } from "@/utils/dashboardReportImport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useRef } from "react";

interface ReportsSectionProps {
  className?: string;
}

interface PopularBookItem {
  id: string;
  title: string;
  loanCount: number;
}

// Helper labels

export default function ReportsSection({
  className = ""
}: ReportsSectionProps) {
  const { success, error, info } = useToast();
  const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const chartFg = cssVar("--foreground");
  const chartMuted = cssVar("--muted-foreground");
  const chartBorder = cssVar("--border");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [chartRange, setChartRange] = useState<"day" | "week" | "month" | "custom">("week");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [visitorFilter, setVisitorFilter] = useState<"all" | "physical" | "web">("all");

  const [stats, setStats] = useState({
    totalVisitors: 0,
    successfulLoans: 0,
    totalPaidFines: 0,
    outstandingFines: 0,
    visitsPastWeek: 0,
    totalPhysical: 0,
    totalWeb: 0
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ day: string; physical: number; web: number; total: number }[]>(
    []
  );
  const [popularBooks, setPopularBooks] = useState<PopularBookItem[]>([]);
  const [prodiDistribution, setProdiDistribution] = useState<{ studyProgramName: string; count: number }[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const visitorAnalyticsUrl = chartRange === "custom" && customStartDate && customEndDate
          ? `${API_BASE_URL}/api/reports/visitor-analytics?range=custom&startDate=${customStartDate}&endDate=${customEndDate}`
          : `${API_BASE_URL}/api/reports/visitor-analytics?range=${chartRange}`;

        const [
          guestsRes,
          loansRes,
          revenueSummaryRes,
          visitorAnalyticsRes,
          popularBooksRes
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/api/guests`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/api/loans?status=returned&limit=500`, {
            credentials: "include"
          }),
          fetch(
            `${API_BASE_URL}/api/reports/fines/revenue?month=${selectedMonth}&year=${selectedYear}`,
            { credentials: "include" }
          ),
          fetch(visitorAnalyticsUrl, { credentials: "include" }),
          fetch(`${API_BASE_URL}/api/reports/popular-books?limit=5`, {
            credentials: "include"
          })
        ]);

        const [
          guestsData,
          loansData,
          revenueSummaryData,
          visitorAnalyticsData,
          popularBooksData
        ] = await Promise.all([
          guestsRes.json(),
          loansRes.json(),
          revenueSummaryRes.json(),
          visitorAnalyticsRes.json(),
          popularBooksRes.json()
        ]);

        let guestsCount = 0;
        let loansCount = 0;
        let finesRevenue = 0;
        let outstandingFines = 0;
        let totalPhysical = 0;
        let totalWeb = 0;

        if (guestsData.success && Array.isArray(guestsData.data)) {
          guestsCount = guestsData.data.length;
        }

        if (loansData.success && Array.isArray(loansData.data)) {
          loansCount = loansData.data.length;
        }

        if (visitorAnalyticsData.success && visitorAnalyticsData.data) {
          const vData = visitorAnalyticsData.data;
          totalPhysical = vData.summary?.totalPhysical ?? 0;
          totalWeb = vData.summary?.totalWeb ?? 0;
          setProdiDistribution(vData.studyProgramDistribution ?? []);

          if (Array.isArray(vData.timeline)) {
            setChartData(
              vData.timeline.map((item: any) => ({
                day: item.label,
                physical: Number(item.physical) || 0,
                web: Number(item.web) || 0,
                total: Number(item.total) || 0
              }))
            );
          }
        } else {
          setChartData([]);
        }

        if (popularBooksData.success && Array.isArray(popularBooksData.data)) {
          setPopularBooks(
            popularBooksData.data.map(
              (book: {
                id: string;
                title: string;
                loanCount: number | string;
              }) => ({
                id: book.id,
                title: book.title,
                loanCount: Number(book.loanCount) || 0
              })
            )
          );
        } else {
          setPopularBooks([]);
        }

        if (revenueSummaryData.success && revenueSummaryData.data) {
          finesRevenue = Number(revenueSummaryData.data.totalFineRevenue || 0);
          outstandingFines = Number(
            revenueSummaryData.data.outstandingFines || 0
          );
        }

        setStats({
          totalVisitors: guestsCount,
          successfulLoans: loansCount,
          totalPaidFines: finesRevenue,
          outstandingFines,
          visitsPastWeek: totalPhysical + totalWeb,
          totalPhysical,
          totalWeb
        });
      } catch (error) {
        console.error("Gagal mengambil data reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [selectedMonth, selectedYear, chartRange, customStartDate, customEndDate]);

  const monthOptions = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" }
  ];

  const yearOptions = Array.from(
    { length: 5 },
    (_, index) => now.getFullYear() - index
  );

  const selectedMonthLabel =
    monthOptions.find((month) => month.value === selectedMonth)?.label ?? "-";

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportReport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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

      setStats((previous) => ({
        ...previous,
        successfulLoans:
          summary.successfulLoans > 0
            ? summary.successfulLoans
            : previous.successfulLoans,
        totalPaidFines:
          summary.totalPaidFines > 0
            ? summary.totalPaidFines
            : previous.totalPaidFines,
        outstandingFines:
          summary.outstandingFines > 0
            ? summary.outstandingFines
            : previous.outstandingFines
      }));

      if (summary.popularBooks.length > 0) {
        setPopularBooks(
          summary.popularBooks.map((book, index) => ({
            id: `imported-${index}-${book.title}`,
            title: book.title,
            loanCount: book.loanCount
          }))
        );
      }

      success(
        "Import laporan berhasil",
        `Data dari ${file.name} sudah diterapkan ke dashboard.`
      );
      info(
        "Mode data lokal aktif",
        "Refresh halaman untuk kembali ke data realtime API."
      );
    } catch (importError) {
      console.error("Gagal import laporan:", importError);
      error("Import gagal", "Terjadi kesalahan saat membaca file laporan CSV.");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-extrabold text-foreground tracking-tight">
            Laporan & Statistik
          </h2>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Metrik dan performa perpustakaan (Data Realtime API).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleImportReport}
          />
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
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/fines/export?format=pdf&status=paid&month=${selectedMonth}&year=${selectedYear}`,
                    "_blank"
                  )
                }
                className="px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-primary"
              >
                Pendapatan Denda Bulanan
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
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `${API_BASE_URL}/api/reports/fines/export?format=csv&status=paid&month=${selectedMonth}&year=${selectedYear}`,
                    "_blank"
                  )
                }
                className="px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer text-muted-foreground focus:bg-muted focus:text-blue-600 dark:text-blue-400"
              >
                Pendapatan Denda Bulanan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Periode Audit Pendapatan
        </p>
        <select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(Number(event.target.value))}
          className="px-3 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground"
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className="px-3 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Pengunjung */}
        <div className="bg-card p-6 rounded-[24px] border border-border shadow-sm flex items-center gap-5">
          <div className="w-[60px] h-[60px] rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              TOTAL PENGUNJUNG
            </p>
            <p className="text-3xl font-black text-foreground mt-2">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.totalVisitors
              )}
            </p>
          </div>
        </div>

        {/* Peminjaman Sukses */}
        <div className="bg-card p-6 rounded-[24px] border border-border shadow-sm flex items-center gap-5">
          <div className="w-[60px] h-[60px] rounded-full bg-green-50 dark:bg-green-950 flex items-center justify-center shrink-0">
            <BookCheck className="w-7 h-7 text-green-600 dark:text-green-400" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              PEMINJAMAN SUKSES
            </p>
            <p className="text-3xl font-black text-foreground mt-2">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                stats.successfulLoans
              )}
            </p>
          </div>
        </div>

        {/* Denda Terkumpul */}
        <div className="bg-card p-6 rounded-[24px] border border-border shadow-sm flex items-center gap-5">
          <div className="w-[60px] h-[60px] rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center shrink-0">
            <DollarSign className="w-7 h-7 text-destructive" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              PENDAPATAN DENDA ({selectedMonthLabel.toUpperCase()}{" "}
              {selectedYear})
            </p>
            <p className="text-3xl font-black text-foreground mt-2">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `Rp ${stats.totalPaidFines.toLocaleString("id-ID")}`
              )}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground mt-2">
              Tagihan aktif: Rp {stats.outstandingFines.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      </div>

      {/* Charts & Lists Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart Section */}
        <div className="lg:col-span-2 bg-card p-8 rounded-[24px] border border-border shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-[16px] font-extrabold text-foreground">
                Grafik Komparasi Pengunjung
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Membedakan kunjungan fisik langsung ke perpus vs trafik website
              </p>
            </div>

            {/* Filter Jenis Pengunjung */}
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <button
                type="button"
                onClick={() => setVisitorFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  visitorFilter === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setVisitorFilter("physical")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  visitorFilter === "physical"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Fisik (Perpus)
              </button>
              <button
                type="button"
                onClick={() => setVisitorFilter("web")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  visitorFilter === "web"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Web Online
              </button>
            </div>
          </div>

          {/* Filter Range & Custom Date Picker */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              {(["day", "week", "month", "custom"] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setChartRange(range)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    chartRange === range
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range === "day"
                    ? "Hari Ini"
                    : range === "week"
                    ? "7 Hari"
                    : range === "month"
                    ? "30 Hari"
                    : "Custom Range"}
                </button>
              ))}
            </div>

            {chartRange === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground"
                />
                <span className="text-xs text-muted-foreground">s/d</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground"
                />
              </div>
            )}
          </div>

          <div className="flex-1 w-full h-[320px] mb-6">
            <ResponsiveContainer
              width="100%"
              height={320}
              minWidth={1}
              minHeight={1}
            >
              <BarChart
                key={`${chartRange}-${visitorFilter}`}
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 10 }}
                barSize={chartRange === "week" ? 28 : chartRange === "day" ? 10 : 12}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartBorder} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => (
                    <span className="text-xs font-bold text-foreground capitalize mr-4">
                      {value === "physical" ? "Pengunjung Fisik (Perpus)" : value === "web" ? "Trafik Web Online" : "Total"}
                    </span>
                  )}
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartFg, fontSize: 11, fontWeight: 700 }}
                  tickMargin={12}
                  height={35}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartMuted, fontSize: 11, fontWeight: 600 }}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => Math.max(dataMax, 5)]}
                  width={35}
                />

                {(visitorFilter === "all" || visitorFilter === "physical") && (
                  <Bar
                    dataKey="physical"
                    name="physical"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {(visitorFilter === "all" || visitorFilter === "web") && (
                  <Bar
                    dataKey="web"
                    name="web"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown Per Program Studi yang hadir */}
          {prodiDistribution.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[12px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2.5">
                Top Program Studi Pengunjung Fisik:
              </p>
              <div className="flex flex-wrap gap-2">
                {prodiDistribution.slice(0, 5).map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  >
                    <span>{p.studyProgramName}:</span>
                    <strong className="font-extrabold">{p.count} orang</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t-2 border-border pt-4 mt-4 flex flex-wrap items-center justify-between text-xs font-bold text-muted-foreground">
            <span>
              Kunjungan Fisik: <strong className="text-emerald-600">{stats.totalPhysical} orang</strong>
            </span>
            <span>
              Trafik Web: <strong className="text-blue-600">{stats.totalWeb} pengunjung</strong>
            </span>
            <span>
              Total Gabungan: <strong className="text-foreground">{stats.visitsPastWeek} kunjungan</strong>
            </span>
          </div>
        </div>

        {/* Popular Books Section */}
        <div className="bg-card p-8 rounded-[24px] border border-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[15px] font-extrabold text-foreground">
              Buku Terpopuler
            </h3>
            <TrendingUp className="w-5 h-5 text-foreground" strokeWidth={3} />
          </div>

          <div className="space-y-6 flex-1">
            {popularBooks.length === 0 && !loading ? (
              <p className="text-sm font-semibold text-muted-foreground">
                Belum ada data peminjaman buku.
              </p>
            ) : null}
            {popularBooks.map((book, index) => (
              <div key={book.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm font-bold text-foreground truncate max-w-[120px]">
                    {book.title}
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-wide shrink-0">
                  {book.loanCount} Dipinjam
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
