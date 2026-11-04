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
  Smartphone
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
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka e-book di tab baru atau aplikasi pembaca PDF bawaan perangkat"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors min-h-[38px]"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Buka di Tab Baru</span>
              </a>
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
        <div className="flex-1 bg-muted relative flex flex-col">
          {/* Banner petunjuk mobile */}
          {blobUrl && (
            <div className="md:hidden flex items-center justify-between px-4 py-2 bg-primary/10 border-b border-border text-xs text-primary font-medium">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 shrink-0" />
                Mode Ponsel: Buka tab baru untuk navigasi lancar
              </span>
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline ml-2 shrink-0"
              >
                Buka PDF
              </a>
            </div>
          )}

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
