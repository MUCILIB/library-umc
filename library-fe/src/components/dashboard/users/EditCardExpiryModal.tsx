import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import {
  type DashboardUser,
  usersManagementService,
} from "@/services/dashboard/usersManagementService";
import { useToast } from "@/hooks/useToast";
import { IdCard, Loader2, CheckCircle } from "lucide-react";
import {
  CardExpiryFields,
  type CardExpiryPreset,
  calculatePresetExpiryDate,
} from "./CardExpiryFields";

interface EditCardExpiryModalProps {
  user: DashboardUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCardExpiryModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: EditCardExpiryModalProps) {
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [preset, setPreset] = useState<CardExpiryPreset>("1y");
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    if (user?.cardExpiresAt) {
      const expDate = new Date(user.cardExpiresAt).toISOString().split("T")[0];
      setCustomDate(expDate);
      setPreset("custom");
    } else {
      setCustomDate(calculatePresetExpiryDate("6m"));
      setPreset("6m");
    }
  }, [user]);

  const handlePresetChange = (type: CardExpiryPreset) => {
    setPreset(type);
    if (type !== "custom") {
      setCustomDate(calculatePresetExpiryDate(type));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const targetMemberId = user.memberId || user.id;
    if (!targetMemberId) {
      error("Gagal", "ID Member tidak ditemukan.");
      return;
    }

    if (!customDate) {
      error("Validasi Gagal", "Tanggal masa aktif kartu wajib ditentukan.");
      return;
    }

    try {
      setSubmitting(true);
      await usersManagementService.updateCardExpiry(targetMemberId, {
        cardExpiresAt: customDate,
      });

      const formatted = new Date(customDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      success(
        "Masa Aktif Diperbarui",
        `Masa berlaku kartu untuk ${user.name} berhasil diubah hingga ${formatted}.`
      );
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal memperbarui masa aktif kartu";
      error("Gagal", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  const currentFormattedExpiry = user.cardExpiresAt
    ? new Date(user.cardExpiresAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Belum ditetapkan / Kadaluwarsa";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ubah Masa Aktif Kartu Anggota"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {/* User Card Info Box */}
        <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <IdCard className="size-4 text-primary" />
              <span>{user.name}</span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
              {user.cardNumber || "Belum ada no kartu"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase font-bold">
                NIM / NIDN:
              </span>
              <span className="font-medium text-foreground">
                {user.nimNidn || "-"}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase font-bold">
                Masa Aktif Saat Ini:
              </span>
              <span className="font-medium text-foreground">
                {currentFormattedExpiry}
              </span>
            </div>
          </div>
        </div>

        <CardExpiryFields
          preset={preset}
          customDate={customDate}
          disabled={submitting}
          onPresetChange={handlePresetChange}
          onCustomDateChange={setCustomDate}
          helperText="Admin dapat mengubah masa berlaku kartu anggota kapan saja ke tanggal mana pun (misalnya 6 bulan, 1–4 tahun ke depan, atau tanggal kustom)."
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-10 px-4 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting || !customDate}
            className="h-10 px-5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                <span>Simpan Masa Aktif</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default EditCardExpiryModal;
