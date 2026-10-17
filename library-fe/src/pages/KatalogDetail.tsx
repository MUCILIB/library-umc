import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import ReservationList from "@/components/ReservationList";
import { authClient } from "@/utils/auth-client";
import { useKatalogDetail } from "@/hooks/useKatalogDetail";
import { useKatalogActions } from "@/hooks/useKatalogActions";
import type { Bibliography, LibraryUser } from "@/types";
import { useToast } from "@/hooks/useToast";
import {
  Share2,
  Bookmark,
  QrCode,
  Calendar,
  ChevronRight,
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  Heart,
  X,
} from "lucide-react";
import { generateColorFromSeed, cleanIsbn } from "@/utils/format";
import { isBookSaved, saveBook, removeBook } from "@/utils/bookmarks";

const KatalogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedItemForQr, setSelectedItemForQr] = useState<{ id: string; itemCode?: string; status: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [similarSavedMap, setSimilarSavedMap] = useState<Record<string, boolean>>({});

  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const currentUser: LibraryUser | null = session?.user
    ? {
        id: session.user.id,
        memberId:
          (session.user as { memberId?: string }).memberId ?? session.user.id,
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role:
          (session.user as any).role === "super_admin" || (session.user as any).role === "staff"
            ? "admin"
            : "mahasiswa",
        nim: (session.user as { nim?: string }).nim,
      }
    : null;

  const {
    bibliography,
    userLoans,
    pendingRequests,
    userReservation,
    loading,
    error,
    similarBooks,
    similarLoading,
    setUserReservation,
    setPendingRequests,
  } = useKatalogDetail(id, currentUser, sessionLoading);

  const {
    showReservationList,
    setShowReservationList,
    borrowLoading,
    showLoanForm,
    setShowLoanForm,
    loanFormData,
    setLoanFormData,
    getBookStatus,
    isUserBorrowing,
    isUserPending,
    isUserReserved,
    handleInputChange,
    handleBorrow,
    handleSubmitLoan,
    handleCheckLoans,
  } = useKatalogActions({
    bibliography,
    currentUser,
    userLoans,
    pendingRequests,
    userReservation,
    setUserReservation,
    setPendingRequests,
  });

  const bookStatus = getBookStatus();
  const isBorrowing = isUserBorrowing();
  const isPending = isUserPending();

  // Track bookmark state sync if bibliography ID or user context changes
  useEffect(() => {
    if (!bibliography?.id) {
      setIsSaved(false);
      return;
    }
    const checkSaved = () => {
      setIsSaved(isBookSaved(bibliography.id, currentUser?.id));
    };
    checkSaved();
    window.addEventListener("storage", checkSaved);
    return () => {
      window.removeEventListener("storage", checkSaved);
    };
  }, [bibliography?.id, currentUser?.id]);

  const handleShare = async () => {
    if (!bibliography) return;
    const shareData = {
      title: bibliography.title,
      text: `Yuk baca buku "${bibliography.title}" karya ${bibliography.author || "Penulis UMC"} di Perpustakaan UMC!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toastSuccess("Tautan Disalin", "Link halaman detail buku berhasil disalin ke clipboard.");
      } catch (err) {
        toastError("Gagal Menyalin", "Gagal menyalin tautan ke clipboard.");
      }
    }
  };

  const handleToggleSave = () => {
    if (!bibliography?.id) return;

    if (!currentUser?.id) {
      toastInfo("Perlu Masuk", "Silakan login terlebih dahulu untuk menyimpan buku ke akun Anda.");
      return;
    }

    if (isSaved) {
      removeBook(bibliography.id, currentUser.id);
      setIsSaved(false);
      toastInfo("Buku Dihapus", "Buku telah dihapus dari daftar simpanan.");
    } else {
      saveBook(bibliography.id, currentUser.id);
      setIsSaved(true);
      toastSuccess("Buku Disimpan", "Buku berhasil disimpan ke daftar simpanan.");
    }
  };

  // Sinkronisasi status bookmark untuk buku serupa
  useEffect(() => {
    const checkBookmarks = () => {
      const map: Record<string, boolean> = {};
      similarBooks.forEach((b) => {
        if (b.id) {
          map[b.id] = isBookSaved(b.id, currentUser?.id);
        }
      });
      setSimilarSavedMap(map);
    };

    checkBookmarks();
    window.addEventListener("storage", checkBookmarks);
    return () => window.removeEventListener("storage", checkBookmarks);
  }, [similarBooks, currentUser?.id]);

  const handleToggleSimilarBookmark = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!currentUser?.id) {
      toastInfo("Perlu Masuk", "Silakan login terlebih dahulu untuk menyimpan buku.");
      return;
    }

    const isBookSavedStatus = similarSavedMap[bookId];
    if (isBookSavedStatus) {
      removeBook(bookId, currentUser.id);
      toastInfo("Buku Dihapus", "Buku telah dihapus dari daftar simpanan.");
    } else {
      saveBook(bookId, currentUser.id);
      toastSuccess("Buku Disimpan", "Buku berhasil disimpan ke daftar simpanan.");
    }
  };

  const getSimilarBookStatus = (book: Bibliography): "available" | "borrowed" => {
    if (book.type === "ebook") return "available";

    if (book.items && book.items.length > 0) {
      const availableItems = book.items.filter((i) => i.status === "available");
      if (availableItems.length > 0) return "available";

      const loanedItems = book.items.filter((i) => i.status === "loaned");
      if (loanedItems.length > 0) return "borrowed";

      return "borrowed";
    }

    if (typeof book.stock === "number") {
      return book.stock > 0 ? "available" : "borrowed";
    }

    return "available";
  };

  // Override handleCheckLoans for admin
  const onCheckStatusClick = () => {
    if (currentUser?.role === "admin") {
      toastError("Akses Terbatas", "Admin tidak dapat mengakses fitur status peminjaman member.");
      return;
    }
    handleCheckLoans();
  };

  const handleShowQrCode = () => {
    if (!bibliography?.items || bibliography.items.length === 0) {
      toastError("Tidak Ada Salinan", "Buku ini tidak memiliki salinan fisik (item).");
      return;
    }
    // Prioritize first available item, otherwise first item in list
    const availableItems = bibliography.items.filter((i) => i.status === "available");
    const chosenItem = availableItems.length > 0
      ? availableItems[0]
      : bibliography.items[0];

    setSelectedItemForQr(chosenItem);
    setShowQrModal(true);
  };

  if (loading || sessionLoading)
    return (
        <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-700"></div>
      </div>
    );

  return (
    <div className="min-h-screen bg-muted">
      <Navbar />

      {/* Modal Form Peminjaman */}
      {showLoanForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Ajukan Peminjaman Buku
            </h3>

            <div className="space-y-4 mb-6">
              {/* Info Buku */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="font-medium text-slate-900">
                  {bibliography?.title}
                </p>
                <p className="text-sm text-slate-600">{bibliography?.author}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tanggal Peminjaman
                </label>
                <input
                  type="date"
                  name="loanDate"
                  value={loanFormData.loanDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-primary/10"
                  required
                />
              </div>

              {/* ✅ Tanggal Pengembalian — otomatis 7 hari, diblokir dari input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tanggal Pengembalian (Maks 7 Hari)
                </label>
                <input
                  type="date"
                  name="dueDate"
                  value={loanFormData.dueDate}
                  readOnly
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Catatan (opsional)
                </label>
                <textarea
                  name="notes"
                  value={loanFormData.notes}
                  onChange={handleInputChange}
                  placeholder="Contoh: untuk tugas akhir, dll"
                  className="w-full px-4 py-2.5 border border-slate-200 text-slate-900 rounded-xl text-sm focus:ring-2 focus:ring-primary/10"
                  rows={3}
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl space-y-1">
                <p>• Maksimal peminjaman 14 hari</p>
                <p>• Denda keterlambatan Rp 2.000/hari</p>
                <p>• Permintaan akan diproses oleh petugas</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLoanForm(false);
                  setLoanFormData({ loanDate: "", dueDate: "", notes: "" });
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-foreground text-sm font-medium hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitLoan}
                disabled={borrowLoading}
                className="flex-1 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 disabled:bg-slate-400 transition-all"
              >
                {borrowLoading ? "Memproses..." : "Ajukan Peminjaman"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code Salinan Buku */}
      {showQrModal && selectedItemForQr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
          <div className="bg-card rounded-3xl p-6 max-w-md w-full border border-border shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-md font-extrabold text-slate-900 tracking-tight">
                QR Code Salinan (Exemplar)
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Detail Buku Singkat */}
              <div className="p-3 bg-muted rounded-2xl">
                <p className="font-bold text-xs text-foreground line-clamp-1">
                  {bibliography?.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                  {bibliography?.author}
                </p>
              </div>

              {/* QR Code Frame */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-muted/30">
                <div className="w-48 h-48 bg-white p-2 rounded-2xl shadow-md border border-slate-200 flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedItemForQr.itemCode || bibliography?.isbn || bibliography?.id || "")}`}
                    alt={selectedItemForQr.itemCode || bibliography?.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="mt-4 font-mono font-extrabold text-sm text-slate-800 tracking-wider">
                  {selectedItemForQr.itemCode || "-"}
                </span>
                <span className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  selectedItemForQr.status === "available"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-primary"
                }`}>
                  Status: {selectedItemForQr.status === "available" ? "Tersedia" : "Dipinjam"}
                </span>
              </div>

              {/* Dropdown Selector for other exemplars */}
              {bibliography?.items && bibliography.items.length > 1 && (
                <div>
                  <label className="block text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">
                    Pilih Salinan Lain
                  </label>
                  <select
                    value={selectedItemForQr.id}
                    onChange={(e) => {
                      const found = bibliography.items?.find((i) => i.id === e.target.value);
                      if (found) setSelectedItemForQr(found as any);
                    }}
                    className="w-full p-3 bg-muted border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-100 focus:border-primary transition-all cursor-pointer text-foreground font-semibold"
                  >
                    {bibliography.items.map((item, idx) => (
                      <option key={item.id} value={item.id}>
                        Salinan #{idx + 1} - {item.itemCode} ({item.status === "available" ? "Tersedia" : "Dipinjam"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setShowQrModal(false)}
                className="w-full bg-foreground hover:bg-foreground/90 text-primary-foreground font-bold py-3 rounded-xl shadow-lg mt-2 transition-all active:scale-[0.98] text-xs uppercase tracking-wider"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[13px] text-muted-foreground mb-4 sm:mb-6 font-medium">
          <Link to="/" className="hover:text-primary">
            Beranda
          </Link>
          <ChevronRight size={12} />
          <Link to="/katalog" className="hover:text-primary">
            Katalog
          </Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold truncate">
            {bibliography?.title}
          </span>
        </nav>

        {/* Card Utama */}
        <div className="bg-card rounded-[24px] sm:rounded-[32px] shadow-sm border border-border overflow-hidden flex flex-col md:flex-row mb-12">
          {/* Sisi Kiri - Visual */}
          <div className="md:w-[35%] bg-background p-6 sm:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
            <div className="w-44 h-60 sm:w-52 sm:h-72 rounded-xl overflow-hidden shadow-2xl bg-card mb-6 sm:mb-8">
              {bibliography?.image ? (
                <img
                  src={bibliography.image}
                  alt={bibliography.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-emerald-900 flex items-center justify-center text-white p-4 text-center">
                  <span className="font-bold text-sm sm:text-lg italic">
                    {bibliography?.title}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-4 sm:gap-5">
              {[
                {
                  icon: <Share2 size={18} />,
                  label: "Bagikan",
                  onClick: handleShare,
                  active: false,
                },
                {
                  icon: <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />,
                  label: isSaved ? "Disimpan" : "Simpan",
                  onClick: handleToggleSave,
                  active: isSaved,
                },
                {
                  icon: <QrCode size={18} />,
                  label: "QR Code",
                  onClick: handleShowQrCode,
                  active: false,
                },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.onClick}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className={`p-2.5 border rounded-xl group-hover:bg-card group-hover:shadow-sm transition-all ${
                    btn.active 
                      ? "border-primary bg-accent text-primary" 
                      : "border-border text-muted-foreground group-hover:text-primary"
                  }`}>
                    {btn.icon}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    btn.active ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {btn.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sisi Kanan - Konten */}
          <div className="md:w-[65%] p-5 sm:p-8 md:p-10 flex flex-col">
            <div className="flex gap-2 mb-4 flex-wrap">
              {/* Status Badge */}
              {isBorrowing ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-purple-50 text-purple-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  Sedang Anda Pinjam
                </span>
              ) : isPending ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-yellow-50 text-yellow-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                  Menunggu Persetujuan
                </span>
              ) : isUserReserved() ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-orange-50 text-orange-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  Buku Sudah Anda Reservasi
                </span>
              ) : bookStatus === "empty" ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-red-50 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Stok Kosong
                </span>
              ) : bookStatus === "available" ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-green-50 text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Tersedia
                </span>
              ) : (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center gap-1.5 bg-blue-50 text-blue-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Sedang Dipinjam
                </span>
              )}

              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-50 text-slate-400 dark:bg-muted dark:text-slate-300 rounded-full text-[9px] sm:text-[10px] font-bold">
                {bibliography?.type === "physical_book" ? "Buku Fisik" : "E-Book"}
              </span>

              {bibliography?.items ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-50 text-slate-400 dark:bg-muted dark:text-slate-300 rounded-full text-[9px] sm:text-[10px] font-bold">
                  Stok:{" "}
                  {
                    bibliography.items.filter((i) => i.status === "available")
                      .length
                  }{" "}
                  Fisik Tersedia
                </span>
              ) : bibliography?.stock !== undefined ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-50 text-slate-400 dark:bg-muted dark:text-slate-300 rounded-full text-[9px] sm:text-[10px] font-bold">
                  Stok: {bibliography.stock}
                </span>
              ) : null}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
              {bibliography?.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 font-medium mb-5 sm:mb-8">
              Oleh{" "}
              <span className="text-primary font-bold">
                {bibliography?.author}
              </span>
            </p>

            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-8 border-b border-slate-100 dark:border-border/50 pb-5 sm:pb-8">
              <div>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {bibliography?.isbn && bibliography?.issn ? "ISBN / ISSN" : bibliography?.issn ? "ISSN" : "ISBN"}
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200">
                  {bibliography?.isbn && bibliography?.issn
                    ? `${cleanIsbn(bibliography.isbn)} / ${bibliography.issn}`
                    : bibliography?.isbn
                    ? cleanIsbn(bibliography.isbn)
                    : bibliography?.issn || "-"}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Penerbit
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200">
                  {bibliography?.publisher || "-"}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Tahun
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200">
                  {bibliography?.publicationYear || "-"}
                </p>
              </div>
            </div>

            {/* Lokasi Buku */}
            {bibliography?.items && bibliography.items.length > 0 && (
              <div className="mb-6 p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 dark:bg-muted/30 dark:border-border/30">
                <h3 className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">
                  Lokasi Penyimpanan Buku
                </h3>
                <div className="space-y-2">
                  {Array.from(new Set(bibliography.items.map(item => {
                    const loc = item.location;
                    if (!loc) return "Lokasi tidak ditentukan";
                    return `${loc.room} (Rak: ${loc.rack}, Baris: ${loc.shelf})`;
                  }))).map((locationStr, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                      <span>{locationStr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tombol Aksi */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-6 sm:mt-auto">
              <button
                onClick={handleBorrow}
                disabled={borrowLoading || isBorrowing}
                className="w-full sm:flex-1 bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-3 sm:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-[0.98]"
              >
                {borrowLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Memproses...
                  </>
                ) : isBorrowing ? (
                  <>
                    <CheckCircle size={16} className="sm:size-[18px]" /> Sedang Anda Pinjam
                  </>
                ) : isPending ? (
                  <>
                    <Clock size={16} className="sm:size-[18px]" /> Menunggu Persetujuan
                  </>
                ) : isUserReserved() ? (
                  <>
                    <Calendar size={16} className="sm:size-[18px]" /> Sudah Reservasi
                  </>
                ) : bookStatus === "borrowed" || bookStatus === "empty" ? (
                  <>
                    <Calendar size={16} className="sm:size-[18px]" /> Reservasi Buku
                  </>
                ) : (
                  <>
                    <Bookmark size={16} className="sm:size-[18px]" /> Pinjam Buku
                  </>
                )}
              </button>

              {currentUser && (
                <button
                  onClick={onCheckStatusClick}
                  className="w-full sm:w-auto sm:px-6 bg-card border border-border hover:bg-muted text-foreground py-3 sm:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-[0.98]"
                >
                  <Bell size={16} className="sm:size-[18px]" />
                  Cek Status
                </button>
              )}
            </div>

            {!currentUser && (
              <p className="text-xs text-center text-slate-400 mt-4">
                Silakan{" "}
                <Link to="/login" className="text-primary font-bold">
                  login
                </Link>{" "}
                untuk meminjam buku
              </p>
            )}

            {isPending && (
              <p className="text-xs text-center text-yellow-600 mt-3 bg-yellow-50 p-2 rounded-xl">
                Permintaan peminjaman Anda sedang diproses oleh petugas.
              </p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-8">
            <p className="text-primary text-sm font-medium">{error}</p>
          </div>
        )}

        {/* SECTION: BUKU SERUPA */}
        <div className="mb-20">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-foreground">
                Buku Serupa
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-muted-foreground font-medium">
                Buku lain dengan topik atau kategori yang mungkin Anda sukai
              </p>
            </div>
            <Link
              to="/katalog"
              className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
            >
              Lihat Semua <ArrowRight size={16} />
            </Link>
          </div>

          {similarLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-card rounded-2xl p-3 sm:p-3.5 border border-slate-100 dark:border-border/60 shadow-xs animate-pulse"
                >
                  <div className="aspect-[4/5] bg-slate-200 dark:bg-muted rounded-xl mb-3" />
                  <div className="h-4 bg-slate-200 dark:bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 dark:bg-muted/70 rounded w-1/2 mb-3" />
                  <div className="flex gap-1.5 mb-4">
                    <div className="h-4 bg-slate-100 dark:bg-muted rounded w-12" />
                    <div className="h-4 bg-slate-100 dark:bg-muted rounded w-14" />
                  </div>
                  <div className="h-8 bg-slate-100 dark:bg-muted rounded-lg w-full" />
                </div>
              ))}
            </div>
          ) : similarBooks.length === 0 ? (
            <div className="bg-white dark:bg-card border border-slate-100 dark:border-border/60 rounded-2xl p-8 text-center shadow-xs">
              <p className="text-xs sm:text-sm text-slate-400 dark:text-muted-foreground">
                Belum ada buku serupa yang ditemukan saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {similarBooks.map((book) => {
                const status = getSimilarBookStatus(book);
                const isEbook = book.type === "ebook";
                const seedColor = generateColorFromSeed(book.id || book.title);
                const isBookSavedStatus = !!similarSavedMap[book.id];

                // Category tags
                const tags: string[] = [];
                if (Array.isArray(book.subjects) && book.subjects.length > 0) {
                  book.subjects.slice(0, 2).forEach((s) => {
                    if (s?.name) tags.push(s.name);
                  });
                }
                if (tags.length === 0) {
                  tags.push(isEbook ? "E-Book" : "Umum");
                }

                return (
                  <div
                    key={book.id}
                    onClick={() => {
                      navigate(`/katalog/${book.id}`);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="bg-white dark:bg-card rounded-2xl p-2.5 sm:p-3 md:p-3.5 border border-slate-100 dark:border-border/60 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      {/* Bagian Cover Buku & Badge Mengambang */}
                      <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 dark:bg-muted">
                        {book.image ? (
                          <img
                            src={book.image}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={`w-full h-full bg-gradient-to-br ${seedColor} p-2.5 sm:p-4 flex flex-col justify-between text-white shadow-inner`}
                          >
                            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-white/60">
                              {isEbook ? "E-Book" : "UMC Library"}
                            </span>
                            <span className="font-bold text-[11px] sm:text-xs md:text-sm text-center leading-snug line-clamp-3 my-auto">
                              {book.title}
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-white/70 line-clamp-1 text-right">
                              {book.author}
                            </span>
                          </div>
                        )}

                        {/* Status Badge Mengambang di Pojok Kanan Atas Cover */}
                        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10">
                          {status === "available" ? (
                            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-emerald-50/95 backdrop-blur-xs text-emerald-600 border border-emerald-100/90 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Tersedia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-blue-50/95 backdrop-blur-xs text-blue-600 border border-blue-100/90 shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              Dipinjam
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Informasi Buku */}
                      <div className="mt-2.5 sm:mt-3">
                        <h3
                          title={book.title}
                          className="font-bold text-slate-900 dark:text-foreground text-[13px] sm:text-[14px] md:text-[15px] leading-snug line-clamp-1 group-hover:text-[#9D171D] transition-colors"
                        >
                          {book.title}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-400 font-normal line-clamp-1 mt-0.5">
                          {book.author || "Penulis Tidak Diketahui"}
                        </p>

                        {/* Kategori / Tags */}
                        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-2">
                          {tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] sm:text-[10px] md:text-[11px] font-medium px-1.5 py-0.5 sm:px-2 rounded-md bg-slate-100 dark:bg-muted text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi di Bagian Bawah Kartu */}
                    <div className="mt-3 sm:mt-3.5 pt-2 flex items-center justify-between gap-1.5 sm:gap-2 border-t border-slate-50 dark:border-border/30">
                      {/* Tombol Favorit / Heart */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSimilarBookmark(e, book.id)}
                        className="p-1 sm:p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50/60 transition-colors shrink-0 cursor-pointer"
                        aria-label="Simpan buku"
                      >
                        <Heart
                          size={16}
                          className={`sm:w-[18px] sm:h-[18px] ${
                            isBookSavedStatus
                              ? "fill-red-500 text-red-500"
                              : "transition-transform hover:scale-110"
                          }`}
                        />
                      </button>

                      {/* Tombol Aksi: Lihat Detail / Lakukan Reservasi */}
                      {status === "available" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/katalog/${book.id}`);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold text-[#9D171D] bg-[#FDF2F2] hover:bg-[#FCE8E8] transition-colors uppercase tracking-wider cursor-pointer"
                        >
                          <span className="truncate">LIHAT DETAIL</span>
                          <ArrowRight size={12} className="shrink-0 sm:w-[13px] sm:h-[13px]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/katalog/${book.id}`);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 px-2 sm:px-3 rounded-lg text-[10px] sm:text-[11px] font-bold text-[#9D171D] bg-[#FDF2F2] hover:bg-[#FCE8E8] transition-colors cursor-pointer"
                        >
                          <span className="truncate">Lakukan Reservasi</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Daftar Reservasi User */}
      {currentUser && (
        <ReservationList
          isOpen={showReservationList}
          onClose={() => setShowReservationList(false)}
          memberId={currentUser.memberId}
        />
      )}

      <Footer />
    </div>
  );
};

export default KatalogDetail;