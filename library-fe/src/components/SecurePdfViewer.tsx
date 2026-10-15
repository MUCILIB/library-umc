import { useState } from "react";
import { Link } from "react-router";
import { authClient } from "@/utils/auth-client";
import { API_BASE_URL } from "@/utils/api-config";
import {
  Lock,
  LogIn,
  FileText,
  ShieldAlert,
  Maximize2,
  Download
} from "lucide-react";

interface SecurePdfViewerProps {
  proposalId: string;
  title: string;
  authorName: string;
  authorNim: string;
  authorUserId?: string;
  totalPhysicalPages: number;
  allowedPublicPages?: number; // Default 10
}

export default function SecurePdfViewer({
  proposalId,
  title,
  authorName,
  authorNim,
  authorUserId,
  totalPhysicalPages,
  allowedPublicPages = 10
}: SecurePdfViewerProps) {
  const { data: session } = authClient.useSession();
  const [fullscreen, setFullscreen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const user = session?.user;
  const isOwner = Boolean(user?.id && authorUserId && user.id === authorUserId);
  const isStaffOrAdmin = Boolean(
    user?.role === "super_admin" ||
    user?.role === "staff" ||
    user?.role === "admin"
  );
  // Civitas/login atau pemilik atau staff
  const isAuthenticated = Boolean(user);
  const canDownloadFull = isOwner || isStaffOrAdmin;

  const sessionToken = (session as any)?.session?.token || (session as any)?.token;
  const tokenParam = sessionToken ? `?token=${encodeURIComponent(sessionToken)}` : "";

  // Endpoint streaming dynamic sliced PDF dari backend
  const pdfStreamUrl = `${API_BASE_URL}/api/repository/proposals/${proposalId}/view-pdf${tokenParam}#toolbar=0&navpanes=0&scrollbar=1`;

  const handleDownloadFull = async () => {
    try {
      setDownloading(true);
      const downloadUrl = `${API_BASE_URL}/api/repository/proposals/${proposalId}/view-pdf?download=true${sessionToken ? `&token=${encodeURIComponent(sessionToken)}` : ""}`;
      const res = await fetch(downloadUrl, {
        credentials: "include",
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}
      });
      if (!res.ok) throw new Error("Gagal mengunduh dokumen");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replace(/\s+/g, "_").substring(0, 50);
      a.download = `${cleanTitle || "naskah"}_${proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Gagal mengunduh berkas:", err);
    } finally {
      setDownloading(false);
    }
  };

  const visiblePagesCount = isOwner || isStaffOrAdmin || isAuthenticated
    ? totalPhysicalPages
    : Math.min(allowedPublicPages, totalPhysicalPages);

  return (
    <div className={`space-y-6 ${fullscreen ? "fixed inset-0 z-50 bg-background p-6 overflow-y-auto" : ""}`}>
      {/* Header Info Dokumen */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                isOwner
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                  : isStaffOrAdmin
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                  : isAuthenticated
                  ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {isOwner
                ? "Naskah Karya Anda Sendiri (Akses Penuh Bebas)"
                : isStaffOrAdmin
                ? "Akses Verifikasi Administrator"
                : isAuthenticated
                ? "Akses Civitas Lengkap"
                : "Pratinjau Publik Terbatas"}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Halaman 1 s/d {visiblePagesCount} dari total {totalPhysicalPages} Halaman
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1.5 line-clamp-1">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Penulis: {authorName} ({authorNim})
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canDownloadFull && (
            <button
              onClick={handleDownloadFull}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              title="Unduh Naskah Asli Penuh"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              {downloading ? "Mengunduh..." : "Unduh Naskah Lengkap"}
            </button>
          )}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
            {fullscreen ? "Tutup Layar Penuh" : "Layar Penuh"}
          </button>
        </div>
      </div>

      {/* PDF Frame Container */}
      <div className="relative rounded-2xl border border-border bg-muted/20 overflow-hidden shadow-sm">
        {/* Iframe yang memanggil potongan PDF dari backend */}
        <div className="w-full h-[620px] md:h-[750px] bg-slate-100 dark:bg-slate-900">
          <iframe
            src={pdfStreamUrl}
            title={title}
            className="w-full h-full border-0 select-none"
          />
        </div>

        {/* Card Info Pembatas & Efek Blur untuk Pengguna Non-Login (Public Guest) */}
        {!isAuthenticated && totalPhysicalPages > allowedPublicPages && (
          <div className="relative border-t border-border bg-gradient-to-b from-card/80 to-card backdrop-blur-md p-8 md:p-12 text-center">
            {/* Soft decorative background fade */}
            <div className="max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 mx-auto flex items-center justify-center shadow-inner">
                <Lock className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Akses Terkunci Mulai Halaman {allowedPublicPages + 1} s/d {totalPhysicalPages}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Pratinjau publik hanya menampilkan halaman awal (Cover, Abstrak, dan Daftar Isi). Sesuai kebijakan repositori kampus, naskah bab pembahasan lengkap hanya dapat diakses oleh dosen dan mahasiswa civitas akademika.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-700 hover:bg-red-800 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk dengan Akun Kampus
                </Link>
                <Link
                  to="/katalog"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm border border-border hover:bg-muted text-foreground transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Eksplorasi Koleksi Lain
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-3">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Dokumen dilindungi hak cipta & Page-Level Digital ACL UMC</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
