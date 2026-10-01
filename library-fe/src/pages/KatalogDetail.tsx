import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import ReservationList from "@/components/ReservationList";
import { authClient } from "@/utils/auth-client";
import { useKatalogDetail } from "@/hooks/useKatalogDetail";
import { useKatalogActions } from "@/hooks/useKatalogActions";
import type { LibraryUser } from "@/types";
import { PerspectiveBook } from "@/components/perspective-book";
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
  BookOpen,
  X,
} from "lucide-react";
import { generateColorFromSeed, cleanIsbn } from "@/utils/format";

const KatalogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();

  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedItemForQr, setSelectedItemForQr] = useState<{ id: string; itemCode?: string; status: string } | null>(null);
  const [isSaved, setIsSaved] = useState(() => {
    if (id) {
      const savedIds = JSON.parse(localStorage.getItem("umc_library_bookmarks") || "[]");
      return savedIds.includes(id);
    }
    return false;
  });

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

  // Track state sync if bibliography ID changes
  useEffect(() => {
    if (bibliography?.id) {
      const savedIds = JSON.parse(localStorage.getItem("umc_library_bookmarks") || "[]");
      setIsSaved(savedIds.includes(bibliography.id));
    }
  }, [bibliography]);

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
    const savedIds: string[] = JSON.parse(
      localStorage.getItem("umc_library_bookmarks") || "[]"
    );

    if (isSaved) {
      const updated = savedIds.filter((id) => id !== bibliography.id);
      localStorage.setItem("umc_library_bookmarks", JSON.stringify(updated));
      setIsSaved(false);
      toastInfo("Buku Dihapus", "Buku telah dihapus dari daftar simpanan.");
    } else {
      savedIds.push(bibliography.id);
      localStorage.setItem("umc_library_bookmarks", JSON.stringify(savedIds));
      setIsSaved(true);
      toastSuccess("Buku Disimpan", "Buku berhasil disimpan ke daftar simpanan.");
    }
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
    // Filter available items first, fallback to any item
    const availableItems = bibliography.items.filter((i) => i.status === "available");
    const chosenItem = availableItems.length > 0
      ? availableItems[Math.floor(Math.random() * availableItems.length)]
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
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedItemForQr.itemCode || "")}`}
                  alt={selectedItemForQr.itemCode}
                  className="w-48 h-48 bg-white p-2 rounded-2xl shadow-md border border-slate-200"
                />
                <span className="mt-4 font-mono font-extrabold text-sm text-slate-800 tracking-wider">
                  {selectedItemForQr.itemCode}
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
                  ISBN
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200">
                  {cleanIsbn(bibliography?.isbn) || "-"}
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
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Buku Serupa
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                Buku lain dengan topik yang mungkin Anda sukai
              </p>
            </div>
            <Link
              to="/katalog"
              className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
            >
              Lihat Semua <ArrowRight size={16} />
            </Link>
          </div>

          <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6">
            {similarBooks.map((book) => (
              <Link
                key={book.id}
                to={`/katalog/${book.id}`}
                className="group flex flex-col items-center gap-2"
              >
                <PerspectiveBook
                  size="sm"
                  className={generateColorFromSeed(book.id)}
                >
                  <div className="flex flex-col h-full gap-1.5">
                    <p className="font-semibold capitalize leading-4 text-white text-xs line-clamp-3">
                      {book.title}
                    </p>
                    <div className="mt-auto flex flex-col gap-1">
                      <span className="text-white/70 text-[10px] leading-tight line-clamp-1">
                        {book.author}
                      </span>
                      <div className="flex items-center gap-1">
                        <BookOpen className="size-3 text-white/70" />
                        <span className="text-white/60 text-[9px]">
                          {book.publicationYear ?? ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </PerspectiveBook>
                <div className="text-center w-[150px]">
                  <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {book.title}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                    {book.author}
                  </p>
                </div>
              </Link>
            ))}
          </div>
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