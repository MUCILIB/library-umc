import { ArrowLeft } from "lucide-react";
import type { ReturnResult } from "./types";

export interface CirculationReturnSuccessProps {
  returnResult: ReturnResult;
  onReset: () => void;
}

export function CirculationReturnSuccess({ returnResult, onReset }: CirculationReturnSuccessProps) {
  return (
    <div className="rounded-3xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 p-6 shadow-sm">
      <h3 className="mb-2 text-base font-extrabold text-blue-700 dark:text-blue-400">
        Pengembalian Berhasil
      </h3>
      <p className="text-sm font-bold text-blue-600 dark:text-blue-300">
        {returnResult.message}
      </p>
      {returnResult.fine && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/60 p-4">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Rincian Denda</p>
          <div className="grid gap-2 sm:grid-cols-3 mt-2">
            <div>
              <dt className="text-xs font-bold text-muted-foreground uppercase">Hari Terlambat</dt>
              <dd className="text-sm font-bold text-foreground">
                {returnResult.fine.overdueDays} hari
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground uppercase">Jumlah Denda</dt>
              <dd className="text-sm font-extrabold text-red-600">
                Rp {returnResult.fine.assessedAmount}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-muted-foreground uppercase">Status</dt>
              <dd className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {returnResult.fine.status}
              </dd>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={onReset}
        className="mt-5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
      >
        <ArrowLeft className="size-4" /> Kembali ke scan
      </button>
    </div>
  );
}
