import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  ArrowLeft,
  Search,
  UserPlus,
  User,
  Building2,
  BookOpen,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

// Tipe data user dari API kampus
interface CampusUser {
  full_name: string;
  nim: string;
  email: string;
  faculty: string;
  prodi: string;
}

export default function AddGuestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<CampusUser[]>([]);

  // Fetch ALL users from Campus API on mount
  useEffect(() => {
    const fetchAllCampusUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/guests/campus`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAllUsers(data.data);
        } else {
          console.error("Failed to fetch campus users:", data.message);
          alert(
            "Gagal memuat data dari API Kampus: " +
              (data.message || "Unknown error"),
          );
        }
      } catch (error) {
        console.error("Error fetching campus users:", error);
        alert("Gagal memuat data. Pastikan backend dan API Kampus terhubung.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllCampusUsers();
  }, []);

  // Client-side search/filter
  const filteredUsers = allUsers.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      (user.full_name || "").toLowerCase().includes(term) ||
      (user.nim || "").toLowerCase().includes(term) ||
      (user.email || "").toLowerCase().includes(term) ||
      (user.faculty || "").toLowerCase().includes(term) ||
      (user.prodi || "").toLowerCase().includes(term)
    );
  });

  // Check In User (Create Guest Log)
  const handleCheckIn = async (user: CampusUser) => {
    setCheckInLoading(user.email);
    try {
      console.log("Attempting check-in for:", user);
      const res = await fetch(`${API_BASE_URL}/api/guests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      console.log("Check-in response:", data);

      if (data.success) {
        alert(`✅ Berhasil Check-In: ${user.full_name}`);
        navigate("/dashboard/super-admin");
      } else {
        // More detailed error message
        const errorMsg = data.message || "Unknown error";
        console.error("Check-in failed:", errorMsg);
        alert(`❌ Gagal Check-In:\n\n${errorMsg}\n\nEmail: ${user.email}`);
      }
    } catch (error) {
      console.error("Error checking in:", error);
      alert(
        `Terjadi kesalahan saat Check-In:\n${error instanceof Error ? error.message : "Network error"}`,
      );
    } finally {
      setCheckInLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#030304] font-body text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="radial-blur-orange w-96 h-96 top-0 right-0"></div>
      <div className="radial-blur-gold w-96 h-96 bottom-0 left-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard/super-admin"
            className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#F7931A] transition-colors duration-300 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-sm">Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-4xl font-heading font-bold gradient-text mb-2">
            Check-In Pengunjung
          </h1>
          <p className="text-[#94A3B8] font-mono">
            Data civitas akademika dari API Kampus - Klik "Check In" untuk
            mencatat kunjungan
          </p>
        </div>

        {/* Search Bar */}
        <div className="card-standard mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, NIM, email, fakultas, atau prodi..."
              className="w-full pl-12 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#F7931A] focus:glow-orange transition-all duration-300"
            />
          </div>
          <div className="mt-3 text-sm text-[#94A3B8] font-mono flex justify-between items-center">
            <span>
              Menampilkan {filteredUsers.length} dari {allUsers.length} data
            </span>
            {loading && (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat data...
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 text-[#F7931A] mx-auto mb-4 animate-spin" />
            <p className="text-[#94A3B8] font-mono">
              Memuat data dari API Kampus...
            </p>
          </div>
        )}

        {/* User List */}
        {!loading && (
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 border border-white/10 rounded-2xl bg-[#0F1115]/50">
                <User className="w-16 h-16 text-[#94A3B8] mx-auto mb-4 opacity-50" />
                <p className="text-[#94A3B8] font-mono">
                  {searchTerm
                    ? "Tidak ada data yang cocok dengan pencarian."
                    : "Tidak ada data tersedia."}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.email}
                  className="card-standard group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-full bg-[#F7931A]/10 border border-[#F7931A]/30 text-[#F7931A] flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-heading font-bold text-white mb-1 truncate">
                        {user.full_name}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-[#94A3B8] font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[#FFD600]">NIM:</span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-semibold">
                            {user.nim || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{user.faculty}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <BookOpen className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{user.prodi}</span>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-[#94A3B8] font-mono truncate">
                        📧 {user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCheckIn(user)}
                    disabled={checkInLoading === user.email}
                    className={`btn-primary min-w-[140px] flex items-center justify-center gap-2 flex-shrink-0 ${
                      checkInLoading === user.email
                        ? "opacity-70 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {checkInLoading === user.email ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Proses...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Check In</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
