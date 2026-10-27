import { useState } from "react";
import { Link } from "react-router";
import {
  X,
  Maximize2,
  Minimize2,
  BookOpen,
  Lock
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
  const streamUrl = `${API_BASE_URL}/api/ebooks/${ebookId}/stream#toolbar=0&navpanes=0&scrollbar=1`;

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
        <div className="flex-1 bg-muted relative">
          <iframe
            src={streamUrl}
            title={title}
            className="w-full h-full border-0"
          />
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
