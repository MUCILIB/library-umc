import { useState, useEffect } from "react";
import { BookMarked, X, Send, Loader2 } from "lucide-react";
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
  let clean = val.replace(/^ISBN[:\s]*/i, "").replace(/[^0-9Xx]/g, "");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-xl sm:rounded-2xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-primary px-4 sm:px-5 py-3.5 sm:py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-8 sm:size-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <BookMarked className="size-4 sm:size-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white leading-tight">Usulan Buku Baru</h3>
              <p className="text-white/80 text-[11px] sm:text-xs mt-0.5">
                Rekomendasi pengadaan koleksi perpustakaan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto">
          <div className="space-y-3 sm:space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Judul Buku <span className="text-destructive">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="Contoh: Pemrograman Web Modern"
                className="w-full px-3 py-2 bg-muted/50 dark:bg-muted border border-border rounded-lg text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Penulis <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Nama Penulis"
                  className="w-full px-3 py-2 bg-muted/50 dark:bg-muted border border-border rounded-lg text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Penerbit <span className="text-xs text-muted-foreground font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Nama Penerbit"
                  className="w-full px-3 py-2 bg-muted/50 dark:bg-muted border border-border rounded-lg text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                  value={formData.publisher || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground block">
                  ISBN <span className="text-xs text-muted-foreground font-normal">(Opsional)</span>
                </label>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                  Maks. 13 digit
                </span>
              </div>
              <input
                type="text"
                placeholder="Contoh: 978-090-231-122-6"
                maxLength={17}
                className="w-full px-3 py-2 bg-muted/50 dark:bg-muted border border-border rounded-lg text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground font-mono"
                value={formData.isbn || ""}
                onChange={(e) => handleIsbnChange(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Alasan Pengadaan <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                placeholder="Alasan usulan pengadaan buku ini untuk perpustakaan..."
                rows={3}
                className="w-full px-3 py-2 bg-muted/50 dark:bg-muted border border-border rounded-lg text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-foreground"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              disabled={loading}
              type="submit"
              className="flex-1 py-2 bg-primary text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              <span>{loading ? "Mengirim..." : "Kirim Usulan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
