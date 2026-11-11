import * as React from "react";
import { ArrowRight, Megaphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface BannerAnnouncementStickyProps {
  className?: string;
  isActive?: boolean;
  badgeText?: string;
  message?: string;
  linkText?: string;
  linkUrl?: string;
  storageKey?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function BannerAnnouncementSticky({
  className,
  isActive = true,
  badgeText = "Pengumuman",
  message = "Layanan repositori digital dan peminjaman buku fisik kini dapat diakses secara mandiri.",
  linkText = "Lihat Katalog",
  linkUrl = "/katalog",
  storageKey = "mucilib_dismiss_banner_v1",
  dismissible = true,
  onDismiss,
}: BannerAnnouncementStickyProps) {
  const [isVisible, setIsVisible] = React.useState<boolean>(() => {
    if (!isActive) return false;
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(storageKey) !== "dismissed";
    } catch {
      return true;
    }
  });

  React.useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }
    try {
      setIsVisible(localStorage.getItem(storageKey) !== "dismissed");
    } catch {
      setIsVisible(true);
    }
  }, [isActive, storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(storageKey, "dismissed");
    } catch {
      // Ignore localStorage error
    }
    onDismiss?.();
  };

  if (!isActive || !isVisible) return null;

  return (
    <aside
      data-slot="banner-announcement-sticky"
      className={cn(
        "border-border bg-card/95 relative z-50 border-b px-3 sm:px-4 py-2 sm:py-2.5 backdrop-blur-md transition-colors",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center relative px-8 sm:px-12 text-xs">
        {/* Centered Content */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap text-center">
          {badgeText && (
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 shrink-0 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase rounded-full"
            >
              {badgeText}
            </Badge>
          )}

          <p className="text-foreground inline-flex items-center justify-center gap-1.5 text-[11px] sm:text-xs leading-snug sm:leading-relaxed">
            <Megaphone className="text-primary hidden size-3.5 shrink-0 sm:inline" />
            <span className="break-words">{message}</span>
          </p>

          {linkText && linkUrl && (
            <a
              href={linkUrl}
              className="text-primary inline-flex shrink-0 items-center gap-1 font-bold underline-offset-2 hover:underline text-[11px] sm:text-xs"
            >
              <span>{linkText}</span>
              <ArrowRight className="size-3" />
            </a>
          )}
        </div>

        {/* Dismiss Trigger Button on the right edge */}
        {dismissible && (
          <button
            type="button"
            className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 hover:bg-muted text-muted-foreground hover:text-foreground flex size-7 sm:size-6 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup pengumuman"
            onClick={handleDismiss}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}

export default BannerAnnouncementSticky;
