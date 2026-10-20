import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  Search,
  X,
  Calendar,
  HelpCircle,
  BookOpen,
  ShieldCheck,
  ChevronRight
} from "lucide-react";
import fineService, { type Fine } from "@/services/fineService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Helper get fine title
function getFineTitle(fine: Fine): string {
  const item = fine.loan?.item as unknown as {
    bibliography?: { title?: string };
    collection?: { title?: string };
  } | undefined;

  return (
    item?.bibliography?.title ||
    item?.collection?.title ||
    (fine.loan as unknown as { bibliographyTitle?: string })?.bibliographyTitle ||
    "Judul tidak tersedia"
  );
}

// Helper format date
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "-";
  }
}

const FinesList = () => {
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  useEffect(() => {
    const fetchFines = async () => {
      try {
        setLoading(true);
        const data = await fineService.getMyFines();
        setFines(data);
      } catch (err) {
        console.error("Fetch fines error:", err);
        setError("Gagal memuat daftar denda");
      } finally {
        setLoading(false);
      }
    };

    fetchFines();
  }, []);

  // Filtered fines
  const filteredFines = useMemo(() => {
    return fines.filter((fine) => {
      const title = getFineTitle(fine).toLowerCase();
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || title.includes(query);
      const matchesStatus =
        statusFilter === "all" || fine.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [fines, searchQuery, statusFilter]);

  const unpaidFines = useMemo(
    () => fines.filter((f) => f.status === "unpaid"),
    [fines]
  );
  const paidFines = useMemo(
    () => fines.filter((f) => f.status === "paid"),
    [fines]
  );
  const totalUnpaidAmount = useMemo(
    () => unpaidFines.reduce((total, f) => total + f.amount, 0),
    [unpaidFines]
  );

  if (loading) {
    return (
      <div className="py-20 text-center animate-pulse">
        <div className="inline-block animate-spin rounded-full h-9 w-9 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground text-sm font-medium">
          Memuat data tagihan denda...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center bg-accent/50 rounded-2xl border border-destructive/30 p-6">
        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
        <h3 className="text-foreground font-bold mb-1">Gagal Memuat Denda</h3>
        <p className="text-muted-foreground text-xs">{error}</p>
      </div>
    );
  }

  if (fines.length === 0) {
    return (
      <div className="py-16 text-center bg-card rounded-3xl border border-dashed border-border shadow-2xs animate-fade-in">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck size={28} />
        </div>
        <h3 className="text-foreground font-bold text-base mb-1">
          Tidak Ada Tagihan Denda
        </h3>
        <p className="text-muted-foreground text-xs max-w-sm mx-auto px-4">
          Bagus sekali! Anda tidak memiliki catatan tunggakan denda keterlambatan saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Modern Summary Card */}
      <div className="bg-gradient-to-br from-card via-card to-muted/30 p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-border shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt size={16} />
            </div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Total Tunggakan Denda
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Rp {totalUnpaidAmount.toLocaleString("id-ID")}
            </span>
            {totalUnpaidAmount > 0 ? (
              <Badge
                variant="destructive"
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
              >
                {unpaidFines.length} Tagihan Belum Lunas
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
              >
                <CheckCircle2 size={11} className="mr-1" />
                Semua Lunas
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
            Denda dihitung berdasarkan hari keterlambatan pengembalian buku. Pelunasan dapat dilakukan langsung di meja sirkulasi perpustakaan.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <Button
            onClick={() => setGuideModalOpen(true)}
            className="rounded-xl text-xs font-bold uppercase tracking-wider gap-2 shadow-xs py-5 px-6"
          >
            <CreditCard size={15} />
            Cara Bayar
          </Button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul buku denda..."
            className="w-full pl-9 pr-9 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md"
              title="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === "all"
                ? "bg-primary text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            Semua ({fines.length})
          </button>
          <button
            onClick={() => setStatusFilter("unpaid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "unpaid"
                ? "bg-destructive text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Clock size={12} />
            Belum Dibayar ({unpaidFines.length})
          </button>
          <button
            onClick={() => setStatusFilter("paid")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === "paid"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <CheckCircle2 size={12} />
            Lunas ({paidFines.length})
          </button>
        </div>
      </div>

      {/* 3. Empty State for Search/Filter */}
      {filteredFines.length === 0 ? (
        <div className="py-14 text-center bg-card rounded-2xl border border-dashed border-border p-6 shadow-2xs">
          <div className="w-12 h-12 bg-muted/60 rounded-xl flex items-center justify-center text-muted-foreground mx-auto mb-3">
            <Search size={20} />
          </div>
          <h4 className="text-foreground font-bold text-sm mb-1">
            Tidak Ditemukan
          </h4>
          <p className="text-muted-foreground text-xs max-w-xs mx-auto mb-4">
            Tidak ada riwayat denda yang sesuai dengan filter atau kata kunci pencarian Anda.
          </p>
          {(searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-muted text-foreground hover:bg-muted/80 text-xs font-bold transition-all"
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 4. Desktop & Tablet Table (>= md) - Clean, fluid without horizontal scroll */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
            <Table className="w-full">
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-5 py-3.5 w-[45%]">
                    Buku
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[25%]">
                    Tanggal Pinjam / Jatuh Tempo
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[15%]">
                    Besar Denda
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 pr-5 text-right w-[15%]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFines.map((fine) => {
                  const bookTitle = getFineTitle(fine);
                  const isPaid = fine.status === "paid";
                  const borrowDate = fine.loan?.loanDate
                    ? formatDate(fine.loan.loanDate)
                    : "-";
                  const dueDate = fine.loan?.dueDate
                    ? formatDate(fine.loan.dueDate)
                    : "-";

                  return (
                    <TableRow
                      key={fine.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="pl-5 py-4 align-middle whitespace-normal">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-10 bg-muted rounded-md shrink-0 flex items-center justify-center border border-border text-muted-foreground">
                            <BookOpen size={14} />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-foreground leading-snug line-clamp-2">
                              {bookTitle}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              ID Pinjaman: #{fine.loanId.slice(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 align-middle whitespace-normal">
                        <div className="space-y-1 text-xs">
                          <div className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                            <Calendar size={12} className="shrink-0" />
                            <span>Pinjam: {borrowDate}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground/80 font-medium">
                            Jatuh Tempo: {dueDate}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="py-4 align-middle whitespace-normal">
                        <span className="font-bold text-xs text-foreground">
                          Rp {fine.amount.toLocaleString("id-ID")}
                        </span>
                      </TableCell>

                      <TableCell className="py-4 pr-5 align-middle text-right whitespace-normal">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 inline-flex items-center gap-1 ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 size={11} className="shrink-0" />
                              <span>Sudah Dibayar</span>
                            </>
                          ) : (
                            <>
                              <Clock size={11} className="shrink-0" />
                              <span>Belum Dibayar</span>
                            </>
                          )}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 5. Mobile Responsive Card List (< md) - Zero Horizontal Scrollbar! */}
          <div className="block md:hidden space-y-3">
            {filteredFines.map((fine) => {
              const bookTitle = getFineTitle(fine);
              const isPaid = fine.status === "paid";
              const borrowDate = fine.loan?.loanDate
                ? formatDate(fine.loan.loanDate)
                : "-";
              const dueDate = fine.loan?.dueDate
                ? formatDate(fine.loan.dueDate)
                : "-";

              return (
                <div
                  key={fine.id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-2xs space-y-3 hover:border-primary/20 transition-all"
                >
                  {/* Card Header: Status & Loan ID */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1 ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                          : "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 size={10} className="shrink-0" />
                          <span>Sudah Dibayar</span>
                        </>
                      ) : (
                        <>
                          <Clock size={10} className="shrink-0" />
                          <span>Belum Dibayar</span>
                        </>
                      )}
                    </Badge>

                    <span className="text-[10px] font-mono text-muted-foreground">
                      #{fine.loanId.slice(0, 8)}
                    </span>
                  </div>

                  {/* Book Title */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-10 bg-muted rounded-md shrink-0 flex items-center justify-center border border-border text-muted-foreground mt-0.5">
                      <BookOpen size={14} />
                    </div>
                    <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-2">
                      {bookTitle}
                    </h4>
                  </div>

                  {/* Fine Amount & Dates Grid */}
                  <div className="bg-muted/30 border border-border/60 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        Besar Denda
                      </span>
                      <span className="text-base font-black text-foreground">
                        Rp {fine.amount.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="text-right text-[11px] text-muted-foreground space-y-0.5 font-medium">
                      <div>Tgl Pinjam: {borrowDate}</div>
                      <div>Jatuh Tempo: {dueDate}</div>
                    </div>
                  </div>

                  {/* Quick Action if Unpaid */}
                  {!isPaid && (
                    <button
                      onClick={() => setGuideModalOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-accent text-primary text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-accent/80 transition-all"
                    >
                      <HelpCircle size={13} />
                      Petunjuk Pembayaran
                      <ChevronRight size={13} className="ml-0.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 6. Payment Guide Dialog */}
      <Dialog open={guideModalOpen} onOpenChange={setGuideModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              Panduan Pembayaran Denda
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Langkah-langkah pelunasan denda perpustakaan Universitas Muhammadiyah Cirebon.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Step 1 */}
            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-foreground">
                  Kunjungi Meja Loket Sirkulasi
                </h5>
                <p className="text-muted-foreground leading-relaxed">
                  Kunjungi meja sirkulasi di Gedung Perpustakaan Pusat UMC pada jam kerja operasional perpustakaan.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-foreground">
                  Tunjukkan Kartu Member / Sebutkan NIM
                </h5>
                <p className="text-muted-foreground leading-relaxed">
                  Tunjukkan Kartu Member Digital pada menu Profil atau sebutkan NIM/NIDN Anda kepada petugas perpustakaan.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-foreground">
                  Lakukan Pembayaran (Tunai / QRIS)
                </h5>
                <p className="text-muted-foreground leading-relaxed">
                  Bayar nominal denda sesuai yang tertera di sistem kasir perpustakaan melalui tunai atau scan QRIS resmi.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-2xl border border-border">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                4
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-foreground">
                  Status Otomatis Diperbarui Lunas
                </h5>
                <p className="text-muted-foreground leading-relaxed">
                  Setelah diverifikasi oleh petugas, status tagihan pada akun Anda akan langsung berubah menjadi Sudah Lunas.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full rounded-xl text-xs font-bold"
              onClick={() => setGuideModalOpen(false)}
            >
              Saya Mengerti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinesList;
