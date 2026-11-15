import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { ItemResult } from "./types";

export interface CirculationItemResultProps {
  itemResult: ItemResult;
  intent: "inspect" | "loan" | "return";
  onIntentChange: (intent: "inspect" | "loan" | "return") => void;
  returnCondition: "good" | "damaged" | "lost";
  onReturnConditionChange: (condition: "good" | "damaged" | "lost") => void;
  loading: boolean;
  onLoan: () => void;
  onReturn: (condition: string) => void;
  onApproveExtension: () => void;
  onRejectExtension: () => void;
  onReset: () => void;
  formatDateStr: (dateStr?: string | null) => string;
}

export function CirculationItemResult({
  itemResult,
  intent,
  onIntentChange,
  returnCondition,
  onReturnConditionChange,
  loading,
  onLoan,
  onReturn,
  onApproveExtension,
  onRejectExtension,
  onReset,
  formatDateStr,
}: CirculationItemResultProps) {
  const isLoaned = Boolean(
    itemResult.item.status === "loaned" ||
      (itemResult.activeLoan &&
        ["approved", "extended"].includes(itemResult.activeLoan.status))
  );
  const hasPendingRequest = Boolean(
    itemResult.activeLoan && itemResult.activeLoan.status === "pending"
  );
  const hasPendingExtension = Boolean(
    isLoaned &&
      itemResult.activeLoan &&
      (itemResult.activeLoan.extensionStatus === "pending" ||
        itemResult.allowedActions?.includes("approve_extension"))
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Item Ditemukan
          </h3>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              intent === "loan"
                ? "bg-primary/10 text-primary border-primary/20"
                : intent === "return"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            }`}
          >
            Tujuan:{" "}
            {intent === "loan"
              ? "Pinjam (Loan)"
              : intent === "return"
              ? "Kembali (Return)"
              : "Periksa (Inspect)"}
          </span>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
      </div>

      {/* Rincian Buku */}
      <div className="grid gap-4 sm:grid-cols-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-border">
        <div>
          <dt className="text-xs font-bold text-muted-foreground uppercase">
            Kode Buku / Item
          </dt>
          <dd className="text-sm font-mono font-bold text-foreground">
            {itemResult.item.itemCode}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-muted-foreground uppercase">
            Judul
          </dt>
          <dd className="text-sm font-bold text-foreground">
            {itemResult.item.title}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-muted-foreground uppercase">
            Status
          </dt>
          <dd className="text-sm font-bold flex flex-wrap items-center gap-2">
            <span
              className={
                isLoaned
                  ? "text-amber-600 dark:text-amber-400 capitalize"
                  : hasPendingRequest
                  ? "text-indigo-600 dark:text-indigo-400 capitalize"
                  : "text-emerald-600 dark:text-emerald-400 capitalize"
              }
            >
              {itemResult.item.status}
            </span>
            {isLoaned && !hasPendingExtension && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                Sedang Dipinjam
              </span>
            )}
            {hasPendingExtension && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Clock className="size-3" />
                Permintaan Perpanjangan (Pending)
              </span>
            )}
            {hasPendingRequest && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                Ada Permintaan Pinjam (Pending)
              </span>
            )}
            {!isLoaned && !hasPendingRequest && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                Tersedia di Rak
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-muted-foreground uppercase">
            Lokasi / Rak
          </dt>
          <dd className="text-sm font-medium text-foreground">
            {itemResult.item.location || "-"}
          </dd>
        </div>

        {/* Informasi Peminjaman Aktif jika ada */}
        {itemResult.activeLoan && isLoaned && (
          <>
            <div className="sm:col-span-1 pt-2 border-t border-border/60">
              <dt className="text-xs font-bold text-muted-foreground uppercase">
                Peminjam Aktif
              </dt>
              <dd className="text-sm font-bold text-foreground">
                {itemResult.activeLoan.memberName ||
                  itemResult.activeLoan.memberId ||
                  "-"}
              </dd>
            </div>
            <div className="sm:col-span-1 pt-2 border-t border-border/60">
              <dt className="text-xs font-bold text-muted-foreground uppercase">
                {hasPendingExtension
                  ? "Jatuh Tempo Saat Ini"
                  : "Jatuh Tempo Pengembalian"}
              </dt>
              <dd
                className={`text-sm font-bold ${
                  hasPendingExtension
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {formatDateStr(itemResult.activeLoan.dueDate)}
              </dd>
            </div>
          </>
        )}

        {/* Informasi Permintaan Peminjaman jika ada request */}
        {itemResult.activeLoan && hasPendingRequest && (
          <>
            <div className="sm:col-span-1 pt-2 border-t border-border/60">
              <dt className="text-xs font-bold text-muted-foreground uppercase">
                Pemohon Pinjam (Member)
              </dt>
              <dd className="text-sm font-bold text-foreground">
                {itemResult.activeLoan.memberName ||
                  itemResult.activeLoan.memberId ||
                  "-"}
              </dd>
            </div>
            <div className="sm:col-span-1 pt-2 border-t border-border/60">
              <dt className="text-xs font-bold text-muted-foreground uppercase">
                Rencana Jatuh Tempo
              </dt>
              <dd className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {formatDateStr(itemResult.activeLoan.dueDate)}
              </dd>
            </div>
          </>
        )}
      </div>

      {/* Bagian Tombol Aksi yang Disesuaikan dengan Tujuan Intent */}
      <div className="pt-1 space-y-4">
        {/* KONDISI 1: BUKU SEDANG DIPINJAM */}
        {isLoaned && (
          <>
            {/* 1A. JIKA ADA PERMINTAAN PERPANJANGAN (PENDING EXTENSION) */}
            {hasPendingExtension && itemResult.activeLoan && (
              <div className="rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/30 p-5 space-y-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-purple-950 dark:text-purple-200">
                        Permintaan Perpanjangan Peminjaman Ditemukan!
                      </h4>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        +7 Hari
                      </span>
                    </div>
                    <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                      Anggota{" "}
                      <strong>
                        {itemResult.activeLoan.memberName || "Peminjam"}
                      </strong>{" "}
                      telah mengajukan permohonan perpanjangan waktu peminjaman
                      untuk buku ini. Jatuh tempo saat ini adalah{" "}
                      <strong>
                        {formatDateStr(itemResult.activeLoan.dueDate)}
                      </strong>
                      .
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-purple-200/60 dark:border-purple-900/40">
                  <button
                    onClick={onApproveExtension}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle className="size-4" />
                    )}
                    <span>Setujui Perpanjangan (+7 Hari)</span>
                  </button>
                  <button
                    onClick={onRejectExtension}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900 bg-background hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 px-4 py-2.5 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                    <span>Tolak Perpanjangan</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1B. Form Pengembalian Buku (jika intent === 'return') */}
            {intent === "return" && (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-sm font-bold">
                  <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {hasPendingExtension
                      ? "Atau Proses Pengembalian Buku Fisik"
                      : "Proses Pengembalian Buku"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                  <div className="flex-1 min-w-50 space-y-1">
                    <label className="text-xs font-bold text-muted-foreground">
                      Pilih Kondisi Buku
                    </label>
                    <Select
                      value={returnCondition}
                      onValueChange={(val) =>
                        onReturnConditionChange(val as any)
                      }
                    >
                      <SelectTrigger className="w-full text-sm font-bold bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Kondisi Baik (Normal)</SelectItem>
                        <SelectItem value="damaged">
                          Kondisi Rusak (Denda Kerusakan)
                        </SelectItem>
                        <SelectItem value="lost">Buku Hilang (Ganti Rugi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <button
                    onClick={() => onReturn(returnCondition)}
                    disabled={loading}
                    className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50 shrink-0 ${
                      returnCondition === "good"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : returnCondition === "damaged"
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle className="size-4" />
                    )}
                    <span>
                      Kembalikan (
                      {returnCondition === "good"
                        ? "Kondisi Baik"
                        : returnCondition === "damaged"
                        ? "Kondisi Rusak"
                        : "Hilang"}
                      )
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* 1C. Intent = INSPECT (Hanya periksa status jika tidak ada perpanjangan pending) */}
            {intent === "inspect" && !hasPendingExtension && (
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">
                      Status Pemeriksaan: Sedang Dipinjam
                    </h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                      Dipinjam oleh{" "}
                      <strong>
                        {itemResult.activeLoan?.memberName || "Anggota"}
                      </strong>{" "}
                      (Jatuh tempo:{" "}
                      <strong>
                        {formatDateStr(itemResult.activeLoan?.dueDate)}
                      </strong>
                      ).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onIntentChange("return")}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="size-3.5" />
                    <span>Proses Pengembalian</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1D. Intent = LOAN (Tujuan ingin pinjam, tapi buku sedang dipinjam) */}
            {intent === "loan" && !hasPendingExtension && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">
                      Buku Sedang Dalam Masa Peminjaman
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                      Tujuan yang Anda pilih adalah <strong>Pinjam</strong>. Namun
                      buku ini saat ini sedang dipinjam oleh{" "}
                      <strong>
                        {itemResult.activeLoan?.memberName || "anggota lain"}
                      </strong>{" "}
                      hingga{" "}
                      <strong>
                        {formatDateStr(itemResult.activeLoan?.dueDate)}
                      </strong>
                      . Buku tidak dapat dipinjamkan kembali sampai buku ini
                      dikembalikan.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                  <button
                    type="button"
                    onClick={() => onIntentChange("return")}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Beralih ke Pengembalian Buku Ini</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Scan Buku Lain
                  </button>
                </div>
              </div>
            )}

            {/* 1E. Intent = INSPECT saat ada pending extension */}
            {intent === "inspect" && hasPendingExtension && (
              <div className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-800/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">
                    Atau proses pengembalian jika anggota mengembalikan buku
                    fisik:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onIntentChange("return")}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle className="size-3.5" />
                  <span>Form Pengembalian Buku</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* KONDISI 2: ADA PERMINTAAN PEMINJAMAN (REQUEST DARI ANGGOTA) */}
        {hasPendingRequest && itemResult.activeLoan && (
          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  Permintaan Peminjaman Ditemukan
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  Anggota{" "}
                  <strong>
                    {itemResult.activeLoan.memberName || "Anggota"}
                  </strong>{" "}
                  telah mengajukan permintaan peminjaman untuk buku ini. Silakan
                  periksa kondisi fisik buku sebelum menyetujui penyerahan.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
              <button
                onClick={onLoan}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle className="size-4" />
                )}
                <span>Setujui & Serahkan Buku</span>
              </button>
              <button
                type="button"
                onClick={onReset}
                className="px-3.5 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Scan Buku Lain
              </button>
            </div>
          </div>
        )}

        {/* KONDISI 3: BUKU TIDAK SEDANG DIPINJAM DAN TIDAK ADA YANG REQUEST */}
        {!isLoaned && !hasPendingRequest && (
          <div className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-800/40 p-4">
            <div className="flex items-start gap-3">
              <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  {intent === "loan"
                    ? "Tidak Ada Permintaan Peminjaman (Request)"
                    : intent === "return"
                    ? "Buku Tidak Sedang Dipinjam"
                    : "Buku Tersedia di Perpustakaan"}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {intent === "loan"
                    ? "Belum ada anggota perpustakaan yang mengajukan permintaan (request) untuk kode buku ini. Tombol pinjamkan dinonaktifkan karena buku hanya dapat diserahkan jika sudah ada request peminjaman dari anggota."
                    : intent === "return"
                    ? "Buku ini berstatus tersedia di rak perpustakaan dan saat ini tidak sedang dalam masa peminjaman."
                    : "Buku ini berstatus tersedia di rak perpustakaan. Saat ini tidak ada permintaan (request) peminjaman aktif untuk kode buku ini."}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={onReset}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                Scan / Cari Buku Lain
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
