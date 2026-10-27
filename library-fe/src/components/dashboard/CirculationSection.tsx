import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, AlertCircle, Camera, CheckCircle, ArrowLeft, X, Search, SwitchCamera, Barcode, Info, RefreshCw, Clock } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";
import { API_BASE_URL } from "@/utils/api-config";
import { getAuthHeaders } from "@/api/client";
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

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 200);
  } catch (_e) {
    // Audio context may not be supported or allowed by autoplay policy
  }
}

const SCAN_FORMATS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.DATA_MATRIX,
];

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

function CameraScannerModal({ isOpen, onClose, onScanSuccess }: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const isHandledRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);

  const cleanupScanner = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (_e) {}
      readerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const handleClose = useCallback(() => {
    cleanupScanner();
    onClose();
  }, [cleanupScanner, onClose]);

  const handleSwitchCamera = useCallback(() => {
    if (cameras.length <= 1) return;
    cleanupScanner();
    setCameraIndex((prev) => (prev + 1) % cameras.length);
  }, [cameras.length, cleanupScanner]);

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    let isMounted = true;
    isHandledRef.current = false;
    setErrorMsg(null);
    setIsScanning(true);

    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, SCAN_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, 250);
    readerRef.current = reader;

    async function startScanning() {
      try {
        // Enumerate video devices if available
        let devices: MediaDeviceInfo[] = [];
        try {
          devices = await reader.listVideoInputDevices();
          if (isMounted && devices.length > 0) {
            setCameras(devices);
          }
        } catch (_devErr) {
          // Ignore enumeration failure
        }

        if (!isMounted || !videoRef.current) return;

        const targetDeviceId = (devices.length > 0 ? devices[cameraIndex % devices.length]?.deviceId : null) ?? null;

        await reader.decodeFromVideoDevice(
          targetDeviceId,
          videoRef.current,
          (result, _err) => {
            if (!isMounted || isHandledRef.current) return;
            if (result) {
              const text = result.getText();
              if (text && text.trim().length > 0) {
                isHandledRef.current = true;
                playScanBeep();
                cleanupScanner();
                onScanSuccess(text.trim());
              }
            }
          }
        );
      } catch (err: any) {
console.error("Camera error:", err);
        if (isMounted) {
          setIsScanning(false);
          const name = err?.name || "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            setErrorMsg("Izin akses kamera ditolak. Berikan izin kamera pada browser untuk memindai.");
          } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
            setErrorMsg("Kamera tidak ditemukan pada perangkat ini.");
          } else {
            setErrorMsg("Tidak dapat mengaktifkan kamera. Pastikan kamera tidak digunakan oleh aplikasi lain.");
          }
        }
      }
    }

    startScanning();

    return () => {
      isMounted = false;
      cleanupScanner();
    };
  }, [isOpen, cameraIndex, onScanSuccess, cleanupScanner]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Pemindaian Kamera (QR & Barcode)"
      size="md"
    >
      <div className="space-y-4">
        {/* Viewfinder Kamera */}
        <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950 border border-border flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Status Indicator & Camera Switch */}
          {isScanning && !errorMsg && (
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
              <div className="flex items-center gap-2 text-[11px] font-bold text-white bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Memindai Kamera...</span>
              </div>

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="pointer-events-auto flex items-center gap-1.5 text-[11px] font-bold text-white bg-black/70 hover:bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Ganti Kamera"
                >
                  <SwitchCamera className="size-3.5" />
                  <span>Kamera ({cameraIndex + 1}/{cameras.length})</span>
                </button>
              )}
            </div>
          )}

          {/* Reticle / Kotak Bidik Barcode & QR */}
          {isScanning && !errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
              <div className="w-64 h-36 sm:w-80 sm:h-44 border-2 border-white/80 rounded-2xl relative shadow-[0_0_30px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-red-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-red-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-red-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-red-500 rounded-br-xl" />

                {/* Laser scan line */}
                <div className="w-[88%] h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse" />
              </div>

              <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-medium text-white/90">
                <Barcode className="size-3.5 text-red-400" />
                <span>QR Code • Code 128 • EAN-13 • UPC</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {errorMsg && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
              <AlertCircle className="size-10 text-red-400" />
              <p className="text-xs font-semibold text-red-200 leading-relaxed max-w-xs">
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Tutup Kamera
              </button>
            </div>
          )}
        </div>

        {/* Footer Info & Batal */}
        <div className="flex flex-col items-center gap-2.5 pt-1">
          <p className="text-xs text-muted-foreground text-center font-medium">
            Arahkan kamera ke Barcode atau QR Code pada buku atau kartu anggota
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border border-border"
          >
            <X className="size-4" />
            <span>Batal Pemindaian</span>
          </button>
        </div>
      </div>
    </Modal>
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
  const [returnCondition, setReturnCondition] = useState<"good" | "damaged" | "lost">("good");
  const [itemResult, setItemResult] = useState<ItemResult | null>(null);
  const [loanResult, setLoanResult] = useState<LoanResult | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const toast = useSafeToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const formatDateStr = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch (_e) {
      return dateStr;
    }
  };

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
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inputVal);
      const effectiveScanType = scanType === "qr" || isUuid ? "qr" : "code";
      const endpoint = effectiveScanType === "qr" ? "/api/qr/scan" : "/api/qr/lookup";
      const body = {
        itemCode: inputVal,
        token: inputVal,
        intent,
      };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      let data: any;
      try {
        data = await res.json();
      } catch (_jsonErr) {
        const text = typeof res.text === "function" ? await res.text().catch(() => "") : "";
        setError(res.ok ? "Format data respons tidak valid" : `Kesalahan server (${res.status}): ${text.substring(0, 100)}`);
        return;
      }

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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scannedText);
    if (isUuid) {
      setScanType("qr");
    } else {
      setScanType("code");
    }
    toast.success("Kode Berhasil Dipindai!", `Kode: ${scannedText}`);
    executeLookup(scannedText);
  }, [scanType, intent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoan = async () => {
    if (!itemResult) return;
    const isPending = Boolean(itemResult.activeLoan && itemResult.activeLoan.status === "pending");
    if (!isPending) {
      setError("Tidak ada permintaan peminjaman (request) aktif untuk buku ini.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const loanId = itemResult.activeLoan!.id;
      const res = await fetch(`${API_BASE_URL}/api/loans/${loanId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });

      let data: any;
      try {
        data = await res.json();
      } catch (_jsonErr) {
        const text = typeof res.text === "function" ? await res.text().catch(() => "") : "";
        setError(`Kesalahan server (${res.status}): ${text.substring(0, 100)}`);
        return;
      }

      if (!data.success) {
        setError(data.message || "Persetujuan peminjaman gagal");
        return;
      }
      setLoanResult(data.data ? { loan: data.data, message: data.message } : { loan: null, message: data.message });
      setMode("loan");
      toast.success("Peminjaman Disetujui!", `Buku ${itemResult.item.title} berhasil dipinjamkan.`);
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
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ condition }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch (_jsonErr) {
        const text = typeof res.text === "function" ? await res.text().catch(() => "") : "";
        setError(`Kesalahan server (${res.status}): ${text.substring(0, 100)}`);
        return;
      }

      if (!data.success) {
        setError(data.message || "Pengembalian gagal");
        return;
      }
      const returnData = data.data && typeof data.data === "object" ? { ...data, ...data.data } : data;
      setReturnResult(returnData);
      setMode("fine");
    } catch (err: any) {
      setError(err.message || "Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExtension = async () => {
    if (!itemResult?.activeLoan) return;
    setLoading(true);
    setError(null);
    try {
      const loanId = itemResult.activeLoan.id;
      const res = await fetch(`${API_BASE_URL}/api/loans/${loanId}/approve-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
      });

      let data: any;
      try {
        data = await res.json();
      } catch (_jsonErr) {
        const text = typeof res.text === "function" ? await res.text().catch(() => "") : "";
        setError(`Kesalahan server (${res.status}): ${text.substring(0, 100)}`);
        return;
      }

      if (!data.success) {
        setError(data.message || "Persetujuan perpanjangan gagal");
        return;
      }

      const newDueDate = data.data?.newDueDate || itemResult.activeLoan.dueDate;
      toast.success("Perpanjangan Disetujui!", data.message || `Masa pinjam diperpanjang hingga ${formatDateStr(newDueDate)}.`);

      setItemResult({
        ...itemResult,
        activeLoan: {
          ...itemResult.activeLoan,
          dueDate: newDueDate,
          status: "extended",
          extensionStatus: "approved",
          extendCount: (itemResult.activeLoan.extendCount ?? 0) + 1,
        },
        allowedActions: itemResult.allowedActions.filter((a) => a !== "approve_extension"),
      });
    } catch (err: any) {
      setError(err.message || "Kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectExtension = async () => {
    if (!itemResult?.activeLoan) return;
    setLoading(true);
    setError(null);
    try {
      const loanId = itemResult.activeLoan.id;
      const res = await fetch(`${API_BASE_URL}/api/loans/${loanId}/reject-extension`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        credentials: "include",
      });

      let data: any;
      try {
        data = await res.json();
      } catch (_jsonErr) {
        const text = typeof res.text === "function" ? await res.text().catch(() => "") : "";
        setError(`Kesalahan server (${res.status}): ${text.substring(0, 100)}`);
        return;
      }

      if (!data.success) {
        setError(data.message || "Penolakan perpanjangan gagal");
        return;
      }

      toast.success("Perpanjangan Ditolak", data.message || "Permintaan perpanjangan telah ditolak.");

      setItemResult({
        ...itemResult,
        activeLoan: {
          ...itemResult.activeLoan,
          extensionStatus: "rejected",
        },
        allowedActions: itemResult.allowedActions.filter((a) => a !== "approve_extension"),
      });
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
    setReturnCondition("good");
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
              <div className="flex flex-col gap-1 flex-1 min-w-35">
                <label className="text-xs font-bold text-muted-foreground">Tipe Scan</label>
                <Select value={scanType} onValueChange={(val) => setScanType(val as "qr" | "code")}>
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
                <Select value={intent} onValueChange={(val) => setIntent(val as "inspect" | "loan" | "return")}>
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
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") executeLookup(); }}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm bg-background text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />

              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary text-white hover:bg-primary/90 px-4 py-2.5 text-sm font-bold transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
              >
                <Camera className="size-4 text-white" />
                <span>Scan Kamera</span>
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

      {mode === "result" && itemResult && (() => {
        const isLoaned = Boolean(
          itemResult.item.status === "loaned" ||
          (itemResult.activeLoan && ["approved", "extended"].includes(itemResult.activeLoan.status))
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
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Item Ditemukan</h3>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  intent === "loan"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : intent === "return"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                }`}>
                  Tujuan: {intent === "loan" ? "Pinjam (Loan)" : intent === "return" ? "Kembali (Return)" : "Periksa (Inspect)"}
                </span>
              </div>
              <button onClick={reset} className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer">
                <ArrowLeft className="size-4" /> Kembali
              </button>
            </div>

            {/* Rincian Buku */}
            <div className="grid gap-4 sm:grid-cols-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-border">
              <div>
                <dt className="text-xs font-bold text-muted-foreground uppercase">Kode Buku / Item</dt>
                <dd className="text-sm font-mono font-bold text-foreground">{itemResult.item.itemCode}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-muted-foreground uppercase">Judul</dt>
                <dd className="text-sm font-bold text-foreground">{itemResult.item.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-muted-foreground uppercase">Status</dt>
                <dd className="text-sm font-bold flex flex-wrap items-center gap-2">
                  <span className={isLoaned ? "text-amber-600 dark:text-amber-400 capitalize" : hasPendingRequest ? "text-indigo-600 dark:text-indigo-400 capitalize" : "text-emerald-600 dark:text-emerald-400 capitalize"}>
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
                <dt className="text-xs font-bold text-muted-foreground uppercase">Lokasi / Rak</dt>
                <dd className="text-sm font-medium text-foreground">{itemResult.item.location || "-"}</dd>
              </div>

              {/* Informasi Peminjaman Aktif jika ada */}
              {itemResult.activeLoan && isLoaned && (
                <>
                  <div className="sm:col-span-1 pt-2 border-t border-border/60">
                    <dt className="text-xs font-bold text-muted-foreground uppercase">Peminjam Aktif</dt>
                    <dd className="text-sm font-bold text-foreground">
                      {itemResult.activeLoan.memberName || itemResult.activeLoan.memberId || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1 pt-2 border-t border-border/60">
                    <dt className="text-xs font-bold text-muted-foreground uppercase">
                      {hasPendingExtension ? "Jatuh Tempo Saat Ini" : "Jatuh Tempo Pengembalian"}
                    </dt>
                    <dd className={`text-sm font-bold ${hasPendingExtension ? "text-purple-600 dark:text-purple-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {formatDateStr(itemResult.activeLoan.dueDate)}
                    </dd>
                  </div>
                </>
              )}

              {/* Informasi Permintaan Peminjaman jika ada request */}
              {itemResult.activeLoan && hasPendingRequest && (
                <>
                  <div className="sm:col-span-1 pt-2 border-t border-border/60">
                    <dt className="text-xs font-bold text-muted-foreground uppercase">Pemohon Pinjam (Member)</dt>
                    <dd className="text-sm font-bold text-foreground">
                      {itemResult.activeLoan.memberName || itemResult.activeLoan.memberId || "-"}
                    </dd>
                  </div>
                  <div className="sm:col-span-1 pt-2 border-t border-border/60">
                    <dt className="text-xs font-bold text-muted-foreground uppercase">Rencana Jatuh Tempo</dt>
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
                            Anggota <strong>{itemResult.activeLoan.memberName || "Peminjam"}</strong> telah mengajukan permohonan perpanjangan waktu peminjaman untuk buku ini. Jatuh tempo saat ini adalah <strong>{formatDateStr(itemResult.activeLoan.dueDate)}</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-purple-200/60 dark:border-purple-900/40">
                        <button
                          onClick={handleApproveExtension}
                          disabled={loading}
                          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                          <span>Setujui Perpanjangan (+7 Hari)</span>
                        </button>
                        <button
                          onClick={handleRejectExtension}
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
                        <span>{hasPendingExtension ? "Atau Proses Pengembalian Buku Fisik" : "Proses Pengembalian Buku"}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1 min-w-50 space-y-1">
                          <label className="text-xs font-bold text-muted-foreground">Pilih Kondisi Buku</label>
                          <Select value={returnCondition} onValueChange={(val) => setReturnCondition(val as any)}>
                            <SelectTrigger className="w-full text-sm font-bold bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="good">Kondisi Baik (Normal)</SelectItem>
                              <SelectItem value="damaged">Kondisi Rusak (Denda Kerusakan)</SelectItem>
                              <SelectItem value="lost">Buku Hilang (Ganti Rugi)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <button
                          onClick={() => handleReturn(returnCondition)}
                          disabled={loading}
                          className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50 shrink-0 ${
                            returnCondition === "good"
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : returnCondition === "damaged"
                              ? "bg-amber-600 hover:bg-amber-700"
                              : "bg-red-600 hover:bg-red-700"
                          }`}
                        >
                          {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                          <span>
                            Kembalikan ({returnCondition === "good" ? "Kondisi Baik" : returnCondition === "damaged" ? "Kondisi Rusak" : "Hilang"})
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
                          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Status Pemeriksaan: Sedang Dipinjam</h4>
                          <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                            Dipinjam oleh <strong>{itemResult.activeLoan?.memberName || "Anggota"}</strong> (Jatuh tempo: <strong>{formatDateStr(itemResult.activeLoan?.dueDate)}</strong>).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIntent("return")}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle className="size-3.5" />
                          <span>Proses Pengembalian</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 1C. Intent = LOAN (Tujuan ingin pinjam, tapi buku sedang dipinjam) */}
                  {intent === "loan" && !hasPendingExtension && (
                    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Buku Sedang Dalam Masa Peminjaman</h4>
                          <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                            Tujuan yang Anda pilih adalah <strong>Pinjam</strong>. Namun buku ini saat ini sedang dipinjam oleh{" "}
                            <strong>{itemResult.activeLoan?.memberName || "anggota lain"}</strong> hingga{" "}
                            <strong>{formatDateStr(itemResult.activeLoan?.dueDate)}</strong>. Buku tidak dapat dipinjamkan kembali sampai buku ini dikembalikan.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                        <button
                          type="button"
                          onClick={() => setIntent("return")}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw className="size-3.5" />
                          <span>Beralih ke Pengembalian Buku Ini</span>
                        </button>
                        <button
                          type="button"
                          onClick={reset}
                          className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                          Scan Buku Lain
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 1D. Intent = INSPECT saat ada pending extension, sediakan opsi form pengembalian */}
                  {intent === "inspect" && hasPendingExtension && (
                    <div className="rounded-2xl border border-border bg-slate-50 dark:bg-slate-800/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Info className="size-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">
                          Atau proses pengembalian jika anggota mengembalikan buku fisik:
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIntent("return")}
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
                        Anggota <strong>{itemResult.activeLoan.memberName || "Anggota"}</strong> telah mengajukan permintaan peminjaman untuk buku ini. Silakan periksa kondisi fisik buku sebelum menyetujui penyerahan.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                    <button
                      onClick={handleLoan}
                      disabled={loading}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                      <span>Setujui & Serahkan Buku</span>
                    </button>
                    <button
                      type="button"
                      onClick={reset}
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
                      onClick={reset}
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
      })()}

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
