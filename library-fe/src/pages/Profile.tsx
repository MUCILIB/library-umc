import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
import { useToast } from "@/hooks/useToast";
import { API_BASE_URL } from "@/utils/api-config";
import { Settings, Mail, BookMarked, Send, Loader2, Info } from "lucide-react";
import type { AuthUser } from "@/types/auth";

const Profile = () => {
  const navigate = useNavigate();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("peminjaman-aktif");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [cardActionLoading, setCardActionLoading] = useState(false);
  const [activeLoanCount, setActiveLoanCount] = useState(0);
  const [unpaidFineCount, setUnpaidFineCount] = useState(0);
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
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationForm, setRecommendationForm] = useState({
    isbn: "",
    title: "",
    author: "",
    publisher: "",
    reason: ""
  });

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
      const savedIds = JSON.parse(localStorage.getItem("umc_library_bookmarks") || "[]");
      setSavedCount(savedIds.length);
    };
    updateCount();
    window.addEventListener("storage", updateCount);
    return () => {
      window.removeEventListener("storage", updateCount);
    };
  }, []);

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

  const handleSubmitRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !recommendationForm.title ||
      !recommendationForm.author ||
      !recommendationForm.reason
    ) {
      error(
        "Data Belum Lengkap",
        "Judul, Penulis, dan Alasan wajib diisi.",
        4000
      );
      return;
    }

    try {
      setRecommendationLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(recommendationForm)
      });

      const data = await response.json();
      if (!data.success) {
        error(
          "Gagal",
          data.message || "Gagal mengajukan usulan koleksi.",
          5000
        );
        return;
      }

      success("Berhasil", "Usulan koleksi berhasil diajukan.", 3000);
      setRecommendationForm({
        isbn: "",
        title: "",
        author: "",
        publisher: "",
        reason: ""
      });
    } catch (err) {
      console.error("Submit recommendation error:", err);
      error("Error", "Gagal terhubung ke server.", 5000);
    } finally {
      setRecommendationLoading(false);
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
  const userName = profile?.user?.name || authUser?.name || "User";
  const initials = userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  const isLecturerOnly = authUser?.role === "lecturer";
  const isExternal = profile?.memberType === "external" || profile?.isExternal;

  const tabs = [
    {
      id: "peminjaman-aktif",
      label: "Peminjaman Aktif",
      count: activeLoanCount > 0 ? activeLoanCount : null
    },
    { id: "riwayat-peminjaman", label: "Riwayat Peminjaman", count: null },
    {
      id: "tagihan-denda",
      label: "Tagihan & Denda",
      count: unpaidFineCount > 0 ? unpaidFineCount : null
    },
    {
      id: "buku-disimpan",
      label: "Buku Disimpan",
      count: savedCount > 0 ? savedCount : null
    },
    { id: "kartu-member", label: "Kartu Member", count: null },
    ...(isLecturerOnly
      ? [{ id: "usulan-koleksi", label: "Usulan Koleksi", count: null }]
      : []),
    { id: "edit-profil", label: "Pengaturan", icon: <Settings size={14} /> }
  ];

  return (
    <div className="min-h-screen bg-background">
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

      <main className="w-full max-w-7xl mx-auto md:px-8 px-4 pt-10 pb-16">
        {/* Banner with Wavy Pattern placeholder */}
        <div className="relative rounded-t-[24px] overflow-hidden h-36 md:h-44 bg-red-900 shadow-sm">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928l2.105.842c.399.16.812.32 1.25.48a12.82 12.82 0 0 0 4.19.75h14.195a14.28 14.28 0 0 0 3.631-.469L100 20H21.184zM100 0h-5.263l-1.052.42c-10.272 4.11-15.363 5.333-24.63 9.038l-2.105.842c-.399.16-.812.32-1.25.48A12.82 12.82 0 0 1 62.5 11.533H48.305a14.28 14.28 0 0 1-3.631-.469L41.184 10c-.357-.13-.72-.264-1.088-.402l-1.768-.661C28.36 5.347 22.353 4 12 4 1.729 4-3.362 5.222-12.629 8.928l-2.105.842c-.399.16-.812.32-1.25.48A12.82 12.82 0 0 0-20.174 11H-100V0h100z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`
            }}
          />
        </div>

        {/* Profile Card Section */}
        <div className="px-6 md:px-10 -mt-20 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-12 relative z-10">
          <div className="w-40 h-48 md:w-48 md:h-56 bg-card rounded-[32px] shadow-xl border border-slate-50 overflow-hidden flex items-center justify-center p-1 shrink-0">
            <div className="w-full h-full bg-slate-100 rounded-[28px] overflow-hidden flex items-center justify-center">
              {profile?.user?.image ? (
                <img
                  src={profile.user.image}
                  alt={profile.user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-5xl">
                  {initials}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 pb-4 text-center md:text-left flex flex-col items-center md:items-start w-full">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2 underline decoration-red-600/10 underline-offset-8">
              {profile?.user?.name || authUser?.name}
            </h2>
            <p className="text-base md:text-lg text-slate-500 font-bold mb-2">
              {isExternal
                ? profile?.institution || profile?.originRegion || "Umum"
                : profile?.faculty || "Teknik Informatika"}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-widest justify-center md:justify-start">
              <Mail size={14} className="text-primary shrink-0" />
              {profile?.user?.email || authUser?.email}
            </div>
          </div>
        </div>

        {/* Custom Navigation Tabs */}
        <div className="border-b border-slate-100 mb-10 px-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-6 md:gap-10 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-5 text-xs font-black uppercase tracking-[0.15em] transition-all ${
                  activeTab === tab.id
                    ? "text-primary scale-105"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <sup className="ml-1 text-[8px] font-black text-primary">
                    {tab.count}
                  </sup>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
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
              />
            </div>
          )}
          {activeTab === "usulan-koleksi" && isLecturerOnly && (
            <section className="bg-card border border-red-100 rounded-[28px] p-6 md:p-8 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-primary flex items-center justify-center shrink-0">
                  <BookMarked size={22} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    Usul Koleksi Baru
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">
                    Form ini hanya tersedia untuk dosen (lecturer).
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex gap-3">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[13px] text-blue-700 font-medium leading-relaxed">
                  Buku yang diusulkan akan direview oleh tim perpustakaan
                  sebelum diproses menjadi pengadaan koleksi.
                </p>
              </div>

              <form onSubmit={handleSubmitRecommendation} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                      Judul Buku *
                    </label>
                    <input
                      required
                      type="text"
                      value={recommendationForm.title}
                      onChange={(e) =>
                        setRecommendationForm({
                          ...recommendationForm,
                          title: e.target.value
                        })
                      }
                      placeholder="Contoh: Pemrograman Web Modern"
                      className="mt-2 w-full bg-card border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                      Penulis *
                    </label>
                    <input
                      required
                      type="text"
                      value={recommendationForm.author}
                      onChange={(e) =>
                        setRecommendationForm({
                          ...recommendationForm,
                          author: e.target.value
                        })
                      }
                      placeholder="Nama Penulis"
                      className="mt-2 w-full bg-card border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                      Penerbit
                    </label>
                    <input
                      type="text"
                      value={recommendationForm.publisher}
                      onChange={(e) =>
                        setRecommendationForm({
                          ...recommendationForm,
                          publisher: e.target.value
                        })
                      }
                      placeholder="Opsional"
                      className="mt-2 w-full bg-card border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                      ISBN (Opsional)
                    </label>
                    <input
                      type="text"
                      value={recommendationForm.isbn}
                      onChange={(e) =>
                        setRecommendationForm({
                          ...recommendationForm,
                          isbn: e.target.value
                        })
                      }
                      placeholder="Contoh: 978-3-16-148410-0"
                      className="mt-2 w-full bg-card border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                      Alasan Pengadaan *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={recommendationForm.reason}
                      onChange={(e) =>
                        setRecommendationForm({
                          ...recommendationForm,
                          reason: e.target.value
                        })
                      }
                      placeholder="Contoh: Digunakan sebagai referensi mata kuliah semester ini."
                      className="mt-2 w-full bg-card border border-slate-200 rounded-2xl py-3 px-4 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/30 outline-none resize-y"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={recommendationLoading}
                    className="inline-flex items-center justify-center gap-2 bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.18em] shadow-lg shadow-red-200 hover:bg-primary/90 disabled:bg-slate-300 transition-all active:scale-95"
                  >
                    {recommendationLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                    {recommendationLoading ? "Mengirim..." : "Kirim Usulan"}
                  </button>
                </div>
              </form>
            </section>
          )}
          {activeTab === "edit-profil" && (
            <div className="bg-slate-50/50 rounded-3xl sm:rounded-[40px] p-6 sm:p-10 max-w-3xl border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center text-primary">
                  <Settings size={20} />
                </div>
                Pengaturan Profil
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {isExternal ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
                          Institusi
                        </label>
                        <input
                          type="text"
                          value={formData.institution || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, institution: e.target.value })
                          }
                      className="w-full bg-card border border-slate-200 rounded-[20px] py-4 px-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
                      Asal Daerah
                    </label>
                    <input
                      type="text"
                      value={formData.originRegion || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, originRegion: e.target.value })
                      }
                      className="w-full bg-card border border-slate-200 rounded-[20px] py-4 px-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all outline-none"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
                          NIM / NIDN
                        </label>
                        <input
                          type="text"
                          value={formData.nimNidn || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, nimNidn: e.target.value })
                          }
                      className="w-full bg-card border border-slate-200 rounded-[20px] py-4 px-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
                      Fakultas
                    </label>
                    <input
                      type="text"
                      value={formData.faculty || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, faculty: e.target.value })
                      }
                      className="w-full bg-card border border-slate-200 rounded-[20px] py-4 px-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full bg-card border border-slate-200 rounded-[20px] py-4 px-6 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 focus:border-primary/20 transition-all outline-none"
                    placeholder="081234567890"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="bg-primary text-white px-12 py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-200 hover:bg-primary/90 disabled:bg-slate-300 transition-all active:scale-95"
                  >
                    {updateLoading ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
