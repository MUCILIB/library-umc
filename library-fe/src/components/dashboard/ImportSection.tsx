import { useEffect, useState, useCallback } from "react";
import {
  FileUp,
  Loader2,
  AlertCircle,
  Upload,
  ChevronRight,
  ArrowLeft,
  Play,
  CheckCircle,
  XCircle,
  Download,
  Eye,
} from "lucide-react";
import { importApi, type ImportBatch, type ImportPreviewResponse } from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ImportSection() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"bibliography" | "item">("bibliography");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const result = await importApi.list();
      setBatches(result.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (uploadType === "bibliography") {
        await importApi.uploadBibliography(file);
      } else {
        await importApi.uploadItem(file);
      }
      await fetchBatches();
      input.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      uploading: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
      parsing: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
      validating: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
      preview: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
      approving: "bg-purple-50 text-purple-700",
      committed: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
      failed: "bg-warning-bg text-destructive",
      cancelled: "bg-muted text-muted-foreground",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  if (selectedBatchId) {
    return (
      <BatchDetail
        batchId={selectedBatchId}
        onBack={() => setSelectedBatchId(null)}
        onRefresh={fetchBatches}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Import Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Import data bibliografi dan item dari file CSV
        </p>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Upload File CSV</h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipe Import</label>
            <Select
              value={uploadType}
              onValueChange={(val) => setUploadType(val as "bibliography" | "item")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipe Import" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bibliography">Bibliografi</SelectItem>
                <SelectItem value="item">Item / Eksemplar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">File CSV</label>
            <input
              type="file"
              accept=".csv"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      {/* Batch List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <FileUp className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-muted-foreground">Belum ada import</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload file CSV untuk memulai import data
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              onClick={() => setSelectedBatchId(batch.id)}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-slate-300"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileUp className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{batch.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.type === "bibliography" ? "Bibliografi" : "Item"} ·{" "}
                    {batch.totalRows} baris ·{" "}
                    {new Date(batch.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 text-xs">
                  <span className="text-emerald-600">{batch.committedRows} berhasil</span>
                  <span className="text-amber-600">{batch.validRows} valid</span>
                  <span className="text-destructive">{batch.invalidRows} gagal</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(batch.status)}`}
                >
                  {batch.status}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// BATCH DETAIL COMPONENT
// ==========================================

function BatchDetail({
  batchId,
  onBack,
}: {
  batchId: string;
  onBack: () => void;
  onRefresh?: () => Promise<void>;
}) {
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    processed: number;
    committed: number;
    failed: number;
    remaining: number;
    hasMore: boolean;
  } | null>(null);

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await importApi.get(batchId);
      setBatch(result.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat batch");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  const fetchPreview = useCallback(async () => {
    try {
      const result = await importApi.preview(batchId);
      setPreview(result.data);
    } catch {
      // Preview might not be available yet
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handleParse = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await importApi.parse(batchId);
      await fetchBatch();
      await fetchPreview();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal parse");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValidate = async () => {
    setActionLoading(true);
    setError(null);
    try {
      await importApi.validate(batchId);
      await fetchBatch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal validasi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await importApi.approve(batchId);
      setApprovalResult(result.data);
      await fetchBatch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal approve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Batalkan import ini?")) return;
    setActionLoading(true);
    setError(null);
    try {
      await importApi.cancel(batchId);
      await fetchBatch();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal cancel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadErrors = async () => {
    try {
      await importApi.downloadErrors(batchId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal download error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="rounded-2xl border border-warning-border bg-warning-bg p-8 text-center">
        <AlertCircle className="mx-auto mb-4 size-12 text-red-400" />
        <p className="text-sm text-destructive">Batch tidak ditemukan</p>
        <button
          onClick={onBack}
          className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
        >
          Kembali
        </button>
      </div>
    );
  }

  const canParse = ["uploading", "uploaded"].includes(batch.status);
  const canValidate = batch.status === "parsed";
  const canApprove = batch.status === "preview" || batch.status === "approving";
  const canCancel = !["committed", "cancelled", "failed"].includes(batch.status);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar
        </button>
        <div className="flex gap-2">
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              <XCircle className="size-4" />
              Batalkan
            </button>
          )}
        </div>
      </div>

      {/* Batch Info */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold text-foreground">{batch.filename}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Tipe</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {batch.type === "bibliography" ? "Bibliografi" : "Item"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <span className="rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                {batch.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Total Baris</dt>
            <dd className="mt-0.5 text-sm text-foreground">{batch.totalRows}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Tanggal</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {new Date(batch.createdAt).toLocaleString("id-ID")}
            </dd>
          </div>
        </div>

        {/* Counters */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{batch.totalRows}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{batch.validRows}</p>
            <p className="text-xs text-emerald-600">Valid</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{batch.invalidRows}</p>
            <p className="text-xs text-amber-600">Invalid</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{batch.committedRows}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Committed</p>
          </div>
          <div className="rounded-lg bg-warning-bg p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{batch.failedRows}</p>
            <p className="text-xs text-destructive">Failed</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Workflow</h3>
        <div className="flex flex-wrap gap-3">
          {canParse && (
            <button
              onClick={handleParse}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Parse
            </button>
          )}
          {canValidate && (
            <button
              onClick={handleValidate}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Validate
            </button>
          )}
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Approve
            </button>
          )}
          {batch.invalidRows > 0 && (
            <button
              onClick={handleDownloadErrors}
              className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              <Download className="size-4" />
              Download Error CSV
            </button>
          )}
        </div>
      </div>

      {/* Approval Result */}
      {approvalResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 p-6">
          <h3 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Hasil Approval</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-2xl font-bold text-emerald-900">{approvalResult.processed}</p>
              <p className="text-xs text-emerald-600">Processed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-900">{approvalResult.committed}</p>
              <p className="text-xs text-emerald-600">Committed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{approvalResult.failed}</p>
              <p className="text-xs text-destructive">Failed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{approvalResult.remaining}</p>
              <p className="text-xs text-amber-600">Remaining</p>
            </div>
          </div>
          {approvalResult.hasMore && (
            <p className="mt-2 text-sm text-emerald-600">
              Masih ada data yang perlu di-approve. Klik Approve lagi.
            </p>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Eye className="size-4" />
            Preview Data
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows?.slice(0, 10).map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.status === "valid"
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                            : row.status === "invalid"
                              ? "bg-warning-bg text-destructive"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <pre className="max-w-xs overflow-hidden text-ellipsis text-xs">
                        {JSON.stringify(row.rawData, null, 2).slice(0, 100)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rows && preview.rows.length > 10 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Menampilkan 10 dari {preview.rows.length} baris
            </p>
          )}
        </div>
      )}
    </div>
  );
}
