import { useState, useEffect } from "react";
import { X, Mail, Info, User, GraduationCap, Building2, FileText, Phone } from "lucide-react";
import { API_BASE_URL } from "@/utils/api-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

interface FacultyItem {
  id: number;
  name: string;
}

interface StudyProgramItem {
  id: number;
  name: string;
  facultyId: number;
}

export default function AddGuestModal({ isOpen, onClose, onRefresh }: AddGuestModalProps) {
  const [activeTab, setActiveTab] = useState<"member" | "manual">("manual");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Tab 1: Member Email Auto-fetch
  const [email, setEmail] = useState("");

  // Tab 2: Manual Check-in (Nama, Prodi, Fakultas, Keperluan)
  const [fullName, setFullName] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
  const [selectedStudyProgramId, setSelectedStudyProgramId] = useState<string>("");
  const [institution, setInstitution] = useState("Universitas Muhammadiyah Cirebon");
  const [purpose, setPurpose] = useState("Membaca Buku & Belajar");
  const [phone, setPhone] = useState("");

  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgramItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API_BASE_URL}/api/faculties`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setFaculties(res.data);
          }
        })
        .catch(console.error);

      fetch(`${API_BASE_URL}/api/study-programs`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setStudyPrograms(res.data);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const filteredStudyPrograms = selectedFacultyId
    ? studyPrograms.filter((p) => String(p.facultyId) === selectedFacultyId)
    : studyPrograms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (activeTab === "member") {
        const trimmedEmail = email.trim();
        if (!trimmedEmail || !trimmedEmail.includes("@")) {
          setErrorMsg("Masukkan alamat email yang valid.");
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/guests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: trimmedEmail }),
        });
        const data = await res.json();
        if (data.success) {
          onRefresh();
          handleClose();
        } else {
          setErrorMsg(data.message || "Gagal mencatat pengunjung.");
        }
      } else {
        // Manual Input (Nama, Prodi, Keperluan)
        if (!fullName.trim()) {
          setErrorMsg("Nama lengkap wajib diisi.");
          setLoading(false);
          return;
        }

        const payload = {
          fullName: fullName.trim(),
          institution: institution.trim() || "Universitas Muhammadiyah Cirebon",
          purpose: purpose.trim() || "Membaca Buku & Belajar",
          phone: phone.trim() || "081234567890",
          facultyId: selectedFacultyId ? Number(selectedFacultyId) : undefined,
          studyProgramId: selectedStudyProgramId ? Number(selectedStudyProgramId) : undefined,
        };

        const res = await fetch(`${API_BASE_URL}/api/guests/non-member`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          onRefresh();
          handleClose();
        } else {
          setErrorMsg(data.message || "Gagal mencatat kunjungan perpustakaan.");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMsg("Terjadi kesalahan sistem. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setFullName("");
    setSelectedFacultyId("");
    setSelectedStudyProgramId("");
    setErrorMsg("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-card w-full max-w-[520px] rounded-[24px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-border">
        {/* Modal Header */}
        <div className="bg-muted/40 px-6 py-5 flex items-center justify-between border-b border-border">
          <div>
            <h2 className="text-foreground text-[16px] font-bold tracking-wide">
              Catat Pengunjung Perpustakaan
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Input kunjungan fisik langsung ke perpustakaan
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border bg-muted/20 p-2 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab("manual"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "manual"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Input Form (Nama & Prodi)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("member"); setErrorMsg(""); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "member"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Email Kampus / Member
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeTab === "member" ? (
            <div>
              <div className="mb-4 flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3">
                <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[12px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                  Masukkan email yang terdaftar di sistem kampus. Data nama, prodi, dan fakultas akan disinkronkan otomatis.
                </p>
              </div>

              <label className="block text-[12px] font-bold text-foreground mb-2">
                Email Pengunjung <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                  placeholder="contoh: mahasiswa@umc.ac.id"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground placeholder:text-muted-foreground text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-bold text-foreground mb-1.5">
                  Nama Lengkap <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setErrorMsg(""); }}
                    placeholder="Nama lengkap pengunjung"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-foreground mb-1.5">
                    Fakultas
                  </label>
                  <Select
                    value={selectedFacultyId || "none"}
                    onValueChange={(val) => {
                      setSelectedFacultyId(val === "none" ? "" : val);
                      setSelectedStudyProgramId("");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <Building2 size={15} className="text-muted-foreground shrink-0" />
                        <SelectValue placeholder="-- Pilih Fakultas --" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Pilih Fakultas --</SelectItem>
                      {faculties.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-foreground mb-1.5">
                    Program Studi
                  </label>
                  <Select
                    value={selectedStudyProgramId || "none"}
                    onValueChange={(val) => setSelectedStudyProgramId(val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={15} className="text-muted-foreground shrink-0" />
                        <SelectValue placeholder="-- Pilih Prodi --" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Pilih Prodi --</SelectItem>
                      {filteredStudyPrograms.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-foreground mb-1.5">
                    Institusi / Universitas
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="UMC / Instansi lain"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-foreground mb-1.5">
                    Nomor Kontak / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-foreground mb-1.5">
                  Keperluan Kunjungan
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                  <textarea
                    rows={2}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Membaca buku, mengerjakan tugas, referensi skripsi..."
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
              <p className="text-[12px] text-destructive font-semibold">{errorMsg}</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 border border-border text-muted-foreground rounded-xl text-xs font-bold hover:bg-muted/50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Kunjungan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
