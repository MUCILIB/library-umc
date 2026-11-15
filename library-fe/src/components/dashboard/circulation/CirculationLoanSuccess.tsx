import { ArrowLeft } from "lucide-react";
import type { LoanResult } from "./types";

export interface CirculationLoanSuccessProps {
  loanResult: LoanResult;
  onReset: () => void;
}

export function CirculationLoanSuccess({ loanResult, onReset }: CirculationLoanSuccessProps) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 p-6 shadow-sm">
      <h3 className="mb-2 text-base font-extrabold text-emerald-700 dark:text-emerald-400">
        Peminjaman Berhasil
      </h3>
      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">
        {loanResult.message}
      </p>
      {loanResult.loan && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 bg-white dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
          <div>
            <dt className="text-xs font-bold text-muted-foreground uppercase">Status</dt>
            <dd className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {loanResult.loan.status}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-muted-foreground uppercase">Jatuh Tempo</dt>
            <dd className="text-sm font-bold text-foreground">
              {loanResult.loan.dueDate}
            </dd>
          </div>
        </div>
      )}
      <button
        onClick={onReset}
        className="mt-5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
      >
        <ArrowLeft className="size-4" /> Kembali ke scan
      </button>
    </div>
  );
}
