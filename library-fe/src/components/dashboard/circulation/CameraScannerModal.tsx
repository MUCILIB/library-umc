import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle, X, SwitchCamera, Barcode } from "lucide-react";
import Modal from "@/components/ui/modal";
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from "@zxing/library";

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

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export function CameraScannerModal({ isOpen, onClose, onScanSuccess }: CameraScannerModalProps) {
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
