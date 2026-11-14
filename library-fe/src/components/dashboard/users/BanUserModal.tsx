import { Loader2, ShieldCheck, UserX } from "lucide-react";
import Modal from "@/components/ui/modal";
import type { DashboardUser } from "@/services/dashboard/usersManagementService";

export const BAN_PRESET_REASONS = [
  "Pelanggaran kebijakan sistem",
  "Keterlambatan pengembalian buku berulang",
  "Penyalahgunaan kartu anggota perpustakaan",
  "Akun tidak aktif / verifikasi identitas",
];

export interface BanUserModalProps {
  user: DashboardUser | null;
  isOpen: boolean;
  isSaving: boolean;
  banReason: string;
  onBanReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function BanUserModal({
  user,
  isOpen,
  isSaving,
  banReason,
  onBanReasonChange,
  onClose,
  onConfirm,
}: BanUserModalProps) {
  if (!user && !isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user?.banned ? "Buka Blokir Pengguna (Unban)" : "Blokir Pengguna (Ban)"}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              user?.banned
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                : "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400"
            }`}
          >
            {user?.banned ? (
              <ShieldCheck className="size-5" />
            ) : (
              <UserX className="size-5" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              {user?.banned
                ? `Buka blokir akun ${user?.name || "pengguna"}?`
                : `Blokir akun ${user?.name || "pengguna"}?`}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {user?.banned
                ? "Pengguna akan dapat masuk kembali ke sistem dan mengakses seluruh layanan perpustakaan."
                : "Pengguna yang diblokir tidak akan dapat login atau melakukan transaksi perpustakaan sampai statusnya diaktifkan kembali."}
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status Saat Ini:</span>
              <span
                className={`font-bold ${
                  user.banned
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {user.banned ? "Diblokir (Banned)" : "Aktif"}
              </span>
            </div>
          </div>
        )}

        {!user?.banned && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-muted-foreground uppercase">
              Alasan Pemblokiran (Opsional)
            </label>
            <textarea
              rows={2}
              value={banReason}
              onChange={(e) => onBanReasonChange(e.target.value)}
              placeholder="Tulis alasan pemblokiran pengguna..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {BAN_PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onBanReasonChange(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    banReason === preset
                      ? "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 font-bold"
                      : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 rounded-lg border border-border px-4 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold text-white transition-colors cursor-pointer ${
              user?.banned
                ? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                : "bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : user?.banned ? (
              <>
                <ShieldCheck className="size-4" />
                <span>Aktifkan Pengguna</span>
              </>
            ) : (
              <>
                <UserX className="size-4" />
                <span>Blokir Pengguna</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default BanUserModal;
