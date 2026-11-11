import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/Footer";
import { authClient } from "@/utils/auth-client";
import memberService, {
  type MemberProfile,
  type UpdateProfilePayload
} from "@/services/memberService";
import loanService from "@/services/loanService";
import fineService from "@/services/fineService";
import RiwayatPeminjaman from "@/components/RiwayatPeminjaman";
import FinesList from "@/components/FinesList";
import MemberCard from "@/components/MemberCard";
import SavedBooksTab from "@/components/SavedBooksTab";
import LecturerRecommendationList from "@/components/LecturerRecommendationList";
import { useToast } from "@/hooks/useToast";
import { getSavedBookIds } from "@/utils/bookmarks";
import { Settings, Mail, BookOpen, Clock, AlertCircle, Bookmark, CreditCard, Sparkles, ChevronRight, ChevronDown, Check, SlidersHorizontal, Camera, Loader2 } from "lucide-react";
import type { AuthUser } from "@/types/auth";
import { getUserAvatar } from "@/lib/avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam === "loans" || tabParam === "riwayat-peminjaman"
      ? "riwayat-peminjaman"
      : tabParam || "peminjaman-aktif"
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cardActionLoading, setCardActionLoading] = useState(false);
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [activeLoanCount, setActiveLoanCount] = useState(0);
  const [unpaidFineCount, setUnpaidFineCount] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const { success, error } = useToast();
  const currentUserId = session?.user?.id;

  const [formData, setFormData] = useState<UpdateProfilePayload>({
    nimNidn: "",
    faculty: "",
    originRegion: "",
    institution: "",
    phone: ""
  });

  useEffect(() => {
    if (tabParam) {
      if (tabParam === "repositori-skripsi" || tabParam === "repository") {
        navigate("/my-repository", { replace: true });
        return;
      }
      if (tabParam === "loans" || tabParam === "riwayat-peminjaman") {
        setActiveTab("riwayat-peminjaman");
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam, navigate]);

  useEffect(() => {
    const currentUserId = session?.user?.id;

    // Reset profile snapshot when account context changes.
    setProfile(null);
    setFormData({
      nimNidn: "",
      faculty: "",
      originRegion: "",
      institution: "",
      phone: ""
    });

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await memberService.getMyProfile();
        if (currentUserId && data.user?.id && data.user.id !== currentUserId) {
          return;
        }
        setProfile(data);
        setFormData({
          nimNidn: data.nimNidn || "",
          faculty: data.faculty || "",
          originRegion: data.originRegion || "",
          institution: data.institution || "",
          phone: data.phone || ""
        });
      } catch (err) {
        console.error("Profile fetch error:", err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchProfile();
    } else if (!sessionLoading && !session) {
      navigate("/login");
    }
  }, [session, sessionLoading, navigate]);

  useEffect(() => {
    const updateCount = () => {
      const savedIds = getSavedBookIds(currentUserId);
      setSavedCount(savedIds.length);
    };
    updateCount();
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("storage", updateCount);
    };
  }, [currentUserId]);

  useEffect(() => {
    const fetchProfileCounters = async () => {
      try {
        if (!currentUserId) {
          setActiveLoanCount(0);
          setUnpaidFineCount(0);
          return;
        }

        const [loans, fines] = await Promise.all([
          loanService.getMyLoanHistory(),
          fineService.getMyFines()
        ]);

        const activeLoans = loans.filter((loan) =>
          ["pending", "approved", "extended"].includes(loan.status)
        ).length;
        const unpaidFines = fines.filter(
          (fine) => fine.status === "unpaid"
        ).length;

        setActiveLoanCount(activeLoans);
        setUnpaidFineCount(unpaidFines);
      } catch (err) {
        console.error("Failed to fetch profile counters:", err);
        setActiveLoanCount(0);
        setUnpaidFineCount(0);
      }
    };

    void fetchProfileCounters();
  }, [currentUserId]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdateLoading(true);
      const payload: UpdateProfilePayload = isExternal
        ? {
            institution: formData.institution,
            originRegion: formData.originRegion,
            phone: formData.phone
          }
        : {
            nimNidn: formData.nimNidn,
            faculty: formData.faculty,
            phone: formData.phone
          };
      const updated = await memberService.updateMyProfile(payload);
      setProfile(updated);
      success("Berhasil", "Profil berhasil diperbarui", 3000);
    } catch (err) {
      console.error("Update profile error:", err);
      error("Gagal", "Gagal memperbarui profil", 5000);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      error("Format berkas harus berupa gambar (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error("Ukuran foto maksimal 5MB");
      return;
    }

    try {
      setAvatarUploading(true);
      const res = await memberService.uploadMyAvatar(file);
      success("Foto profil berhasil diperbarui");
      // Update local state profil
      if (profile && profile.user) {
        setProfile({
          ...profile,
          user: {
            ...profile.user,
            image: res.url
          }
        });
      }
    } catch (err: any) {
      error(err.message || "Gagal mengunggah foto profil");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleRequestCard = async () => {
    try {
      setCardActionLoading(true);
      const updatedProfile = await memberService.requestMyMemberCard();
      setProfile(updatedProfile);
      success(
        "Pengajuan Berhasil",
        "Pengajuan kartu member berhasil dikirim ke admin",
        3000
      );
    } catch (err) {
      console.error("Request card error:", err);
      error("Gagal", "Gagal mengajukan kartu member", 5000);
    } finally {
      setCardActionLoading(false);
    }
  };

  const handleRequestRenewal = async () => {
    try {
      setRenewalLoading(true);
      const updatedProfile = await memberService.requestCardRenewal();
      setProfile(updatedProfile);
      success(
        "Pengajuan Berhasil",
        "Pengajuan perpanjangan kartu member berhasil dikirim ke admin",
        3000
      );
    } catch (err: any) {
      console.error("Request renewal error:", err);
      error("Gagal", err.message || "Gagal mengajukan perpanjangan kartu member", 5000);
    } finally {
      setRenewalLoading(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-700"></div>
      </div>
    );
  }

  const authUser = session?.user as AuthUser | undefined;
  const isLecturerOnly = authUser?.role === "lecturer" || authUser?.role === "dosen";
  const isExternal = profile?.memberType === "external" || profile?.isExternal;

  const tabs = [
    {
      id: "peminjaman-aktif",
      label: "Peminjaman Aktif",
      icon: <BookOpen size={16} className="shrink-0" />,
      count: activeLoanCount > 0 ? activeLoanCount : null
    },
    {
      id: "riwayat-peminjaman",
      label: "Riwayat Peminjaman",
      icon: <Clock size={16} className="shrink-0" />,
      count: null
    },
    {
      id: "tagihan-denda",
      label: "Tagihan & Denda",
      icon: <AlertCircle size={16} className="shrink-0" />,
      count: unpaidFineCount > 0 ? unpaidFineCount : null
    },
    {
      id: "buku-disimpan",
      label: "Buku Disimpan",
      icon: <Bookmark size={16} className="shrink-0" />,
      count: savedCount > 0 ? savedCount : null
    },
    {
      id: "kartu-member",
      label: "Kartu Member",
      icon: <CreditCard size={16} className="shrink-0" />,
      count: null
    },
    ...(isLecturerOnly
      ? [{ id: "usulan-koleksi", label: "Usulan Koleksi", icon: <Sparkles size={16} className="shrink-0" />, count: null }]
      : []),
    {
      id: "edit-profil",
      label: "Pengaturan Akun",
      icon: <Settings size={16} className="shrink-0" />,
      count: null
    }
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
        {/* Banner with Refined Brand Gradient */}
        <div className="relative rounded-2xl overflow-hidden h-32 sm:h-40 bg-gradient-to-r from-primary/10 via-accent to-background border border-border shadow-xs">
          <div className="absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] [background-size:16px_16px] text-primary/10" />
          <div className="absolute bottom-3 left-4 sm:left-6 text-[11px] font-mono tracking-widest text-primary/80 uppercase font-semibold">
            Identitas Anggota Perpustakaan
          </div>
        </div>

        {/* Master Identity Card */}
        <div className="px-3 sm:px-6 -mt-12 sm:-mt-16 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 mb-8 relative z-10">
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full transition-transform hover:scale-105 active:scale-95 block"
              title="Klik untuk memperbesar foto profil"
            >
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 rounded-full ring-4 ring-background shadow-lg border-2 border-border overflow-hidden bg-muted">
                <AvatarImage
                  src={getUserAvatar(profile?.user || authUser)}
                  alt={profile?.user?.name || authUser?.name || "User"}
                  className="object-cover w-full h-full"
                />
                <AvatarFallback className="text-xl font-bold bg-muted text-foreground">
                  {(profile?.user?.name || authUser?.name || "U")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>

            <label
              htmlFor="avatar-upload-input"
              className="absolute bottom-0 right-0 p-2 sm:p-2.5 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 cursor-pointer transition-transform hover:scale-105 active:scale-95 flex items-center justify-center border-2 border-background"
              title="Ubah Foto Profil"
            >
              {avatarUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Camera size={16} />
              )}
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={avatarUploading}
                onChange={handleAvatarFileChange}
              />
            </label>
          </div>
          <div className="flex-1 pb-1 text-center sm:text-left flex flex-col items-center sm:items-start w-full">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {profile?.user?.name || authUser?.name}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border border-border bg-muted text-muted-foreground">
                {profile?.memberType || authUser?.role || "Member"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-2">
              {isExternal
                ? profile?.institution || profile?.originRegion || "Umum"
                : profile?.faculty || "Fakultas Belum Diatur"}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Mail size={12} className="text-primary shrink-0" />
              <span>{profile?.user?.email || authUser?.email}</span>
            </div>
          </div>
        </div>

        {/* MOBILE NAVIGATION: Simple Collapsible Menu (Muncul ketika diklik) */}
        <div className="block lg:hidden mb-5">
          <div className="bg-card border border-border rounded-2xl p-2 shadow-2xs">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-full flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-muted/50 transition-colors text-left cursor-pointer"
              aria-expanded={isMobileMenuOpen}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {currentTab.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground leading-none mb-1">
                    Menu Anggota
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground truncate">
                      {currentTab.label}
                    </span>
                    {currentTab.count !== null && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground">
                        {currentTab.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/80 text-foreground border border-border/80 text-xs font-bold shrink-0">
                <SlidersHorizontal size={12} className="text-primary" />
                <span>{isMobileMenuOpen ? "Tutup" : "Pilih Menu"}</span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 text-muted-foreground ${
                    isMobileMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Menu List: Muncul simpel hanya ketika diklik */}
            {isMobileMenuOpen && (
              <div className="mt-2 pt-2 border-t border-border/70 space-y-1 animate-fade-in">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? "text-primary-foreground" : "text-muted-foreground"}>
                          {tab.icon}
                        </span>
                        <span>{tab.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {tab.count !== null && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                              isActive
                                ? "bg-background text-foreground"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                        {isActive && <Check size={14} className="shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT FOR DESKTOP (Master-Detail Structure) */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* DESKTOP SIDEBAR NAVIGATION (Col 4 of 12) */}
          <aside className="hidden lg:block lg:col-span-4 bg-card border border-border rounded-xl p-3 shadow-xs sticky top-20">
            <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground border-b border-border/60 mb-2">
              Navigasi Keanggotaan
            </div>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? "text-primary-foreground" : "text-muted-foreground"}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {tab.count !== null && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isActive
                              ? "bg-background text-foreground"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${
                          isActive ? "translate-x-0.5 opacity-100" : "opacity-40"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* MAIN CONTENT AREA (Col 8 of 12 on Desktop, Full on Mobile) */}
          <section className="lg:col-span-8 w-full min-h-[500px]">
            {activeTab === "peminjaman-aktif" && (
              <RiwayatPeminjaman type="active" view="grid" />
            )}
            {activeTab === "riwayat-peminjaman" && (
              <RiwayatPeminjaman type="history" view="table" />
            )}
            {activeTab === "tagihan-denda" && <FinesList />}
            {activeTab === "buku-disimpan" && <SavedBooksTab />}
            {activeTab === "kartu-member" && (
              <div className="flex justify-center">
                <MemberCard
                  profile={profile}
                  requestLoading={cardActionLoading}
                  onRequestCard={handleRequestCard}
                  renewalLoading={renewalLoading}
                  onRequestRenewal={handleRequestRenewal}
                />
              </div>
            )}
            {activeTab === "usulan-koleksi" && isLecturerOnly && (
              <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-xs">
                <LecturerRecommendationList />
              </div>
            )}
            {activeTab === "edit-profil" && (
              <div className="bg-card rounded-xl p-6 sm:p-8 border border-border shadow-xs">
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-border">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Pengaturan Profil
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Perbarui data identitas keanggotaan dan nomor kontak aktif Anda
                    </p>
                  </div>
                  <div className="p-2 bg-muted rounded-md text-foreground">
                    <Settings size={18} />
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-5">
                    {isExternal ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">
                            Institusi / Asal
                          </label>
                          <input
                            type="text"
                            value={formData.institution || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, institution: e.target.value })
                            }
                            className="w-full bg-background border border-input rounded-md py-2.5 px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground"
                            placeholder="Universitas / Instansi"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">
                            Asal Daerah
                          </label>
                          <input
                            type="text"
                            value={formData.originRegion || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, originRegion: e.target.value })
                            }
                            className="w-full bg-background border border-input rounded-md py-2.5 px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground"
                            placeholder="Kota / Kabupaten"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>NIM / NIDN</span>
                            <span className="text-[10px] text-muted-foreground font-mono">Min 4 karakter</span>
                          </label>
                          <input
                            type="text"
                            value={formData.nimNidn || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, nimNidn: e.target.value })
                            }
                            className="w-full bg-background border border-input rounded-md py-2.5 px-3.5 text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground"
                            placeholder="22010199"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">
                            Fakultas
                          </label>
                          <input
                            type="text"
                            value={formData.faculty || ""}
                            onChange={(e) =>
                              setFormData({ ...formData, faculty: e.target.value })
                            }
                            className="w-full bg-background border border-input rounded-md py-2.5 px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground"
                            placeholder="Fakultas Teknik"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Nomor WhatsApp / Telepon
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-background border border-input rounded-md py-2.5 px-3.5 text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all placeholder:text-muted-foreground"
                      placeholder="081234567890"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-border">
                    <p className="text-[11px] text-muted-foreground">
                      Pastikan nomor kontak dan NIM/NIDN sesuai dengan data kampus.
                    </p>
                    <button
                      type="submit"
                      disabled={updateLoading}
                      className="inline-flex items-center justify-center bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold text-xs tracking-wide hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98] shadow-xs cursor-pointer"
                    >
                      {updateLoading ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Dialog Preview Foto Profil */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-card border-border">
          <DialogHeader className="mb-4 text-center sm:text-left">
            <DialogTitle className="text-base font-bold text-foreground">
              Foto Profil
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden border border-border shadow-md bg-muted flex items-center justify-center">
              <img
                src={getUserAvatar(profile?.user || authUser)}
                alt={profile?.user?.name || authUser?.name || "Foto Profil"}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground text-center font-medium">
              {profile?.user?.name || authUser?.name}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Profile;
