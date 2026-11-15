import {
  BookOpen,
  Calendar,
  CheckCircle2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { Loan as LoanData } from "@/services/loanService";
import { Badge } from "@/components/ui/badge";
import { formatDate, getLoanTitle, getLoanAuthor } from "./helpers";

export interface LoanHistoryCardsProps {
  loans: LoanData[];
  onSelectLoan: (loan: LoanData) => void;
  displayMode: "auto" | "table" | "cards";
}

export function LoanHistoryCards({
  loans,
  onSelectLoan,
  displayMode,
}: LoanHistoryCardsProps) {
  return (
    <div
      className={`space-y-3 ${
        displayMode === "table"
          ? "hidden"
          : displayMode === "cards"
          ? "block"
          : "block md:hidden"
      }`}
    >
      {loans.map((loan) => {
        const bib = loan.item?.bibliography;
        const title = getLoanTitle(loan);
        const author = getLoanAuthor(loan);
        const isReturned = loan.status === "returned";
        const itemCode =
          loan.item?.itemCode ||
          loan.item?.barcode ||
          loan.item?.uniqueCode;

        return (
          <div
            key={loan.id}
            onClick={() => onSelectLoan(loan)}
            className="bg-card border border-border rounded-2xl p-4 shadow-2xs hover:border-primary/30 transition-all cursor-pointer space-y-3"
          >
            {/* Top Row: Status badge & Item code */}
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="secondary"
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1 ${
                  isReturned
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive"
                }`}
              >
                {isReturned ? (
                  <>
                    <CheckCircle2 size={11} className="shrink-0" />
                    <span>Dikembalikan</span>
                  </>
                ) : (
                  <>
                    <XCircle size={11} className="shrink-0" />
                    <span>Ditolak</span>
                  </>
                )}
              </Badge>

              {itemCode && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                  {itemCode}
                </span>
              )}
            </div>

            {/* Middle Row: Cover & Book Info */}
            <div className="flex items-start gap-3">
              <div className="w-14 h-20 bg-muted rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-border shadow-2xs">
                {bib?.image ? (
                  <img
                    src={bib.image}
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
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {author}
                </p>
                {loan.notes && (
                  <p className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md mt-1.5 line-clamp-1 inline-block">
                    Catatan: {loan.notes}
                  </p>
                )}
                {loan.rejectReason && (
                  <p className="text-[10px] text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-md mt-1.5 line-clamp-2">
                    Alasan: {loan.rejectReason}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Row: Dates in Structured 2-Column Box */}
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
                <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                  <RotateCcw size={11} className="text-muted-foreground/80" />
                  Tgl Kembali
                </span>
                <p className="font-bold text-foreground text-[11px]">
                  {formatDate(loan.returnDate || loan.dueDate)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LoanHistoryCards;
