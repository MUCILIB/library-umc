import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersManagementService } from "@/services/dashboard/usersManagementService";
import { useToast } from "@/hooks/useToast";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

const ROLE_MAP: Record<string, string> = {
  Mahasiswa: "student",
  Dosen: "lecturer",
  Pegawai: "staff",
  Umum: "external",
};

export default function AddMemberModal({ isOpen, onClose, onRefresh }: AddMemberModalProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    nim: "",
    prodi: "",
    accountType: "Mahasiswa",
    phone: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showError("Validasi Gagal", "Nama dan Email wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const role = ROLE_MAP[formData.accountType] || "student";
      await usersManagementService.createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role,
        nimNidn: formData.nim.trim() || undefined,
        faculty: formData.prodi.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      });

      success("Anggota Ditambahkan", `Anggota ${formData.name} berhasil didaftarkan.`);
      if (onRefresh) onRefresh();
      setFormData({ name: "", nim: "", prodi: "", accountType: "Mahasiswa", phone: "", email: "" });
      onClose();
    } catch (err: unknown) {
      console.error("Error creating member:", err);
      showError(
        "Gagal Menambah Anggota",
        err instanceof Error ? err.message : "Terjadi kesalahan sistem saat mendaftarkan anggota."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full px-4 py-3 bg-card border border-border rounded-[14px] focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 focus:border-slate-300 dark:focus:border-slate-700 transition-all font-semibold text-foreground placeholder:text-muted-foreground text-sm";
  const labelClass = "block text-[12px] font-extrabold text-foreground mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-[700px] rounded-[24px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-border">
        {/* Modal Header */}
        <div className="bg-card px-6 py-5 flex items-center justify-between border-b border-border">
          <h2 className="text-foreground text-[16px] font-bold tracking-wide">Tambah Anggota Baru</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
          <div>
            <label className={labelClass}>Nama Anggota</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              placeholder="Contoh: Budi Santoso"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>NIM / NIDN</label>
              <input
                type="text"
                value={formData.nim}
                onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                className={inputClass}
                placeholder="Contoh: 23010001"
              />
            </div>
            <div>
              <label className={labelClass}>Prodi / Fakultas</label>
              <input
                type="text"
                value={formData.prodi}
                onChange={(e) => setFormData({ ...formData, prodi: e.target.value })}
                className={inputClass}
                placeholder="Contoh: Teknik Informatika"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Tipe Akun</label>
              <Select
                value={formData.accountType}
                onValueChange={(val) => setFormData({ ...formData, accountType: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih Tipe Akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                  <SelectItem value="Dosen">Dosen</SelectItem>
                  <SelectItem value="Pegawai">Pegawai</SelectItem>
                  <SelectItem value="Umum">Umum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={labelClass}>No Telpon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
                placeholder="Contoh: 081234567890"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email Aktif</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
              placeholder="Contoh: budi@umc.ac.id"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-border text-muted-foreground rounded-xl text-sm font-bold hover:bg-muted transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                "Simpan Anggota"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
