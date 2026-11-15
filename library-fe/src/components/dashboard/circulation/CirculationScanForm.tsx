import { type RefObject } from "react";
import { Camera, Search, Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export interface CirculationScanFormProps {
  scanInput: string;
  onScanInputChange: (val: string) => void;
  scanType: "qr" | "code";
  onScanTypeChange: (val: "qr" | "code") => void;
  intent: "inspect" | "loan" | "return";
  onIntentChange: (val: "inspect" | "loan" | "return") => void;
  onExecuteLookup: () => void;
  onOpenCamera: () => void;
  loading: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function CirculationScanForm({
  scanInput,
  onScanInputChange,
  scanType,
  onScanTypeChange,
  intent,
  onIntentChange,
  onExecuteLookup,
  onOpenCamera,
  loading,
  inputRef,
}: CirculationScanFormProps) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">
        Scan / Lookup Item
      </h3>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-35">
            <label className="text-xs font-bold text-muted-foreground">Tipe Scan</label>
            <Select value={scanType} onValueChange={(val) => onScanTypeChange(val as "qr" | "code")}>
              <SelectTrigger className="w-full text-sm font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">Item Code / Barcode</SelectItem>
                <SelectItem value="qr">QR Token</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-35">
            <label className="text-xs font-bold text-muted-foreground">Tujuan (Intent)</label>
            <Select value={intent} onValueChange={(val) => onIntentChange(val as "inspect" | "loan" | "return")}>
              <SelectTrigger className="w-full text-sm font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inspect">Periksa (Inspect)</SelectItem>
                <SelectItem value="loan">Pinjam (Loan)</SelectItem>
                <SelectItem value="return">Kembali (Return)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={scanType === "qr" ? "Masukkan / scan QR token..." : "Masukkan / scan kode item..."}
            value={scanInput}
            onChange={(e) => onScanInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onExecuteLookup();
            }}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />

          <button
            type="button"
            onClick={onOpenCamera}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary text-white hover:bg-primary/90 px-4 py-2.5 text-sm font-bold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
          >
            <Camera className="size-4 text-white" />
            <span>Scan Kamera</span>
          </button>

          <button
            aria-label="Lookup"
            onClick={onExecuteLookup}
            disabled={loading || !scanInput.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            <span>Cari Kode</span>
          </button>
        </div>
      </div>
    </div>
  );
}
