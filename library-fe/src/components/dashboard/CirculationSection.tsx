import { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import { getAuthHeaders } from "@/api/client";
import { useToast } from "@/hooks/useToast";
import type { ItemResult, LoanResult, ReturnResult } from "./circulation/types";
import { CameraScannerModal } from "./circulation/CameraScannerModal";
import { CirculationScanForm } from "./circulation/CirculationScanForm";
import { CirculationItemResult } from "./circulation/CirculationItemResult";
import { CirculationLoanSuccess } from "./circulation/CirculationLoanSuccess";
import { CirculationReturnSuccess } from "./circulation/CirculationReturnSuccess";

function useSafeToast() {
  try {
    return useToast();
  } catch (_e) {
    return {
      success: (_title: string, _desc?: string) => {},
      error: (_title: string, _desc?: string) => {},
      loading: (_title: string, _desc?: string) => "",
      dismiss: (_id?: string) => {},
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
        year: "numeric",
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
        <CirculationScanForm
          scanInput={scanInput}
          onScanInputChange={setScanInput}
          scanType={scanType}
          onScanTypeChange={setScanType}
          intent={intent}
          onIntentChange={setIntent}
          onExecuteLookup={() => executeLookup()}
          onOpenCamera={() => setIsCameraOpen(true)}
          loading={loading}
          inputRef={inputRef}
        />
      )}

      {mode === "result" && itemResult && (
        <CirculationItemResult
          itemResult={itemResult}
          intent={intent}
          onIntentChange={setIntent}
          returnCondition={returnCondition}
          onReturnConditionChange={setReturnCondition}
          loading={loading}
          onLoan={handleLoan}
          onReturn={handleReturn}
          onApproveExtension={handleApproveExtension}
          onRejectExtension={handleRejectExtension}
          onReset={reset}
          formatDateStr={formatDateStr}
        />
      )}

      {mode === "loan" && loanResult && (
        <CirculationLoanSuccess
          loanResult={loanResult}
          onReset={reset}
        />
      )}

      {mode === "fine" && returnResult && (
        <CirculationReturnSuccess
          returnResult={returnResult}
          onReset={reset}
        />
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
