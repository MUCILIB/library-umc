import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  X,
  Maximize2,
  Minimize2,
  BookOpen,
  Lock,
  ExternalLink,
  FileWarning,
  Smartphone,
  FileText
} from "lucide-react";
import { authClient } from "@/utils/auth-client";
import { API_BASE_URL } from "@/utils/api-config";
import Modal from "@/components/ui/modal";

interface EbookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ebookId: string;
  title: string;
  author?: string;
}

export default function EbookReaderModal({
  isOpen,
  onClose,
  ebookId,
  title,
  author
}: EbookReaderModalProps) {
  const { data: session } = authClient.useSession();
  const [fullscreen, setFullscreen] = useState(false);

  const isAuthenticated = Boolean(session?.user);
  const sessionToken =
    (session as any)?.session?.token ||
    (session as any)?.token ||
    (typeof window !== "undefined" ? localStorage.getItem("better_auth_token") : null);

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const directEbookUrl = `${API_BASE_URL}/api/ebooks/${ebookId}/stream`;

  const handleOpenMobileEbook = () => {
    if (!blobUrl) return;
    const link = document.createElement("a");
    link.href = blobUrl;
    const cleanTitle = title
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .substring(0, 40);
    link.download = `ebook_${cleanTitle || "buku"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    let createdUrl: string | null = null;
    setLoadingPdf(true);
    setLoadError(null);

    const streamUrl = `${API_BASE_URL}/api/ebooks/${ebookId}/stream`;
    fetch(streamUrl, {
      credentials: "include",
      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat e-book");
        return res.blob();
      })
      .then((blob) => {
        if (active) {
          createdUrl = URL.createObjectURL(blob);
          setBlobUrl(createdUrl);
          setLoadingPdf(false);
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err?.message || "Gagal memuat berkas e-book");
          setLoadingPdf(false);
        }
      });

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [isOpen, ebookId, sessionToken]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={fullscreen ? "fullscreen" : "xl"}
      title=""
      className="p-0 overflow-hidden"
    >
      <div
        className="flex flex-col h-[85vh] bg-background select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Reader Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3 overflow-hidden mr-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">{title}</h2>
              {author && (
                <p className="text-xs text-muted-foreground truncate">{author}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {blobUrl && (
              <button
                type="button"
                onClick={handleOpenMobileEbook}
                title="Buka e-book atau simpan ke perangkat"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors min-h-[38px] cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Buka Dokumen</span>
              </button>
            )}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              title="Tutup Reader"
              className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-muted rounded-lg transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Reader Frame */}
        <div className="flex-1 bg-muted relative flex flex-col overflow-y-auto">
          {/* MOBILE ADAPTIVE VIEWER (Khusus Smartphone & Layar Ponsel) */}
          <div
            className="md:hidden p-4 space-y-3 bg-card border-b border-border"
            data-testid="mobile-ebook-card"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Baca E-Book di Ponsel
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Gunakan pembaca dokumen PDF bawaan smartphone Anda untuk navigasi yang lancar.
                </p>
              </div>
            </div>

            {loadingPdf ? (
              <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
                Membuka berkas e-book...
              </div>
            ) : loadError ? (
              <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-xl border border-destructive/20 text-center">
                {loadError}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenMobileEbook}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Buka & Baca E-Book (PDF)</span>
                </button>

                <a
                  href={directEbookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl border border-border hover:bg-muted text-foreground text-[11px] font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Buka via Tautan Langsung</span>
                </a>
              </div>
            )}
          </div>

          {loadingPdf && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <span className="text-sm font-medium text-muted-foreground animate-pulse">
                Membuka berkas e-book...
              </span>
            </div>
          )}
          {loadError && !loadingPdf ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                <FileWarning className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Berkas E-Book Belum Tersedia</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                {loadError.toLowerCase().includes("belum diunggah")
                  ? "Dokumen naskah digital untuk e-book ini belum diunggah oleh administrator perpustakaan. Silakan hubungi petugas perpustakaan."
                  : loadError}
              </p>
            </div>
          ) : blobUrl ? (
            <div className="hidden md:flex flex-1 w-full h-full">
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full flex-1"
              >
                <iframe
                  src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                  title={title}
                  className="w-full h-full border-0"
                />
              </object>
            </div>
          ) : null}
        </div>

        {/* Reader Bottom Banner (Guest vs Authenticated) */}
        <div className="px-4 py-2.5 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          {isAuthenticated ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Akses Penuh Civitas UMC Aktif ({session?.user?.email})
            </span>
          ) : (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Pengunjung Tamu: Anda membaca versi pratinjau. Silakan{" "}
                <Link to="/login" className="font-bold underline hover:text-primary">
                  Login Civitas UMC
                </Link>{" "}
                untuk akses seluruh halaman.
              </span>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground">
            Perpustakaan Universitas Muhammadiyah Cirebon
          </div>
        </div>
      </div>
    </Modal>
  );
}
