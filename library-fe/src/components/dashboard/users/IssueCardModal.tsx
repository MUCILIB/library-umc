import { useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import {
  type DashboardUser,
  usersManagementService,
} from "@/services/dashboard/usersManagementService";
import { useToast } from "@/hooks/useToast";
import { CreditCard, IdCard, Loader2 } from "lucide-react";
import {
  CardExpiryFields,
  type CardExpiryPreset,
  calculatePresetExpiryDate,
  getPresetDurationDays,
} from "./CardExpiryFields";

interface IssueCardModalProps {
  user: DashboardUser | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function IssueCardModal({
  user,
  isOpen,
  onClose,
  onSuccess,
}: IssueCardModalProps) {
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [preset, setPreset] = useState<CardExpiryPreset>("1y");
  const [customDate, setCustomDate] = useState(() =>
    calculatePresetExpiryDate("1y")
  );

  useEffect(() => {
    if (isOpen && user) {
      setPreset("1y");
      setCustomDate(calculatePresetExpiryDate("1y"));
    }
  }, [isOpen, user]);

  const handlePresetChange = (type: CardExpiryPreset) => {
    setPreset(type);
    if (type !== "custom") {
      setCustomDate(calculatePresetExpiryDate(type));
    }
  };

  const todayIso = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!customDate) {
      error("Validasi Gagal", "Tanggal masa aktif kartu wajib dipilih.");
      return;
    }

    if (customDate < todayIso) {
      error(
        "Validasi Gagal",
        "Masa berlaku kartu baru tidak boleh menggunakan tanggal yang sudah lewat."
      );
      return;
    }

    try {
      setSubmitting(true);
      await usersManagementService.issueMemberCard(user.id, undefined, {
        cardExpiresAt: customDate,
        durationDays: getPresetDurationDays(preset),
      });

      const formatted = new Date(customDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      success(
        "Kartu Diterbitkan",
        `Kartu member untuk ${user.name} berhasil diterbitkan dengan masa aktif hingga ${formatted}.`
      );
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menerbitkan kartu member";
      error("Issue Kartu Gagal", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terbitkan Kartu Anggota"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <IdCard className="size-4 text-primary" />
              <span>{user.name || user.email}</span>
            </div>
            <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
              {user.cardNumber || "Kartu Baru"}
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
                Fakultas:
              </span>
              <span className="font-medium text-foreground">
                {user.faculty || "-"}
              </span>
            </div>
          </div>
        </div>

        <CardExpiryFields
          preset={preset}
          customDate={customDate}
          minDate={todayIso}
          disabled={submitting}
          onPresetChange={handlePresetChange}
          onCustomDateChange={setCustomDate}
          helperText="Pilih lama masa aktif kartu (6 bulan, 1–4 tahun, atau tanggal kustom) sebelum menerbitkan kartu."
        />

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
                <span>Menerbitkan...</span>
              </>
            ) : (
              <>
                <CreditCard size={14} />
                <span>Terbitkan Kartu</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default IssueCardModal;
