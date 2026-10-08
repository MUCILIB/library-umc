import { useState } from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onRefresh doesn't do much since there's no backend endpoint to get list yet, but we'll include it for consistency
  onRefresh?: () => void;
}

export default function AddMemberModal({ isOpen, onClose }: AddMemberModalProps) {
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
    setLoading(true);

    try {
      if (!formData.name || !formData.email) {
        alert("Nama dan Email harus diisi!");
        setLoading(false);
        return;
      }

      // TODO: Connect this to actual Add Member endpoint when available in Backend
      await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay
      alert("Demo: Berhasil menambah anggota baru!");
      
      onClose();
      setFormData({ name: "", nim: "", prodi: "", accountType: "Mahasiswa", phone: "", email: "" });
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-4 py-3 bg-card border border-border rounded-[14px] focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all font-semibold text-slate-800 placeholder:text-muted-foreground text-sm";
  const labelClass = "block text-[12px] font-extrabold text-foreground mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-[700px] rounded-[24px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-card px-6 py-5 flex items-center justify-between">
          <h2 className="text-white text-[16px] font-bold tracking-wide">Tambah Anggota Baru</h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
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
              />
            </div>
            <div>
              <label className={labelClass}>Prodi / Fakultas</label>
              <input 
                type="text" 
                value={formData.prodi} 
                onChange={(e) => setFormData({ ...formData, prodi: e.target.value })} 
                className={inputClass} 
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
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 mt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 border border-border text-muted-foreground rounded-xl text-sm font-bold hover:bg-surface-hover transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-red-500/20 transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Anggota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
