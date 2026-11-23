import { useEffect, useRef, useState, useCallback } from "react";
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

const STATUS_LABELS: Record<string, string> = {
  uploading: "Mengunggah",
  uploaded: "Terunggah",
  parsing: "Memproses",
  parsed: "Terproses",
  validating: "Memvalidasi",
  validated: "Tervalidasi",
  preview: "Siap ditinjau",
  approving: "Menyetujui",
  committed: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;

// Ringkas satu baris preview menjadi 2-3 kolom kunci agar konflik terbaca
// tanpa menempel blob JSON mentah.
const PREVIEW_SUMMARY_KEYS = ["title", "item_code", "call_number", "isbn", "author", "pengarang"];

function summarizeRow(row: { rawData?: Record<string, string>; resolvedData?: Record<string, unknown> }) {
  const src: Record<string, unknown> = { ...(row.rawData || {}), ...((row.resolvedData as Record<string, unknown>) || {}) };
  const picked = PREVIEW_SUMMARY_KEYS.flatMap((key) => {
    const value = src[key];
    return value === undefined || value === null || value === "" ? [] : [`${key}: ${String(value)}`];
  });
  const parts = (picked.length > 0 ? picked : Object.entries(src).map(([key, value]) => `${key}: ${String(value)}`)).slice(0, 3);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function downloadSlimsTemplate(type: "bibliography" | "item") {
  let headers = "";
  let sampleRow = "";
  let filename = "";

  if (type === "bibliography") {
    headers = "title;gmd_name;edition;isbn_issn;publisher_name;publish_year;collation;series_title;call_number;language_name;place_name;classification;notes;image;sor;authors;topics;item_code";
    sampleRow = 'Pemrograman Web Modern;Text;Cetakan 1;978-602-1234-56-7;Informatika Bandung;2024;xx, 350 hlm. : ilus. ; 24 cm.;Seri Teknologi;005.13 PEM;Indonesia;Bandung;005.13;Buku ajar pemrograman web;;Tim Dosen;<Budi Santoso><Andi Pratama>;<Pemrograman Web><Javascript>;<B001><B002>';
    filename = "template_slims9_biblio.csv";
  } else {
    headers = "item_code;call_number;coll_type_name;inventory_code;received_date;supplier_name;order_no;location_name;order_date;item_status_name;site;source;invoice;price;price_currency;invoice_date;input_date;last_update;title";
    sampleRow = 'B001;005.13 PEM;Buku Teks;INV-2024-001;2024-01-15;Penerbit Informatika;PO-001;Rak Koleksi TIK;2024-01-10;Tersedia;Kampus 1 UMC;Beli;INV/2024/001;120000;IDR;2024-01-15;2024-01-15 09:00:00;2024-01-15 09:00:00;Pemrograman Web Modern';
    filename = "template_slims9_item.csv";
  }

  const csvContent = "\uFEFF" + headers + "\r\n" + sampleRow + "\r\n";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ImportWorkflow() {
  return (
    <ol aria-label="Tahapan import" className="grid gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-4">
      {["Unggah", "Parse / Validasi", "Tinjau", "Setujui"].map((step, index) => (
        <li key={step} className="flex items-center gap-2">
          <span className="font-semibold text-primary">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ImportSection() {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<"bibliography" | "item">("bibliography");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFilename, setSelectedFilename] = useState("");

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
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setError("Pilih berkas CSV terlebih dahulu.");
      input?.focus();
      return;
    }
    setError(null);

    setUploading(true);
    try {
      if (uploadType === "bibliography") {
        await importApi.uploadBibliography(file);
      } else {
        await importApi.uploadItem(file);
      }
      await fetchBatches();
      if (input) input.value = "";
      setSelectedFilename("");
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

      <ImportWorkflow />
      <p className="text-sm text-muted-foreground">Setelah mengunggah, buka berkas pada daftar untuk memproses dan memvalidasi data. Tinjau hasilnya sebelum menyetujui penyimpanan. Alur pasangan: selesaikan Bibliografi hingga Selesai dulu, lalu unggah Item agar terpasang ke bibliografi.</p>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Upload Berkas CSV</h3>
            <p className="text-xs text-muted-foreground">Kompatibel penuh dengan format ekspor SLiMS 9 Bulian dan format standar perpustakaan</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => downloadSlimsTemplate("bibliography")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="Unduh contoh template berkas CSV Bibliografi sesuai format SLiMS 9"
            >
              <Download className="size-3.5 text-primary" />
              Template SLiMS (Biblio)
            </button>
            <button
              type="button"
              onClick={() => downloadSlimsTemplate("item")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              title="Unduh contoh template berkas CSV Item/Eksemplar sesuai format SLiMS 9"
            >
              <Download className="size-3.5 text-primary" />
              Template SLiMS (Item)
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div>
            <label htmlFor="import-type" className="mb-1 block text-xs font-medium text-muted-foreground">Tipe Import</label>
            <Select
              value={uploadType}
              onValueChange={(val) => setUploadType(val as "bibliography" | "item")}
            >
              <SelectTrigger id="import-type" className="min-h-11 w-full sm:w-[180px]">
                <SelectValue placeholder="Tipe Import" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bibliography">Bibliografi</SelectItem>
                <SelectItem value="item">Item / Eksemplar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label htmlFor="import-file" className="mb-1 block text-xs font-medium text-muted-foreground">File CSV</label>
            <input
              ref={fileInputRef}
              id="import-file"
              aria-describedby="import-file-status"
              onChange={(event) => setSelectedFilename(event.target.files?.[0]?.name || "")}
              type="file"
              accept=".csv"
              disabled={uploading}
              className="min-h-11 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <p id="import-file-status" role="status" className="mt-2 break-all text-xs text-muted-foreground">
              {selectedFilename || "Belum ada berkas dipilih"}
            </p>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
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
        <div role="alert" className="rounded-lg border border-warning-border bg-warning-bg p-4">
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
            <button
              type="button"
              key={batch.id}
              onClick={() => setSelectedBatchId(batch.id)}
              className="flex min-h-11 w-full flex-col gap-4 rounded-xl border border-border bg-card p-4 text-left hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileUp className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="break-all font-medium text-foreground">{batch.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.type === "bibliography" ? "Bibliografi" : "Item"} ·{" "}
                    {batch.totalRows} baris ·{" "}
                    {new Date(batch.createdAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-emerald-600">{batch.committedRows} berhasil</span>
                  <span className="text-amber-600">{batch.validRows} valid</span>
                  <span className="text-destructive">{batch.invalidRows} gagal</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(batch.status)}`}
                >
                  {getStatusLabel(batch.status)}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </button>
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

  useEffect(() => {
    if (batch && ["validated", "preview", "approving"].includes(batch.status)) {
      fetchPreview();
    }
    // ponytail: fetchPreview sengaja tidak di-deps penuh; cukup saat status berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status]);

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
      await fetchPreview();
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
          className="min-h-11 mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
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
        <div role="alert" className="rounded-lg border border-warning-border bg-warning-bg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="min-h-11 flex items-center gap-2 text-sm text-muted-foreground hover:text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar
        </button>
        <div className="flex gap-2">
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
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
                {getStatusLabel(batch.status)}
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
            <p className="text-xs text-amber-600">Tidak valid</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{batch.committedRows}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Tersimpan</p>
          </div>
          <div className="rounded-lg bg-warning-bg p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{batch.failedRows}</p>
            <p className="text-xs text-destructive">Gagal</p>
          </div>
        </div>
      </div>

      <ImportWorkflow />

      {/* Actions */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-muted-foreground">Langkah berikutnya</h3>
        <p className="mb-4 text-sm text-muted-foreground">Proses berkas, lalu validasi. Tinjau jumlah baris valid dan kesalahan sebelum menyetujui penyimpanan data.</p>
        <div className="flex flex-wrap gap-3">
          {canParse && (
            <button
              onClick={handleParse}
              disabled={actionLoading}
              className="min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Parse
            </button>
          )}
          {canValidate && (
            <button
              onClick={handleValidate}
              disabled={actionLoading}
              className="min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Validate
            </button>
          )}
          {canApprove && (
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Approve
            </button>
          )}
          {batch.invalidRows > 0 && (
            <button
              onClick={handleDownloadErrors}
              className="min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
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
              <p className="text-xs text-emerald-600">Diproses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-900">{approvalResult.committed}</p>
              <p className="text-xs text-emerald-600">Tersimpan</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{approvalResult.failed}</p>
              <p className="text-xs text-destructive">Gagal</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{approvalResult.remaining}</p>
              <p className="text-xs text-amber-600">Tersisa</p>
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
          {preview.errors?.length > 0 && (
            <div role="alert" className="mb-4 rounded-lg border border-warning-border bg-warning-bg p-4">
              <p className="mb-2 text-sm font-semibold text-destructive">
                {preview.errors.length} baris bermasalah — perbaiki sebelum Approve
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-destructive">
                {preview.errors.slice(0, 10).map((item) => (
                  <li key={item.rowNumber} className="break-words">
                    <span className="font-semibold">Baris {item.rowNumber}:</span>{" "}
                    {item.errors.join("; ")}
                  </li>
                ))}
              </ul>
              {preview.errors.length > 10 && (
                <p className="mt-1 text-xs text-destructive">
                  +{preview.errors.length - 10} masalah lainnya (unduh Error CSV untuk detail)
                </p>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">#</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Status</th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground">Ringkasan</th>
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
                    <td className="max-w-xs break-words px-3 py-2 text-xs text-muted-foreground">
                      {summarizeRow(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {preview.rows && preview.rows.length > 10
              ? `Menampilkan 10 dari ${preview.rows.length} baris`
              : "Menampilkan pratinjau awal"}
          </p>
        </div>
      )}
    </div>
  );
}
