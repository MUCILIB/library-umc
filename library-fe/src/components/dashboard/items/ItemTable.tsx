import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Package,
  Pencil,
  QrCode,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Item } from "@/api/client";
import { TablePagination } from "@/components/common/TablePagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ITEM_STATUS_OPTIONS,
  getItemStatusBadgeClass,
  getItemStatusLabel,
} from "@/utils/itemStatus";

export interface ItemTableProps {
  items: Item[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
  onOpenDetail: (id: string) => void;
  onOpenQrModal: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onStatusChange?: (item: Item, status: string) => void;
  canEdit: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function ItemTable({
  items,
  sortBy,
  sortOrder,
  onToggleSort,
  onOpenDetail,
  onOpenQrModal,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit,
  canDelete,
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
}: ItemTableProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Belum ada item"
        description="Item akan muncul di sini setelah ditambahkan ke bibliografi"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th
                onClick={onToggleSort}
                className="px-4 py-3 text-left font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none"
                title="Klik untuk mengubah urutan kode item"
              >
                <div className="flex items-center gap-1.5">
                  <span>Kode Item</span>
                  {sortBy === "itemCode" ? (
                    sortOrder === "asc" ? (
                      <ArrowUp className="size-3.5 text-primary" />
                    ) : (
                      <ArrowDown className="size-3.5 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3.5 opacity-40" />
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Bibliografi
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                Lokasi
              </th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
                QR
              </th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border hover:bg-surface-hover/50"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {item.itemCode}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.bibliography?.title || "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {item.location
                    ? `${item.location.room}, ${item.location.rack}`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  {onStatusChange && canEdit("items") ? (
                    <Select
                      value={item.status}
                      onValueChange={(val) => onStatusChange(item, val)}
                    >
                      <SelectTrigger
                        aria-label={`Ubah status ${item.itemCode}`}
                        className={`mx-auto h-7 w-[155px] rounded-full border px-2.5 text-xs font-semibold ${getItemStatusBadgeClass(item.status)}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getItemStatusBadgeClass(item.status)}`}
                    >
                      {getItemStatusLabel(item.status)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.qrToken ? (
                    <button
                      type="button"
                      onClick={() => onOpenQrModal(item)}
                      className="rounded-lg p-1 hover:bg-muted text-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Lihat QR Code"
                    >
                      <QrCode className="mx-auto size-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(item.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-muted-foreground cursor-pointer"
                      title="Lihat detail"
                    >
                      <Eye className="size-4" />
                    </button>
                    {canEdit("items") && (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-50 dark:bg-blue-950 hover:text-blue-600 dark:text-blue-400 cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                    )}
                    {canDelete("items") && (
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-warning-bg hover:text-destructive cursor-pointer"
                        title="Arsipkan"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={limit}
        onPageChange={onPageChange}
        label="eksemplar"
      />
    </div>
  );
}

export default ItemTable;
