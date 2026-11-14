import {
  Barcode,
  BookOpen,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import type { Loan as LoanData } from "@/services/loanService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, getLoanTitle, getLoanAuthor } from "./helpers";

export interface LoanHistoryTableProps {
  loans: LoanData[];
  onSelectLoan: (loan: LoanData) => void;
  displayMode: "auto" | "table" | "cards";
}

export function LoanHistoryTable({
  loans,
  onSelectLoan,
  displayMode,
}: LoanHistoryTableProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card overflow-hidden shadow-2xs ${
        displayMode === "cards"
          ? "hidden"
          : displayMode === "table"
          ? "block"
          : "hidden md:block"
      }`}
    >
      <Table className="w-full">
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-5 py-3.5 w-[42%]">
              Buku & Pengarang
            </TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[20%]">
              Tanggal Pinjam
            </TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[20%]">
              Tanggal Kembali
            </TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 w-[12%] text-center">
              Status
            </TableHead>
            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 pr-5 text-right w-[6%]">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
              <TableRow
                key={loan.id}
                onClick={() => onSelectLoan(loan)}
                className="hover:bg-muted/30 transition-colors cursor-pointer group"
              >
                {/* Buku & Pengarang */}
                <TableCell className="pl-5 py-3.5 align-middle whitespace-normal">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-14 bg-muted rounded-lg shrink-0 overflow-hidden flex items-center justify-center border border-border shadow-2xs">
                      {bib?.image ? (
                        <img
                          src={bib.image}
                          alt={title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center p-1 text-center">
                          <BookOpen size={14} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-xs leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-medium">
                        {author}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {itemCode && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
                            <Barcode size={10} className="shrink-0" />
                            {itemCode}
                          </span>
                        )}
                        {loan.notes && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground line-clamp-1">
                            <FileText size={10} className="shrink-0" />
                            Catatan: {loan.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Tanggal Pinjam */}
                <TableCell className="py-3.5 text-xs text-muted-foreground font-medium align-middle whitespace-normal">
                  <div className="inline-flex items-center gap-1.5">
                    <Calendar size={13} className="text-muted-foreground/70 shrink-0" />
                    <span>{formatDate(loan.loanDate || loan.createdAt)}</span>
                  </div>
                </TableCell>

                {/* Tanggal Kembali */}
                <TableCell className="py-3.5 text-xs text-muted-foreground font-medium align-middle whitespace-normal">
                  <div className="inline-flex items-center gap-1.5">
                    <RotateCcw size={13} className="text-muted-foreground/70 shrink-0" />
                    <span>{formatDate(loan.returnDate || loan.dueDate)}</span>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="py-3.5 align-middle text-center whitespace-normal">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 inline-flex items-center gap-1 ${
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
                </TableCell>

                {/* Aksi */}
                <TableCell className="py-3.5 pr-5 align-middle text-right whitespace-normal">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLoan(loan);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                    title="Lihat Detail Riwayat"
                  >
                    <Eye size={15} />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default LoanHistoryTable;
