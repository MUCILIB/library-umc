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

/**
 * Format string ISBN menjadi format ISBN-13 bertanda hubung
 * Persis seperti pada form input Bibliografi (BibliographySection).
 */
const formatIsbn = (val: string): string => {
  // Hanya ambil digit angka dan karakter x/X
  let clean = val.replace(/^ISBN[:\s]*/i, "").replace(/[^0-9Xx]/g, "");

  // Batas maksimal 13 karakter digit untuk ISBN-13
  clean = clean.substring(0, 13);

  if (clean.length <= 3) {
    return clean;
  } else if (clean.length <= 6) {
    return `${clean.substring(0, 3)}-${clean.substring(3)}`;
  } else if (clean.length <= 9) {
    return `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6)}`;
  } else if (clean.length <= 12) {
    return `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6, 9)}-${clean.substring(9)}`;
  } else {
    return `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6, 9)}-${clean.substring(9, 12)}-${clean.substring(12)}`;
  }
};

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
        isbn: initialData?.isbn ? formatIsbn(initialData.isbn) : "",
        title: initialData?.title || "",
        author: initialData?.author || "",
        publisher: initialData?.publisher || "",
        reason: "",
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleIsbnChange = (val: string) => {
    setFormData((prev) => ({ ...prev, isbn: formatIsbn(val) }));
  };

  const cleanIsbnDigits = (formData.isbn || "").replace(/[^0-9Xx]/g, "");

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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  ISBN <span className="text-[10px] font-normal text-muted-foreground">(Opsional)</span>
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Maks. 13 digit ({cleanIsbnDigits.length}/13)
                </span>
              </div>
              <input
                type="text"
                placeholder="Contoh: 978-090-231-122-6"
                maxLength={17}
                className="w-full px-3.5 py-2.5 bg-muted/60 dark:bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground font-mono tracking-wider"
                value={formData.isbn || ""}
                onChange={(e) => handleIsbnChange(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground font-medium mt-1">
                Format otomatis ISBN-10 / ISBN-13 (maksimal 17 karakter termasuk tanda hubung).
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
