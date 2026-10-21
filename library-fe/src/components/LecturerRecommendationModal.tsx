import { useState, useEffect } from "react";
import { BookMarked, X, Send, Loader2, Info } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import recommendationService, {
  type Recommendation,
  type CreateRecommendationPayload,
} from "@/services/recommendationService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    title?: string;
    author?: string;
    publisher?: string;
    isbn?: string;
  };
  onSuccess?: (createdRecommendation: Recommendation) => void;
}

export default function LecturerRecommendationModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState<CreateRecommendationPayload>({
    isbn: "",
    title: "",
    author: "",
    publisher: "",
    reason: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        isbn: initialData?.isbn || "",
        title: initialData?.title || "",
        author: initialData?.author || "",
        publisher: initialData?.publisher || "",
        reason: "",
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim() || !formData.reason.trim()) {
      toast.warning(
        "Data Belum Lengkap",
        "Judul Buku, Penulis, dan Alasan Pengadaan wajib diisi."
      );
      return;
    }

    setLoading(true);
    try {
      const created = await recommendationService.createRecommendation({
        title: formData.title.trim(),
        author: formData.author.trim(),
        publisher: formData.publisher?.trim() || undefined,
        isbn: formData.isbn?.trim() || undefined,
        reason: formData.reason.trim(),
      });

      toast.success("Berhasil", "Usulan koleksi buku berhasil diajukan ke perpustakaan.");
      setFormData({
        isbn: "",
        title: "",
        author: "",
        publisher: "",
        reason: "",
      });
      onSuccess?.(created);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal", err.message || "Gagal mengajukan usulan buku.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-[28px] shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-primary p-5 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <BookMarked size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">Usulan Koleksi Buku</h3>
              <p className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">
                Fitur Khusus Dosen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl flex gap-3 border border-blue-100 dark:border-blue-900/50">
            <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
              Buku yang diusulkan akan direview oleh tim perpustakaan UMC untuk pertimbangan pengadaan koleksi baru.
            </p>
          </div>

          <div className="space-y-3.5 max-h-[60vh] overflow-y-auto px-1">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                Judul Buku <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Contoh: Machine Learning untuk Sains Data"
                className="w-full px-3.5 py-2.5 bg-muted/60 dark:bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Penulis <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Nama Penulis"
                  className="w-full px-3.5 py-2.5 bg-muted/60 dark:bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Penerbit <span className="text-[10px] font-normal text-muted-foreground">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gramedia, Andi"
                  className="w-full px-3.5 py-2.5 bg-muted/60 dark:bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                  value={formData.publisher || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                ISBN <span className="text-[10px] font-normal text-muted-foreground">(Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 978-602-03-2498-2"
                className="w-full px-3.5 py-2.5 bg-muted/60 dark:bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground font-mono"
                value={formData.isbn || ""}
                onChange={(e) =>
                  setFormData({ ...formData, isbn: e.target.value })
                }
              />
              <p className="text-[11px] text-muted-foreground font-medium mt-1">
                ISBN membantu pustakawan menemukan edisi cetak yang spesifik dan tepat.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                Alasan Pengadaan <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                placeholder="Contoh: Digunakan sebagai referensi mata kuliah Struktur Data semester genap."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-muted/60 dark:bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-foreground"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>{loading ? "Mengirim..." : "Kirim Usulan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
