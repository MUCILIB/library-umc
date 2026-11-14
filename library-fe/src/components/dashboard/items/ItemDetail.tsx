import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Loader2,
  Pencil,
  QrCode,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { itemApi, type Item } from "@/api/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";

export interface ItemDetailProps {
  item: Item;
  loading: boolean;
  onBack: () => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onRefresh: () => Promise<void>;
}

export function ItemDetail({
  item,
  loading,
  onBack,
  onEdit,
  onDelete,
  onRefresh,
}: ItemDetailProps) {
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canEdit, canDelete } = useRolePermissions();

  const handleRegenerateQr = async () => {
    if (!confirm("Regenerate QR? QR lama akan invalid.")) return;
    setQrLoading(true);
    try {
      await itemApi.regenerateQr(item.id);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal regenerate QR");
    } finally {
      setQrLoading(false);
    }
  };

  const handleRevokeQr = async () => {
    if (!confirm("Revoke QR? Scan tidak akan bisa resolve item ini.")) return;
    setQrLoading(true);
    try {
      await itemApi.revokeQr(item.id);
      await onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal revoke QR");
    } finally {
      setQrLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

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
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-muted-foreground cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar
        </button>
        <div className="flex gap-2">
          {canEdit("items") && (
            <button
              onClick={() => onEdit(item)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
            >
              <Pencil className="size-4" />
              Edit
            </button>
          )}
          {canDelete("items") && (
            <button
              onClick={() => onDelete(item)}
              className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 cursor-pointer"
            >
              <Trash2 className="size-4" />
              Arsipkan
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-bold text-foreground">{item.itemCode}</h2>
        {item.bibliography && (
          <p className="mt-1 text-sm text-muted-foreground">{item.bibliography.title}</p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">No. Inventaris</dt>
            <dd className="mt-0.5 text-sm text-foreground">{item.inventoryCode || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Call Number</dt>
            <dd className="mt-0.5 text-sm text-foreground">{item.callNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Status</dt>
            <dd className="mt-0.5">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.status === "available"
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                    : item.status === "loaned"
                      ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {item.status}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Lokasi</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {item.location
                ? `${item.location.room}, ${item.location.rack}, ${item.location.shelf}`
                : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Sumber</dt>
            <dd className="mt-0.5 text-sm text-foreground">{item.source || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Harga</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {item.price ? `${item.priceCurrency || "IDR"} ${item.price}` : "-"}
            </dd>
          </div>
        </div>
      </div>

      {/* QR Section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <QrCode className="size-4" />
          QR Code
        </h3>
        {item.qrToken ? (
          <div className="flex items-start gap-6">
            <div className="rounded-lg border border-border p-4">
              <img
                src={itemApi.getQrSvg(item.id)}
                alt="QR Code"
                className="size-32"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Versi: {item.qrVersion || 1}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerateQr}
                  disabled={qrLoading}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="size-4" />
                  Regenerate
                </button>
                <button
                  onClick={handleRevokeQr}
                  disabled={qrLoading}
                  className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50 cursor-pointer"
                >
                  <Ban className="size-4" />
                  Revoke
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">QR code belum dibuat</p>
        )}
      </div>
    </div>
  );
}

export default ItemDetail;
