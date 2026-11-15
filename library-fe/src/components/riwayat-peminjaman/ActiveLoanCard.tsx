import {
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import type { Loan as LoanData } from "@/services/loanService";
import { Badge } from "@/components/ui/badge";
import { formatDate, getLoanTitle, getLoanAuthor } from "./helpers";

export interface ActiveLoanCardProps {
  loan: LoanData;
  onReturnClick?: (loan: LoanData) => void;
  onExtendClick?: (loan: LoanData) => void;
}

export function ActiveLoanCard({
  loan,
  onReturnClick,
  onExtendClick,
}: ActiveLoanCardProps) {
  const bibliography = loan.item?.bibliography;
  const title = getLoanTitle(loan);
  const author = getLoanAuthor(loan);

  const itemCode =
    loan.item?.itemCode ||
    loan.item?.barcode ||
    loan.item?.uniqueCode;

  const returnPending = loan.returnRequests?.some(
    (r) => r.status === "pending"
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
  if (dueDate) dueDate.setHours(0, 0, 0, 0);

  const daysLeft = dueDate
    ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isLate = daysLeft !== null && daysLeft < 0;
  const isWarning = daysLeft !== null && daysLeft >= 0 && daysLeft <= 2;
  const isPendingApproval = loan.status === "pending";
  const isExtended = loan.status === "extended";

  const formattedDueDate = dueDate
    ? dueDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs hover:border-primary/30 transition-all space-y-3 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Top Row: Status badge & Item code */}
        <div className="flex items-center justify-between gap-2">
          {returnPending ? (
            <Badge
              variant="secondary"
              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1"
            >
              <Clock size={11} className="shrink-0" />
              <span>Pengembalian Diajukan</span>
            </Badge>
          ) : isLate ? (
            <Badge
              variant="secondary"
              className="bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1"
            >
              <AlertCircle size={11} className="shrink-0" />
              <span>Terlambat {Math.abs(daysLeft!)} Hari</span>
            </Badge>
          ) : isPendingApproval ? (
            <Badge
              variant="secondary"
              className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1"
            >
              <Clock size={11} className="shrink-0" />
              <span>Menunggu Persetujuan</span>
            </Badge>
          ) : isExtended ? (
            <Badge
              variant="secondary"
              className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1"
            >
              <RefreshCw size={11} className="shrink-0" />
              <span>Diperpanjang</span>
            </Badge>
          ) : isWarning ? (
            <Badge
              variant="secondary"
              className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1"
            >
              <Clock size={11} className="shrink-0" />
              <span>Sisa {daysLeft === 0 ? "Hari Ini" : `${daysLeft} Hari`}</span>
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1"
            >
              <BookOpen size={11} className="shrink-0" />
              <span>Sedang Dipinjam</span>
            </Badge>
          )}

          {itemCode && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md truncate max-w-[140px]">
              {itemCode}
            </span>
          )}
        </div>

        {/* Middle Row: Cover & Book Info */}
        <div className="flex items-start gap-3">
          <div className="w-14 h-20 bg-muted rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-border shadow-2xs">
            {bibliography?.image ? (
              <img
                src={bibliography.image}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center p-1 text-center">
                <BookOpen size={16} className="text-slate-300" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-2">
              {title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-medium">
              {author}
            </p>
            {loan.item?.location && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate font-medium">
                <MapPin size={10} className="shrink-0 text-muted-foreground/80" />
                <span>
                  {loan.item.location.room
                    ? `${loan.item.location.room}${loan.item.location.rack ? ` / Rak ${loan.item.location.rack}` : ""}`
                    : "-"}
                </span>
              </p>
            )}
            {loan.notes && (
              <p className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md mt-1.5 line-clamp-1 inline-block">
                Catatan: {loan.notes}
              </p>
            )}
          </div>
        </div>

        {/* Dates Row: Structured 2-Column Box */}
        <div className="grid grid-cols-2 gap-2 bg-muted/30 border border-border/60 rounded-xl p-2.5 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar size={11} className="text-muted-foreground/80" />
              Tgl Pinjam
            </span>
            <p className="font-bold text-foreground text-[11px]">
              {formatDate(loan.loanDate || loan.createdAt)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span
              className={`text-[10px] font-semibold flex items-center gap-1 ${
                isLate
                  ? "text-destructive"
                  : isWarning
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-muted-foreground"
              }`}
            >
              <Clock
                size={11}
                className={
                  isLate
                    ? "text-destructive"
                    : isWarning
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-muted-foreground/80"
                }
              />
              Batas Kembali
            </span>
            <p
              className={`font-bold text-[11px] ${
                isLate
                  ? "text-destructive"
                  : isWarning
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-foreground"
              }`}
            >
              {formattedDueDate}
            </p>
          </div>
        </div>

        {/* Overdue Alert banner */}
        {isLate && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[11px] font-semibold">
            <AlertCircle size={13} className="shrink-0" />
            <span>Terlambat {Math.abs(daysLeft!)} hari. Harap segera dikembalikan.</span>
          </div>
        )}

        {/* Return Pending notification */}
        {returnPending && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-400 text-[11px] font-semibold">
            <Clock size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Pengembalian buku sedang menunggu konfirmasi admin.</span>
          </div>
        )}
      </div>

      {/* Bottom Actions Row */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
        {!returnPending ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReturnClick?.(loan);
            }}
            disabled={returnPending}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 text-xs font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Kembalikan</span>
          </button>
        ) : (
          <div className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-bold rounded-xl">
            <Clock size={12} />
            <span>Diajukan</span>
          </div>
        )}

        {loan.status !== "extended" && !isLate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExtendClick?.(loan);
            }}
            disabled={returnPending}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-xl hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Perpanjang</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ActiveLoanCard;
