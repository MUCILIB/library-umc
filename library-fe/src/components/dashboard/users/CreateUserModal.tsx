import { Loader2, UserPlus } from "lucide-react";
import Modal from "@/components/ui/modal";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Role } from "@/api/client";

export interface CreateUserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  nimNidn?: string;
  faculty?: string;
  phone?: string;
}

export interface CreateUserModalProps {
  isOpen: boolean;
  loading: boolean;
  availableRoles: Role[];
  form: CreateUserFormData;
  onFormChange: (form: CreateUserFormData) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateUserModal({
  isOpen,
  loading,
  availableRoles,
  form,
  onFormChange,
  onClose,
  onSubmit,
}: CreateUserModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!loading) onClose();
      }}
      title="Tambah Pengguna Baru"
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold text-foreground">
              Nama Lengkap <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Muhammad Rizqi Fauzan"
              value={form.name}
              onChange={(e) =>
                onFormChange({ ...form, name: e.target.value })
              }
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Email Kampus <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="user@umc.ac.id"
              value={form.email}
              onChange={(e) =>
                onFormChange({ ...form, email: e.target.value })
              }
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Password <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              type="password"
              placeholder="Default: Password123!"
              value={form.password || ""}
              onChange={(e) =>
                onFormChange({ ...form, password: e.target.value })
              }
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Role Pengguna <span className="text-destructive">*</span>
            </label>
            <Select
              value={form.role}
              onValueChange={(val) =>
                onFormChange({ ...form, role: val })
              }
            >
              <SelectTrigger className="w-full h-9 text-xs font-semibold bg-muted/40 border-border cursor-pointer">
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.length > 0 ? (
                  availableRoles.map((r) => (
                    <SelectItem
                      key={r.id}
                      value={r.id}
                      className="text-xs cursor-pointer"
                    >
                      {r.name}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="student" className="text-xs cursor-pointer">Mahasiswa</SelectItem>
                    <SelectItem value="lecturer" className="text-xs cursor-pointer">Dosen</SelectItem>
                    <SelectItem value="staff" className="text-xs cursor-pointer">Staff</SelectItem>
                    <SelectItem value="external" className="text-xs cursor-pointer">Anggota Luar</SelectItem>
                    <SelectItem value="super_admin" className="text-xs cursor-pointer">Super Admin</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              NIM / NIDN <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              placeholder="202101001 / 0412345678"
              value={form.nimNidn || ""}
              onChange={(e) =>
                onFormChange({ ...form, nimNidn: e.target.value })
              }
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Fakultas / Unit <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Fakultas Teknik / Perpustakaan"
              value={form.faculty || ""}
              onChange={(e) =>
                onFormChange({ ...form, faculty: e.target.value })
              }
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">
              Nomor Telepon / WhatsApp <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              type="tel"
              placeholder="08123456789"
              value={form.phone || ""}
              onChange={(e) =>
                onFormChange({ ...form, phone: e.target.value })
              }
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserPlus size={14} />
            )}
            <span>Simpan Pengguna</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default CreateUserModal;
