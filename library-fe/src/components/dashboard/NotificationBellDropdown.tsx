import React, { useState } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  BookOpen,
  RotateCcw,
  CreditCard,
  FileText,
  BookPlus,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  useNotificationReadState,
  NOTIFICATION_CATEGORIES,
} from "@/hooks/dashboard/useNotificationReadState";
import type { DashboardBadgeCounts } from "@/services/dashboard/dashboardDataService";

const CATEGORY_ICONS: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
  }
> = {
  loans: {
    icon: BookOpen,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
  returnApprovals: {
    icon: RotateCcw,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10 border-amber-500/20",
  },
  cardApprovals: {
    icon: CreditCard,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10 border-emerald-500/20",
  },
  repository: {
    icon: FileText,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10 border-purple-500/20",
  },
  recommendations: {
    icon: BookPlus,
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgClass: "bg-indigo-500/10 border-indigo-500/20",
  },
  fines: {
    icon: AlertCircle,
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-500/10 border-rose-500/20",
  },
};

interface NotificationBellDropdownProps {
  badges: DashboardBadgeCounts;
  onSelectMenu: (menuKey: string) => void;
  onRefresh?: () => void;
}

export function NotificationBellDropdown({
  badges,
  onSelectMenu,
  onRefresh,
}: NotificationBellDropdownProps) {
  const [open, setOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { unreadCounts, totalUnread, markAllAsRead, markCategoryAsRead } =
    useNotificationReadState(badges);

  const activeCategories = NOTIFICATION_CATEGORIES.filter((cat) => {
    const count = Number(badges[cat.key] || 0);
    return count > 0;
  });

  const handleItemClick = (categoryKey: string, menuKey: string) => {
    markCategoryAsRead(categoryKey);
    onSelectMenu(menuKey);
    setOpen(false);
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            totalUnread > 0
              ? `Notifikasi: ${totalUnread} belum dibaca`
              : "Notifikasi"
          }
          title={
            totalUnread > 0
              ? `${totalUnread} notifikasi belum dibaca`
              : "Semua notifikasi telah ditinjau"
          }
          className="relative flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-4" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white font-extrabold text-[9px] shadow-sm ring-2 ring-background animate-in zoom-in-75 duration-200">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-2xl border border-border bg-popover shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              Notifikasi
            </h4>
            {totalUnread > 0 ? (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                {totalUnread} Baru
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Semua Terbaca
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {totalUnread > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                title="Tandai semua notifikasi telah dibaca"
              >
                <CheckCheck className="size-3.5" />
                <span>Tandai dibaca</span>
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label="Segarkan notifikasi"
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                title="Segarkan notifikasi"
              >
                <RotateCw
                  className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Content List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {activeCategories.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-2.5">
                <BellOff className="size-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                Tidak ada notifikasi baru
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground max-w-xs mx-auto">
                Semua permohonan persetujuan telah ditinjau dan tidak ada
                antrean yang tertunda.
              </p>
            </div>
          ) : (
            activeCategories.map((cat) => {
              const count = Number(badges[cat.key] || 0);
              const unread = Number(unreadCounts[cat.key] || 0);
              const isUnread = unread > 0;
              const iconMeta = CATEGORY_ICONS[cat.key] || {
                icon: Bell,
                colorClass: "text-primary",
                bgClass: "bg-primary/10 border-primary/20",
              };
              const IconComp = iconMeta.icon;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleItemClick(cat.key as string, cat.menuKey)}
                  className={`w-full flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-muted/60 ${
                    isUnread ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${iconMeta.bgClass} ${iconMeta.colorClass}`}
                  >
                    <IconComp className="size-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-xs truncate ${
                          isUnread
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/85"
                        }`}
                      >
                        {cat.label}
                      </p>
                      {isUnread && (
                        <span
                          className="size-1.5 rounded-full bg-rose-600 shrink-0"
                          title="Belum dibaca"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {cat.description(count)}
                    </p>
                  </div>

                  <span
                    className={`ml-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isUnread
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold"
                        : "bg-muted text-muted-foreground font-medium"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {activeCategories.length > 0 && (
          <div className="border-t border-border bg-muted/20 px-4 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">
              Klik item untuk membuka halaman dan menindaklanjuti antrean
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
