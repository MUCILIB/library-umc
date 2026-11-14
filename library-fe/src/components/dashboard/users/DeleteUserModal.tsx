import { Loader2, Trash2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import type { DashboardUser } from "@/services/dashboard/usersManagementService";

export interface DeleteUserModalProps {
  user: DashboardUser | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteUserModal({
  user,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title="Konfirmasi Hapus Pengguna"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900 mt-0.5">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Apakah Anda yakin ingin menghapus akun ini?
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Akun pengguna akan dinonaktifkan dan seluruh sesi login aktif akan dicabut dari sistem.
            </p>
          </div>
        </div>

        {user && (
          <div className="rounded-xl bg-muted/60 border border-border p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nama:</span>
              <span className="font-bold text-foreground">
                {user.name || "Tanpa Nama"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-mono text-foreground">
                {user.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role:</span>
              <span className="font-bold uppercase text-foreground">
                {user.role}
              </span>
            </div>
            {user.cardNumber ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">No. Kartu:</span>
                <span className="font-mono text-foreground">
                  {user.cardNumber}
                </span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                <span>Hapus Pengguna</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteUserModal;
