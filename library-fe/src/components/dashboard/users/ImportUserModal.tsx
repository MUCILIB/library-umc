import { useState } from "react";
import {
  X,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
} from "lucide-react";
import { importApi } from "@/api/client";

export interface ImportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportUserModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportUserModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; errors: string[] }>;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await importApi.downloadTemplate("users");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunduh template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await importApi.uploadUsers(file);
      setResult(res.data);
      if (res.data.successCount > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Import gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-[540px] rounded-[24px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="text-foreground text-[16px] font-bold">Import Data User CSV</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl">
            <span>Gunakan format CSV dengan pemisah titik koma (;)</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              {downloadingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Unduh Template
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-muted rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <CheckCircle size={16} className="text-emerald-500" />
                <span>Hasil Import: {result.successCount} berhasil dari {result.total} baris</span>
              </div>
              {result.errorCount > 0 && (
                <div className="text-destructive space-y-1 max-h-32 overflow-y-auto">
                  <p className="font-semibold">{result.errorCount} baris bermasalah:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.errors.slice(0, 5).map((e, idx) => (
                      <li key={idx}>Baris {e.row}: {e.errors.join(", ")}</li>
                    ))}
                    {result.errors.length > 5 && <li>...dan {result.errors.length - 5} baris lainnya</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Pilih File CSV User</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={!file || loading}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Upload & Proses
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ImportUserModal;
