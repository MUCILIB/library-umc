import { useState, useEffect } from "react";
import Modal from "@/components/ui/modal";
import { type DashboardUser, usersManagementService } from "@/services/dashboard/usersManagementService";
import { useToast } from "@/hooks/useToast";
import { Calendar, IdCard, Loader2, CheckCircle } from "lucide-react";

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
  const [preset, setPreset] = useState<"6m" | "1y" | "2y" | "4y" | "custom">("1y");
  const [customDate, setCustomDate] = useState("");

  const calculatePresetDate = (type: "6m" | "1y" | "2y" | "4y"): string => {
    const d = new Date();
    if (type === "6m") {
      d.setMonth(d.getMonth() + 6);
    } else if (type === "1y") {
      d.setFullYear(d.getFullYear() + 1);
    } else if (type === "2y") {
      d.setFullYear(d.getFullYear() + 2);
    } else if (type === "4y") {
      d.setFullYear(d.getFullYear() + 4);
    }
    return d.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (user?.cardExpiresAt) {
      const expDate = new Date(user.cardExpiresAt).toISOString().split("T")[0];
      setCustomDate(expDate);
      setPreset("custom");
    } else {
      setCustomDate(calculatePresetDate("6m"));
      setPreset("6m");
    }
  }, [user]);

  const handlePresetChange = (type: "6m" | "1y" | "2y" | "4y" | "custom") => {
    setPreset(type);
    if (type !== "custom") {
      setCustomDate(calculatePresetDate(type));
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

      success("Masa Aktif Diperbarui", `Masa berlaku kartu untuk ${user.name} berhasil diubah hingga ${formatted}.`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui masa aktif kartu";
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
              <span className="block text-[10px] text-muted-foreground uppercase font-bold">NIM / NIDN:</span>
              <span className="font-medium text-foreground">{user.nimNidn || "-"}</span>
            </div>
            <div>
              <span className="block text-[10px] text-muted-foreground uppercase font-bold">Masa Aktif Saat Ini:</span>
              <span className="font-medium text-foreground">{currentFormattedExpiry}</span>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <label className="block text-xs font-bold text-foreground mb-2">
            Pilihan Periode Masa Aktif
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "6m", label: "6 Bulan" },
              { id: "1y", label: "1 Tahun" },
              { id: "2y", label: "2 Tahun" },
              { id: "4y", label: "4 Tahun" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePresetChange(item.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                  preset === item.id
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-foreground">
              Berlaku Sampai Tanggal
            </label>
            <button
              type="button"
              onClick={() => handlePresetChange("custom")}
              className={`text-[11px] font-medium transition-colors cursor-pointer ${
                preset === "custom" ? "text-primary font-bold underline" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pilih Tanggal Kustom
            </button>
          </div>

          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              required
              value={customDate}
              onChange={(e) => {
                setPreset("custom");
                setCustomDate(e.target.value);
              }}
              min={new Date().toISOString().split("T")[0]}
              disabled={submitting}
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Admin dapat menentukan masa berlaku kartu anggota hingga tanggal tertentu (misalnya 1 tahun ke depan atau sampai selesai masa studi).
          </p>
        </div>

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
