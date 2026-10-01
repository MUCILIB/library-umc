import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, QrCode, CheckCircle, ArrowLeft, X, Search } from "lucide-react";
import jsQR from "jsqr";
import { API_BASE_URL } from "@/utils/api-config";
import { useToast } from "@/hooks/useToast";

interface ItemResult {
  item: {
    id: string;
    itemCode: string;
    title: string;
    status: string;
    location: string;
  };
  activeLoan: any;
  allowedActions: string[];
}

interface LoanResult {
  loan: {
    id: string;
    loanCode: string;
    memberId: string;
    itemId: string;
    status: string;
    loanDate: string;
    dueDate: string;
  } | null;
  message: string;
}

interface ReturnResult {
  success: boolean;
  message: string;
  fine?: {
    id: string;
    overdueDays: number;
    assessedAmount: string;
    status: string;
  };
}

// ─── Sub-component: Modal Camera Scanner ─────────────────────────────────────

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

function CameraScannerModal({ isOpen, onClose, onScanSuccess }: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleClose = useCallback(() => {
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let isActive = true;

    async function startCamera() {
      setErrorMsg(null);
      setIsScanning(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;

        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          requestScanFrame();
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        setErrorMsg("Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan di browser Anda.");
        setIsScanning(false);
      }
    }

    function requestScanFrame() {
      if (!isActive) return;

      if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // 1. Scan QR with jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });

          if (code && code.data && code.data.trim().length > 0) {
            isActive = false;
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((track) => track.stop());
              streamRef.current = null;
            }
            onScanSuccess(code.data.trim());
            return;
          }

          // 2. Fallback to BarcodeDetector API for 1D Barcodes
          if ("BarcodeDetector" in window) {
            try {
              const barcodeDetector = new (window as any).BarcodeDetector();
              barcodeDetector.detect(video).then((barcodes: any[]) => {
                if (isActive && barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  isActive = false;
                  if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                  }
                  onScanSuccess(barcodes[0].rawValue.trim());
                }
              }).catch(() => {});
            } catch (_e) {
              // Ignore fallback errors
            }
          }
        }
      }

      animFrameId.current = requestAnimationFrame(requestScanFrame);
    }

    startCamera();

    return () => {
      isActive = false;
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 text-foreground animate-in fade-in duration-200">
      {/* Top Floating Glassmorphic Header */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10 pt-2 px-2">
        <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/40 dark:border-slate-700/50 shadow-xl">
          <QrCode className="size-5 text-primary" />
          <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-foreground">Pemindaian QR & Barcode</h3>
        </div>

        {/* Big Exit X Button */}
        <button
          onClick={handleClose}
          aria-label="Batal"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/80 dark:bg-slate-900/80 hover:bg-red-500 hover:text-white border border-white/40 dark:border-slate-700/50 text-foreground flex items-center justify-center transition-all duration-200 shadow-xl cursor-pointer active:scale-95"
          title="Batal & Tutup Kamera"
        >
          <X className="size-6 sm:size-7" />
        </button>
      </div>

      {/* Center Camera Frame Viewport - Well-Proportioned Aspect 4:3 */}
      <div className="relative w-full max-w-lg aspect-4/3 my-auto rounded-3xl overflow-hidden border-2 border-white/50 dark:border-slate-700/60 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning Target Reticle & Laser */}
        {isScanning && !errorMsg && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4 bg-black/15">
            {/* Center Reticle Box */}
            <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-primary/90 rounded-3xl relative shadow-[0_0_35px_rgba(37,99,235,0.4)] flex items-center justify-center">
              {/* Corner Markers */}
              <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-primary rounded-tl-2xl -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-primary rounded-tr-2xl -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-primary rounded-bl-2xl -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-primary rounded-br-2xl -mb-1 -mr-1" />

              {/* Animated Laser Line */}
              <div className="w-full h-0.5 bg-linear-to-r from-transparent via-primary to-transparent animate-pulse shadow-[0_0_12px_rgba(37,99,235,0.8)]" />
            </div>

            <p className="mt-5 text-xs sm:text-sm font-bold text-white bg-slate-900/80 backdrop-blur-md px-5 py-2 rounded-full border border-white/20 text-center shadow-lg">
              Arahkan kamera ke QR Code atau Barcode Buku
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div className="p-6 text-center text-white space-y-4 max-w-sm">
            <AlertCircle className="size-12 text-red-400 mx-auto" />
            <p className="text-sm font-semibold text-red-200 leading-relaxed">{errorMsg}</p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold text-white transition-all shadow-lg cursor-pointer"
            >
              Tutup & Kembali
            </button>
          </div>
        )}
      </div>

      {/* Bottom Floating Glass Control Bar */}
      <div className="w-full max-w-md flex flex-col items-center gap-3 z-10 pb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-primary bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/40 dark:border-slate-700/50 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
          <span>Kamera Memindai...</span>
        </div>

        <button
          onClick={handleClose}
          className="w-full sm:w-auto px-8 py-3 bg-white/90 dark:bg-slate-900/90 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 text-foreground rounded-2xl font-extrabold text-sm backdrop-blur-xl border border-white/50 dark:border-slate-700/50 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 cursor-pointer"
        >
          <X className="size-5" />
          <span>Batal Pemindaian</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function useSafeToast() {
  try {
    return useToast();
  } catch (_e) {
    return {
      success: (_title: string, _desc?: string) => {},
      error: (_title: string, _desc?: string) => {},
      loading: (_title: string, _desc?: string) => "",
      dismiss: (_id?: string) => {}
    };
  }
}

export default function CirculationSection() {
  const [mode, setMode] = useState<"scan" | "result" | "loan" | "return" | "fine">("scan");
  const [scanInput, setScanInput] = useState("");
  const [scanType, setScanType] = useState<"qr" | "code">("code");
  const [intent, setIntent] = useState<"inspect" | "loan" | "return">("inspect");
  const [itemResult, setItemResult] = useState<ItemResult | null>(null);
  const [loanResult, setLoanResult] = useState<LoanResult | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const toast = useSafeToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode === "scan") {
      inputRef.current?.focus();
    }
  }, [mode]);

  const executeLookup = async (valueToScan?: string) => {
    const inputVal = (valueToScan ?? scanInput).trim();
    if (!inputVal) return;

    setLoading(true);
    setError(null);
    try {
      const endpoint = scanType === "qr" ? "/api/qr/scan" : "/api/qr/lookup";
      const body = scanType === "qr"
        ? { token: inputVal, intent }
        : { itemCode: inputVal, intent };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Item tidak ditemukan");
        return;
      }
      setItemResult(data.data);
      setMode("result");
    } catch (err: any) {
      setError(err.message || "Kesalahan jaringan saat memproses scan");
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScanSuccess = useCallback((scannedText: string) => {
    setIsCameraOpen(false);
    setScanInput(scannedText);
    toast.success("Kode Berhasil Dipindai!", `Kode: ${scannedText}`);
    executeLookup(scannedText);
  }, [scanType, intent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoan = async () => {
    if (!itemResult) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/loans/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ memberId: "current-user", bibliographyId: itemResult.item.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Peminjaman gagal");
        return;
      }
      setLoanResult(data.data ? { loan: data.data, message: data.message } : { loan: null, message: data.message });
      setMode("loan");
    } catch (err: any) {
      setError(err.message || "Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (condition: string) => {
    if (!itemResult) return;
    setLoading(true);
    setError(null);
    try {
      const loanId = itemResult.activeLoan?.id || "current-loan";
      const res = await fetch(`${API_BASE_URL}/api/loans/${loanId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ condition }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Pengembalian gagal");
        return;
      }
      setReturnResult(data);
      setMode("fine");
    } catch (err: any) {
      setError(err.message || "Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMode("scan");
    setScanInput("");
    setItemResult(null);
    setLoanResult(null);
    setReturnResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Sirkulasi</h2>
        <p className="mt-1 text-sm text-muted-foreground">Scan Kamera, QR Scan, Peminjaman, dan Pengembalian Buku</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
            <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {mode === "scan" && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-muted-foreground uppercase tracking-wider">Scan / Lookup Item</h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-xs font-bold text-muted-foreground">Tipe Scan</label>
                <select
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value as "qr" | "code")}
                  className="rounded-xl border border-border px-3 py-2 text-sm bg-background font-bold text-foreground"
                >
                  <option value="code">Item Code / Barcode</option>
                  <option value="qr">QR Token</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                <label className="text-xs font-bold text-muted-foreground">Tujuan (Intent)</label>
                <select
                  value={intent}
                  onChange={(e) => setIntent(e.target.value as "inspect" | "loan" | "return")}
                  className="rounded-xl border border-border px-3 py-2 text-sm bg-background font-bold text-foreground"
                >
                  <option value="inspect">Periksa (Inspect)</option>
                  <option value="loan">Pinjam (Loan)</option>
                  <option value="return">Kembali (Return)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <input
                ref={inputRef}
                type="text"
                placeholder={scanType === "qr" ? "Masukkan / scan QR token..." : "Masukkan / scan kode item..."}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") executeLookup(); }}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary text-white hover:bg-primary/90 px-4 py-2.5 text-sm font-bold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
              >
                <QrCode className="size-4 text-white" />
                <span>Scan QR</span>
              </button>

              <button
                aria-label="Lookup"
                onClick={() => executeLookup()}
                disabled={loading || !scanInput.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                <span>Cari Kode</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "result" && itemResult && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Item Ditemukan</h3>
            <button onClick={reset} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              <ArrowLeft className="size-4" /> Kembali
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-border">
            <div><dt className="text-xs font-bold text-muted-foreground uppercase">Kode Buku / Item</dt><dd className="text-sm font-mono font-bold text-foreground">{itemResult.item.itemCode}</dd></div>
            <div><dt className="text-xs font-bold text-muted-foreground uppercase">Judul</dt><dd className="text-sm font-bold text-foreground">{itemResult.item.title}</dd></div>
            <div><dt className="text-xs font-bold text-muted-foreground uppercase">Status</dt><dd className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{itemResult.item.status}</dd></div>
            <div><dt className="text-xs font-bold text-muted-foreground uppercase">Lokasi / Rak</dt><dd className="text-sm font-medium text-foreground">{itemResult.item.location}</dd></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {itemResult.allowedActions.includes("loan") && (
              <button onClick={handleLoan} disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                Pinjamkan Buku
              </button>
            )}
            {itemResult.allowedActions.includes("return") && (
              <>
                <button onClick={() => handleReturn("good")} disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition-all active:scale-95">
                  Kembalikan (Kondisi Baik)
                </button>
                <button onClick={() => handleReturn("damaged")} disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition-all active:scale-95">
                  Kembalikan (Kondisi Rusak)
                </button>
                <button onClick={() => handleReturn("lost")} disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95">
                  Kembalikan (Hilang)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {mode === "loan" && loanResult && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 p-6 shadow-sm">
          <h3 className="mb-2 text-base font-extrabold text-emerald-700 dark:text-emerald-400">Peminjaman Berhasil</h3>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-300">{loanResult.message}</p>
          {loanResult.loan && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 bg-white dark:bg-emerald-900/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <div><dt className="text-xs font-bold text-muted-foreground uppercase">Status</dt><dd className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{loanResult.loan.status}</dd></div>
              <div><dt className="text-xs font-bold text-muted-foreground uppercase">Jatuh Tempo</dt><dd className="text-sm font-bold text-foreground">{loanResult.loan.dueDate}</dd></div>
            </div>
          )}
          <button onClick={reset} className="mt-5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1">
            <ArrowLeft className="size-4" /> Kembali ke scan
          </button>
        </div>
      )}

      {mode === "fine" && returnResult && (
        <div className="rounded-3xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/50 p-6 shadow-sm">
          <h3 className="mb-2 text-base font-extrabold text-blue-700 dark:text-blue-400">Pengembalian Berhasil</h3>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-300">{returnResult.message}</p>
          {returnResult.fine && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/60 p-4">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Rincian Denda</p>
              <div className="grid gap-2 sm:grid-cols-3 mt-2">
                <div><dt className="text-xs font-bold text-muted-foreground uppercase">Hari Terlambat</dt><dd className="text-sm font-bold text-foreground">{returnResult.fine.overdueDays} hari</dd></div>
                <div><dt className="text-xs font-bold text-muted-foreground uppercase">Jumlah Denda</dt><dd className="text-sm font-extrabold text-red-600">Rp {returnResult.fine.assessedAmount}</dd></div>
                <div><dt className="text-xs font-bold text-muted-foreground uppercase">Status</dt><dd className="text-sm font-bold text-amber-700 dark:text-amber-400">{returnResult.fine.status}</dd></div>
              </div>
            </div>
          )}
          <button onClick={reset} className="mt-5 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1">
            <ArrowLeft className="size-4" /> Kembali ke scan
          </button>
        </div>
      )}

      {/* Modal Camera Scanner */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={handleCameraScanSuccess}
      />
    </div>
  );
}
