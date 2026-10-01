import { useState, useEffect } from "react";
import { Link } from "react-router";
import { bibliographyApi, type Bibliography } from "@/api/client";
import { generateColorFromSeed } from "@/utils/format";
import { Bookmark, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function SavedBooksTab() {
  const [savedBooks, setSavedBooks] = useState<Bibliography[]>([]);
  const [loading, setLoading] = useState(true);
  const { info } = useToast();

  useEffect(() => {
    async function loadSavedBooks() {
      try {
        setLoading(true);
        const savedIds: string[] = JSON.parse(
          localStorage.getItem("umc_library_bookmarks") || "[]"
        );
        
        if (savedIds.length === 0) {
          setSavedBooks([]);
          return;
        }

        // Fetch details for all saved book IDs in parallel
        const bookPromises = savedIds.map(async (id) => {
          try {
            const res = await bibliographyApi.getById(id);
            return res.data;
          } catch (err) {
            console.error(`Failed to fetch book ${id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(bookPromises);
        const validBooks = results.filter((b): b is Bibliography => b !== null);
        setSavedBooks(validBooks);
      } catch (err) {
        console.error("Error loading saved books:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSavedBooks();
  }, []);

  const handleRemove = (bookId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const savedIds: string[] = JSON.parse(
      localStorage.getItem("umc_library_bookmarks") || "[]"
    );
    const updated = savedIds.filter((id) => id !== bookId);
    localStorage.setItem("umc_library_bookmarks", JSON.stringify(updated));
    
    setSavedBooks((prev) => prev.filter((b) => b.id !== bookId));
    info("Buku Dihapus", "Buku telah dihapus dari daftar simpanan.");
    
    // Dispatch an event so other components know (like active count in tabs)
    window.dispatchEvent(new Event("storage"));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin text-primary size-8 mb-3" />
        <p className="text-sm">Memuat daftar buku disimpan...</p>
      </div>
    );
  }

  if (savedBooks.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[28px] text-center py-16 text-muted-foreground shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-4">
          <Bookmark size={28} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">
          Belum Ada Buku Disimpan
        </h3>
        <p className="text-sm max-w-sm mx-auto mb-6 px-4">
          Cari buku favorit Anda di katalog dan simpan untuk dibaca atau dipinjam nanti.
        </p>
        <Link
          to="/katalog"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
        >
          Telusuri Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-primary flex items-center justify-center shrink-0">
          <Bookmark size={22} fill="currentColor" />
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
            Buku yang Anda Simpan
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Daftar koleksi buku fisik dan e-book yang Anda bookmark secara lokal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savedBooks.map((book) => {
          const isEbook = book.type === "ebook";
          const seedColor = generateColorFromSeed(book.id);
          const authorNames = book.authors && book.authors.length > 0
            ? book.authors.map((a) => a.name).join(", ")
            : "";

          return (
            <Link
              key={book.id}
              to={`/katalog/${book.id}`}
              className="bg-card hover:bg-muted/30 border border-border/50 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex gap-4 items-center group relative cursor-pointer"
            >
              {/* Cover Image */}
              <div className="shrink-0 w-16 h-24 rounded-xl overflow-hidden shadow-xs bg-muted border border-border/30 relative">
                {book.image ? (
                  <img
                    src={book.image}
                    alt={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${seedColor} flex flex-col justify-between p-2 text-white`}>
                    <span className="text-[7px] font-bold uppercase tracking-wider text-white/50">
                      {isEbook ? "E-Book" : "Fisik"}
                    </span>
                    <span className="font-bold text-[9px] leading-tight italic line-clamp-3 text-center my-auto">
                      {book.title}
                    </span>
                    <span className="text-[7px] text-white/40 line-clamp-1 text-right">
                      {authorNames || book.sor || book.publisher?.name || ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-1 pr-6">
                  {book.title}
                </h4>
                <p className="text-xs text-muted-foreground font-medium mb-3 truncate">
                  {authorNames || book.sor || "Penulis Tidak Diketahui"}
                </p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] bg-slate-50 text-slate-400 dark:bg-muted dark:text-slate-300 border border-border rounded-full font-bold">
                    {isEbook ? "E-Book" : "Buku Fisik"}
                  </span>
                  {!isEbook && (
                    <span className={`px-2 py-0.5 text-[9px] border rounded-full font-bold ${
                      book.stock > 0 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {book.stock > 0 ? "Tersedia" : "Stok Kosong"}
                    </span>
                  )}
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => handleRemove(book.id, e)}
                title="Hapus dari Simpanan"
                className="absolute top-4 right-4 p-1.5 rounded-lg border border-border/40 hover:border-red-200 hover:bg-red-50 text-muted-foreground hover:text-primary transition-all duration-200"
              >
                <Trash2 size={14} />
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
