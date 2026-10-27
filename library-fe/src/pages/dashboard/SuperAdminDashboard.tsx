import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Book,
  BookOpen,
  Home,
  LogOut,
  ScanLine,
  Search,
  Shield,
  Users,
  Wallet,
  BookMarked,
  CheckCircle,
  FileUp,
  FileDown,
  Package,
  Building2,
  GraduationCap,
  MapPin,
  Tablet
} from "lucide-react";

import Logo from "@/assets/logo_umc.png";
import AuditLogsSection from "@/components/dashboard/AuditLogsSection";
import CardApprovalsSection from "@/components/dashboard/CardApprovalsSection";
import CirculationSection from "@/components/dashboard/CirculationSection";
import BibliographySection from "@/components/dashboard/BibliographySection";
import ItemSection from "@/components/dashboard/ItemSection";
import ImportSection from "@/components/dashboard/ImportSection";
import ExportSection from "@/components/dashboard/ExportSection";
import DashboardSection from "@/components/dashboard/DashboardSection";
import FinesSection from "@/components/dashboard/FinesSection";
import GuestsSection from "@/components/dashboard/GuestsSection";
import LoansSection from "@/components/dashboard/LoansSection";
import ReportsSection from "@/components/dashboard/ReportsSection";
import UsersSection from "@/components/dashboard/UsersSection";
import ReturnApprovalsSection from "@/components/dashboard/ReturnApprovalsSection";
import RecommendationsSection from "@/components/dashboard/RecommendationsSection";
import RepositorySection from "@/components/dashboard/RepositorySection";
import EbookSection from "@/components/dashboard/EbookSection";
import FakultasSection from "@/components/dashboard/FakultasSection";
import ProdiSection from "@/components/dashboard/ProdiSection";
import LocationSection from "@/components/dashboard/LocationSection";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/ui/theme-toggle";
import { getUserAvatar } from "@/lib/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { useDashboardStatsLazy } from "@/hooks/dashboard/useDashboardStatsLazy";
import { useGuestsData } from "@/hooks/dashboard/useGuestsData";
import { cn } from "@/lib/utils";
import { dashboardDataService } from "@/services/dashboard/dashboardDataService";
import { authClient } from "@/utils/auth-client";
import { setAuthToken, clearAuthToken } from "@/api/client";

type ActiveMenu =
  | "dashboard"
  | "circulation"
  | "bibliographies"
  | "items"
  | "repository"
  | "ebooks"
  | "importData"
  | "exportData"
  | "guests"
  | "loans"
  | "fines"
  | "cardApprovals"
  | "returnApprovals"
  | "users"
  | "audit"
  | "reports"
  | "recommendations"
  | "fakultas"
  | "prodi"
  | "locations";

type MenuConfig = {
  key: ActiveMenu;
  label: string;
  icon: typeof Home;
  superAdminOnly?: boolean;
  group?: string;
};

const MENU_CONFIG: MenuConfig[] = [
  // Utama
  { key: "dashboard", label: "Dashboard", icon: Home, group: "Utama" },

  // Sirkulasi & Layanan
  { key: "circulation", label: "Sirkulasi & Scan", icon: ScanLine, group: "Sirkulasi & Layanan" },
  { key: "loans", label: "Peminjaman Buku", icon: BookOpen, group: "Sirkulasi & Layanan" },
  { key: "returnApprovals", label: "Konfirmasi Pengembalian", icon: CheckCircle, superAdminOnly: true, group: "Sirkulasi & Layanan" },
  { key: "fines", label: "Manajemen Denda", icon: Wallet, group: "Sirkulasi & Layanan" },
  { key: "cardApprovals", label: "Persetujuan Kartu", icon: Shield, group: "Sirkulasi & Layanan" },

  // Manajemen Koleksi
  { key: "bibliographies", label: "Bibliografi (Buku)", icon: Book, group: "Manajemen Koleksi" },
  { key: "items", label: "Item Eksemplar", icon: Package, group: "Manajemen Koleksi" },
  { key: "ebooks", label: "E-Book Digital", icon: Tablet, group: "Manajemen Koleksi" },
  { key: "repository", label: "Repositori Skripsi", icon: GraduationCap, group: "Manajemen Koleksi" },
  { key: "recommendations", label: "Rekomendasi Buku", icon: BookMarked, group: "Manajemen Koleksi" },
  { key: "importData", label: "Import Data", icon: FileUp, group: "Manajemen Koleksi" },
  { key: "exportData", label: "Export Data", icon: FileDown, group: "Manajemen Koleksi" },

  // Master Data
  { key: "fakultas", label: "Fakultas", icon: Building2, group: "Master Data" },
  { key: "prodi", label: "Program Studi", icon: GraduationCap, group: "Master Data" },
  { key: "locations", label: "Lokasi Rak", icon: MapPin, group: "Master Data" },

  // Pengaturan & Audit
  { key: "guests", label: "Data Pengunjung", icon: Users, group: "Pengaturan & Audit" },
  { key: "users", label: "Manajemen User", icon: Users, superAdminOnly: true, group: "Pengaturan & Audit" },
  { key: "audit", label: "Audit Log", icon: Shield, superAdminOnly: true, group: "Pengaturan & Audit" },
  { key: "reports", label: "Laporan & Statistik", icon: BarChart3, group: "Pengaturan & Audit" }
];

const SIDEBAR_STORAGE_KEY = "umc-super-admin-sidebar-open";

type DashboardSidebarProps = {
  activeMenu: ActiveMenu;
  menus: MenuConfig[];
  onMenuChange: (menu: ActiveMenu) => void;
  onSignOut: () => Promise<void>;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
};

function DashboardSidebar({
  activeMenu,
  menus,
  onMenuChange,
  onSignOut,
  user
}: DashboardSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMenus = useMemo(() => {
    if (!searchQuery.trim()) return menus;
    const q = searchQuery.toLowerCase();
    return menus.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        (m.group && m.group.toLowerCase().includes(q))
    );
  }, [menus, searchQuery]);

  const userInitial = (user?.name || "A").charAt(0).toUpperCase();

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r border-sidebar-border z-100"
    >
      <SidebarHeader className="bg-sidebar p-5 pb-3 group-data-[collapsible=icon]:p-3">
        <div className="flex items-center gap-3 border-b border-sidebar-border pb-3.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-b-0 group-data-[collapsible=icon]:pb-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 p-1.5">
            <img
              src={Logo}
              alt="UMC Library Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">
              UMC Library
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium truncate">
              Sistem Informasi Terpadu
            </p>
          </div>
        </div>

        {/* Quick Menu Search */}
        <div className="mt-3 group-data-[collapsible=icon]:hidden">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari navigasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-sidebar-accent/50 text-sidebar-foreground placeholder:text-muted-foreground text-xs rounded-lg pl-8 pr-2.5 py-1.5 border border-sidebar-border focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar px-2.5 py-2">
        <SidebarMenu className="space-y-0.5">
          {(() => {
            const items: React.ReactNode[] = [];
            let currentGroup = "";

            if (filteredMenus.length === 0) {
              return (
                <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Menu tidak ditemukan
                </div>
              );
            }

            filteredMenus.forEach(({ key, label, icon: Icon, group }) => {
              if (group && group !== currentGroup) {
                currentGroup = group;
                items.push(
                  <div key={`group-${group}`} className="pt-4 pb-1.5 px-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
                      {group}
                    </span>
                  </div>
                );
              }
              if (!group) {
                currentGroup = "";
              }

              const isActive = activeMenu === key;

              items.push(
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    onClick={() => onMenuChange(key)}
                    isActive={isActive}
                    tooltip={label}
                    className={cn(
                      "h-9.5 px-3 text-xs font-medium transition-all group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary rounded-l-none rounded-r-lg"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground rounded-lg"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/70")} />
                    <span className="group-data-[collapsible=icon]:hidden truncate">
                      {label}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            });
            return items;
          })()}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="size-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {user?.name || "Admin"}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium capitalize truncate">
                {user?.role?.replace("_", " ") || "Super Admin"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            title="Keluar"
            className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function SuperAdminDashboard() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>("dashboard");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === null ? true : saved === "true";
  });

  const isSuperAdmin =
    (session?.user as { role?: string } | undefined)?.role === "super_admin";

  useEffect(() => {
    const token = (session as any)?.session?.token;
    if (token) {
      setAuthToken(token);
    }
  }, [session]);

  const visibleMenus = useMemo(
    () => MENU_CONFIG.filter((item) => !item.superAdminOnly || isSuperAdmin),
    [isSuperAdmin]
  );

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const isHotKey =
        event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);
      if (!isHotKey) return;

      event.preventDefault();
      setIsCommandOpen((open) => !open);
    };

    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const {
    stats,
    loading: statsLoading,
    refetch: refetchStats
  } = useDashboardStatsLazy(activeMenu === "dashboard");

  const {
    guests,
    members,
    loading: guestsLoading,
    refetch: refetchGuests
  } = useGuestsData(activeMenu === "guests");

  const activeLoading = useMemo(() => {
    if (activeMenu === "dashboard") return statsLoading;
    if (activeMenu === "guests") return guestsLoading;
    return false;
  }, [
    activeMenu,
    statsLoading,
    guestsLoading
  ]);

  const handleSignOut = async () => {
    clearAuthToken();
    await authClient.signOut();
    navigate("/login");
  };

  const handleSidebarOpenChange = (open: boolean) => {
    setSidebarOpen(open);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
    }
  };

  const handleDeleteGuest = async (id: string, name: string) => {
    if (!confirm(`Hapus log pengunjung "${name}"?`)) return;
    try {
      await dashboardDataService.deleteGuest(id);
      await Promise.all([refetchGuests(), refetchStats()]);
    } catch (error) {
      console.error(error);
    }
  };

  const renderSection = () => {
    switch (activeMenu) {
      case "dashboard":
        return (
          <DashboardSection
            stats={stats}
            onNavigateLoans={() => setActiveMenu("loans")}
          />
        );
      case "bibliographies":
        return (
          <BibliographySection
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case "items":
        return <ItemSection />;
      case "repository":
        return <RepositorySection />;
      case "ebooks":
        return <EbookSection />;
      case "importData":
        return <ImportSection />;
      case "exportData":
        return <ExportSection />;
      case "guests":
        return (
          <GuestsSection
            guests={guests}
            members={members}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onDelete={handleDeleteGuest}
            onRefresh={() =>
              void Promise.all([refetchGuests(), refetchStats()])
            }
          />
        );
      case "loans":
        return (
          <LoansSection
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case "circulation":
        return <CirculationSection />;
      case "fines":
        return <FinesSection />;
      case "cardApprovals":
        return <CardApprovalsSection />;
      case "users":
        if (!isSuperAdmin) {
          return (
            <div className="rounded-2xl border border-slate-100 bg-card p-8 text-center">
              <p className="text-sm font-bold text-red-600">
                Akses ditolak. Hanya super admin yang dapat membuka Manajemen
                User.
              </p>
            </div>
          );
        }
        return <UsersSection />;
      case "audit":
        if (!isSuperAdmin) {
          return (
            <div className="rounded-2xl border border-slate-100 bg-card p-8 text-center">
              <p className="text-sm font-bold text-red-600">
                Akses ditolak. Hanya super admin yang dapat membuka Audit Log.
              </p>
            </div>
          );
        }
        return <AuditLogsSection />;
      case "reports":
        return <ReportsSection />;
      case "fakultas":
        return <FakultasSection />;
      case "prodi":
        return <ProdiSection />;
      case "locations":
        return <LocationSection />;
      case "returnApprovals":
        return <ReturnApprovalsSection />;
      case "recommendations":
        return <RecommendationsSection />;
      default:
        return (
          <DashboardSection
            stats={stats}
            onNavigateLoans={() => setActiveMenu("loans")}
          />
        );
    }
  };

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={handleSidebarOpenChange}
      style={
        {
          "--sidebar-width": "19rem",
          "--sidebar-width-icon": "3.75rem",
          "--header-height": "5rem"
        } as React.CSSProperties
      }
    >
      <DashboardSidebar
        activeMenu={activeMenu}
        menus={visibleMenus}
        onMenuChange={setActiveMenu}
        onSignOut={handleSignOut}
        user={session?.user}
      />

      <SidebarInset className="bg-background min-w-0 max-w-full overflow-hidden">
        <header className="sticky top-0 z-10 flex min-h-20 flex-wrap items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <SidebarTrigger className="size-9 rounded-lg border border-border text-foreground hover:bg-muted" />

          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="flex min-w-55 flex-1 items-center gap-3 rounded-2xl bg-muted px-4 py-2.5 text-left text-sm text-muted-foreground transition-all hover:bg-muted/70"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1">Cari menu dashboard...</span>
            <span className="hidden rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
              Ctrl+K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-4 sm:gap-6">
            <ThemeToggle />
            <div className="flex items-center gap-3 border-l border-border pl-4 sm:pl-6">
              <div className="hidden text-right sm:block">
                <p className="leading-tight text-sm font-bold text-foreground">
                  {session?.user?.name || "Admin"}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Super Admin
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted shadow-sm">
                <img
                  src={getUserAvatar(session?.user)}
                  alt={session?.user?.name || "User Avatar"}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10">
          {activeLoading ? (
            <div className="mx-auto max-w-7xl animate-in space-y-8 fade-in duration-500">
              <div className="mb-8 space-y-2 text-left">
                <Skeleton className="h-8 w-62.5 rounded-lg" />
                <Skeleton className="h-4 w-87.5 rounded-md" />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-30 rounded-[24px]" />
                <Skeleton className="h-30 rounded-[24px]" />
                <Skeleton className="h-30 rounded-[24px]" />
                <Skeleton className="h-30 rounded-[24px]" />
              </div>

              <Skeleton className="mt-8 h-100 w-full rounded-[32px]" />
            </div>
          ) : (
            <div className="mx-auto max-w-7xl min-w-0 w-full rounded-3xl border border-border bg-card/70 p-3 shadow-sm backdrop-blur-sm animate-in space-y-8 fade-in duration-500 delay-150 sm:p-5 lg:p-6">
              {renderSection()}
            </div>
          )}
        </div>

        <CommandDialog
          open={isCommandOpen}
          onOpenChange={setIsCommandOpen}
          title="Pencarian Dashboard"
          description="Cari dan pilih tab dashboard"
          className="border border-red-100 dark:border-red-900 bg-card"
        >
          <CommandInput
            placeholder="Ketik nama menu dashboard..."
            className="placeholder:text-muted-foreground"
          />
          <CommandList>
            <CommandEmpty>Menu tidak ditemukan.</CommandEmpty>
            <CommandGroup
              heading="Menu Dashboard"
              className="**:[[cmdk-group-heading]]:text-red-600/80"
            >
              {visibleMenus.map(({ key, label, icon: Icon }) => (
                <CommandItem
                  key={key}
                  value={label}
                  className="data-[selected=true]:bg-red-600 data-[selected=true]:text-white"
                  onSelect={() => {
                    setActiveMenu(key);
                    setSearchTerm("");
                    setIsCommandOpen(false);
                  }}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                  <CommandShortcut className="text-red-500 dark:text-red-400">
                    {activeMenu === key ? "Aktif" : ""}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
