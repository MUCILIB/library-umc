import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useNavigate, Link } from "react-router";
import {
  Book,
  Users,
  TrendingUp,
  Search,
  Plus,
  Tag,
  UserPlus,
  LogOut,
  Home,
  Calendar,
  Trash2,
  Edit,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

// Types
interface Collection {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: string;
  type: string;
  category: {
    name: string;
  };
  image: string | null;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

interface GuestLog {
  id: string;
  name: string;
  email: string;
  identifier: string;
  faculty: string;
  major: string;
  visitDate: string;
}

interface Stats {
  totalCollections: number;
  totalCategories: number;
  totalGuests: number;
}

export default function SuperAdminDashboard() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [guests, setGuests] = useState<GuestLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCollections: 0,
    totalCategories: 0,
    totalGuests: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<
    "collections" | "categories" | "guests"
  >("collections");

  const fetchData = async () => {
    try {
      // 1. Fetch Collections
      const collectionsRes = await fetch(`${API_BASE_URL}/api/collections`);
      const collectionsData = await collectionsRes.json();
      const collectionsList = collectionsData.success
        ? collectionsData.data
        : [];
      setCollections(collectionsList);

      // 2. Fetch Categories
      const categoriesRes = await fetch(`${API_BASE_URL}/api/categories`);
      const categoriesData = await categoriesRes.json();
      const categoriesList = categoriesData.success ? categoriesData.data : [];
      setCategories(categoriesList);

      // 3. Fetch Guest Logs
      let guestsList: GuestLog[] = [];
      try {
        const guestsRes = await fetch(`${API_BASE_URL}/api/guests`, {
          credentials: "include",
        });
        const guestsData = await guestsRes.json();

        if (guestsData.success && Array.isArray(guestsData.data)) {
          guestsList = guestsData.data;
          setGuests(guestsList);
        }
      } catch (guestError) {
        console.error("Failed to fetch guest logs:", guestError);
      }

      setStats({
        totalCollections: collectionsList.length,
        totalCategories: categoriesList.length,
        totalGuests: guestsList.length,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCollections = collections.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCategories = categories.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredGuests = guests.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.faculty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.major.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Kategori "${name}" berhasil dihapus`);
        fetchData(); // Refresh data
      } else {
        alert(`❌ Gagal menghapus kategori: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Terjadi kesalahan saat menghapus kategori");
    }
  };

  const handleDeleteCollection = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus koleksi "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/collections/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Koleksi "${title}" berhasil dihapus`);
        fetchData(); // Refresh data
      } else {
        alert(`❌ Gagal menghapus koleksi: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting collection:", error);
      alert("Terjadi kesalahan saat menghapus koleksi");
    }
  };

  const handleDeleteGuest = async (id: string, name: string) => {
    if (
      !confirm(`Apakah Anda yakin ingin menghapus log pengunjung "${name}"?`)
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/guests/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Log pengunjung "${name}" berhasil dihapus`);
        fetchData(); // Refresh data
      } else {
        alert(`❌ Gagal menghapus log: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting guest log:", error);
      alert("Terjadi kesalahan saat menghapus log pengunjung");
    }
  };

  return (
    <div className="min-h-screen bg-[#030304] flex font-body text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="radial-blur-orange w-96 h-96 top-0 right-0"></div>
      <div className="radial-blur-gold w-96 h-96 bottom-0 left-0"></div>

      {/* Sidebar */}
      <aside className="w-72 bg-[#0F1115] border-r border-white/10 hidden lg:flex flex-col relative z-10">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-heading font-bold gradient-text">
            MUCILIB Admin
          </h1>
          <p className="text-[#94A3B8] text-xs font-mono mt-1 uppercase tracking-wider">
            Super Admin Panel
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 text-sm font-mono text-[#94A3B8] hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
          >
            <Home className="w-5 h-5" />
            Home
          </Link>
          <button
            onClick={() => setActiveTab("collections")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-mono rounded-xl transition-all duration-300 ${
              activeTab === "collections"
                ? "text-[#F7931A] bg-[#F7931A]/10 border border-[#F7931A]/30 glow-orange"
                : "text-[#94A3B8] hover:text-white hover:bg-white/5"
            }`}
          >
            <Book className="w-5 h-5" />
            Koleksi Pustaka
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-mono rounded-xl transition-all duration-300 ${
              activeTab === "categories"
                ? "text-[#F7931A] bg-[#F7931A]/10 border border-[#F7931A]/30 glow-orange"
                : "text-[#94A3B8] hover:text-white hover:bg-white/5"
            }`}
          >
            <Tag className="w-5 h-5" />
            Kategori
          </button>
          <button
            onClick={() => setActiveTab("guests")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-mono rounded-xl transition-all duration-300 ${
              activeTab === "guests"
                ? "text-[#F7931A] bg-[#F7931A]/10 border border-[#F7931A]/30 glow-orange"
                : "text-[#94A3B8] hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-5 h-5" />
            Pengunjung
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="glass rounded-xl p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white font-heading font-bold">
                {session?.user?.name?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-medium text-sm text-white truncate">
                  {session?.user?.name || "Admin"}
                </p>
                <p className="text-[#94A3B8] text-xs font-mono uppercase tracking-wider">
                  Super Admin
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-mono text-[#94A3B8] hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Header */}
        <header className="glass sticky top-0 z-20 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-heading font-bold text-white">
              {activeTab === "collections" && "Koleksi Pustaka"}
              {activeTab === "categories" && "Kategori Buku"}
              {activeTab === "guests" && "Data Pengunjung"}
            </h2>
            <p className="text-[#94A3B8] text-sm font-mono mt-1">
              Manage your library {activeTab}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === "collections" && (
              <Link
                to="/dashboard/super-admin/collections/add"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Koleksi
              </Link>
            )}
            {activeTab === "categories" && (
              <Link
                to="/dashboard/super-admin/categories/add"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Kategori
              </Link>
            )}
            {activeTab === "guests" && (
              <Link
                to="/dashboard/super-admin/guests/add"
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Tambah Pengunjung
              </Link>
            )}
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-standard group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-[#F7931A]/20 border border-[#F7931A]/50 group-hover:glow-orange transition-all duration-300">
                  <Book className="w-6 h-6 text-[#F7931A]" />
                </div>
                <TrendingUp className="w-5 h-5 text-[#FFD600]" />
              </div>
              <h3 className="text-[#94A3B8] text-sm font-mono uppercase tracking-wider mb-2">
                Total Koleksi
              </h3>
              <p className="text-4xl font-heading font-bold gradient-text">
                {stats.totalCollections}
              </p>
            </div>

            <div className="card-standard group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-[#F7931A]/20 border border-[#F7931A]/50 group-hover:glow-orange transition-all duration-300">
                  <Tag className="w-6 h-6 text-[#F7931A]" />
                </div>
                <TrendingUp className="w-5 h-5 text-[#FFD600]" />
              </div>
              <h3 className="text-[#94A3B8] text-sm font-mono uppercase tracking-wider mb-2">
                Total Kategori
              </h3>
              <p className="text-4xl font-heading font-bold gradient-text">
                {stats.totalCategories}
              </p>
            </div>

            <div className="card-standard group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-[#F7931A]/20 border border-[#F7931A]/50 group-hover:glow-orange transition-all duration-300">
                  <Users className="w-6 h-6 text-[#F7931A]" />
                </div>
                <TrendingUp className="w-5 h-5 text-[#FFD600]" />
              </div>
              <h3 className="text-[#94A3B8] text-sm font-mono uppercase tracking-wider mb-2">
                Total Pengunjung
              </h3>
              <p className="text-4xl font-heading font-bold gradient-text">
                {stats.totalGuests}
              </p>
            </div>
          </div>

          {/* Search Bar - Shared for Collections and Categories */}
          {(activeTab === "collections" || activeTab === "categories") && (
            <div className="glass rounded-xl p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "collections"
                      ? "Cari buku berdasarkan judul atau penulis..."
                      : "Cari kategori..."
                  }
                  className="w-full pl-12 pr-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#F7931A] focus:glow-orange transition-all duration-300"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* COLLECTIONS VIEW */}
          {activeTab === "collections" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection) => (
                <div key={collection.id} className="card-standard group">
                  <div className="aspect-[3/4] bg-black/50 rounded-lg mb-4 overflow-hidden relative">
                    {collection.image ? (
                      <img
                        src={collection.image}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Book className="w-16 h-16 text-[#94A3B8]" />
                      </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            `/dashboard/collections/edit/${collection.id}`,
                          )
                        }
                        className="p-2 bg-white/10 hover:bg-[#FFD600] rounded-full text-white transition-colors"
                        title="Edit Koleksi"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCollection(
                            collection.id,
                            collection.title,
                          )
                        }
                        className="p-2 bg-white/10 hover:bg-red-500 rounded-full text-white transition-colors"
                        title="Hapus Koleksi"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-heading font-semibold text-lg text-white line-clamp-2">
                      {collection.title}
                    </h3>
                    <p className="text-[#94A3B8] text-sm font-mono">
                      {collection.author}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#F7931A]/20 border border-[#F7931A]/50 text-[#F7931A] text-xs font-mono uppercase tracking-wider">
                        {collection.category?.name || "Uncategorized"}
                      </span>
                      <span className="text-[#94A3B8] text-xs font-mono">
                        {collection.publicationYear}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCollections.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#94A3B8] font-mono">
                  <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  Tidak ada koleksi ditemukan.
                </div>
              )}
            </div>
          )}

          {/* CATEGORIES VIEW */}
          {activeTab === "categories" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="card-standard group relative hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-[#F7931A]/10 border border-[#F7931A]/30 text-[#F7931A]">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          navigate(`/dashboard/categories/edit/${category.id}`)
                        }
                        className="text-[#94A3B8] hover:text-[#FFD600] transition-colors"
                        title="Edit Kategori"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteCategory(category.id, category.name)
                        }
                        className="text-[#94A3B8] hover:text-red-500 transition-colors"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-white mb-2">
                    {category.name}
                  </h3>
                  <p className="text-[#94A3B8] text-sm font-mono line-clamp-2 mb-4 h-10">
                    {category.description || "Tidak ada deskripsi"}
                  </p>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-[#94A3B8] font-mono">
                    <span>ID: {category.id}</span>
                    <span>
                      {new Date(category.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {filteredCategories.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#94A3B8] font-mono">
                  <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  Tidak ada kategori ditemukan.
                </div>
              )}
            </div>
          )}

          {/* GUESTS VIEW */}
          {activeTab === "guests" && (
            <div className="space-y-6">
              {/* Table Container */}
              <div className="card-standard overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 text-[#94A3B8] font-mono text-sm font-semibold">
                          Nama
                        </th>
                        <th className="text-left p-4 text-[#94A3B8] font-mono text-sm font-semibold">
                          NIM/NIDN
                        </th>
                        <th className="text-left p-4 text-[#94A3B8] font-mono text-sm font-semibold">
                          Email
                        </th>
                        <th className="text-left p-4 text-[#94A3B8] font-mono text-sm font-semibold">
                          Fakultas
                        </th>
                        <th className="text-left p-4 text-[#94A3B8] font-mono text-sm font-semibold">
                          Prodi
                        </th>
                        <th className="text-left p-4 text-[#94A3B8] font-mono text-sm font-semibold">
                          Tanggal Kunjungan
                        </th>
                        <th className="text-center p-4 text-[#94A3B8] font-mono text-sm font-semibold">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((guest) => (
                        <tr
                          key={guest.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-[#F7931A]/10 border border-[#F7931A]/30 text-[#F7931A]">
                                <Users className="w-4 h-4" />
                              </div>
                              <span className="text-white font-medium">
                                {guest.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#FFD600] font-mono text-sm">
                              {guest.identifier}
                            </span>
                          </td>
                          <td className="p-4 text-[#94A3B8] font-mono text-sm">
                            {guest.email}
                          </td>
                          <td className="p-4 text-white font-mono text-sm">
                            {guest.faculty}
                          </td>
                          <td className="p-4 text-[#94A3B8] font-mono text-sm">
                            {guest.major}
                          </td>
                          <td className="p-4 text-[#94A3B8] font-mono text-sm">
                            {new Date(guest.visitDate).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() =>
                                handleDeleteGuest(guest.id, guest.name)
                              }
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 hover:border-red-500 transition-all"
                              title="Hapus Log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {filteredGuests.length === 0 && (
                  <div className="py-12 text-center text-[#94A3B8] font-mono">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    {searchTerm
                      ? "Tidak ada pengunjung yang cocok dengan pencarian."
                      : "Belum ada data pengunjung."}
                  </div>
                )}
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card-standard">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-[#F7931A]/10 border border-[#F7931A]/30 text-[#F7931A]">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[#94A3B8] text-sm font-mono">
                        Total Pengunjung
                      </p>
                      <p className="text-2xl font-heading font-bold text-white">
                        {guests.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card-standard">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-[#FFD600]/10 border border-[#FFD600]/30 text-[#FFD600]">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[#94A3B8] text-sm font-mono">
                        Hari Ini
                      </p>
                      <p className="text-2xl font-heading font-bold text-white">
                        {
                          guests.filter((g) => {
                            const today = new Date();
                            const visitDate = new Date(g.visitDate);
                            return (
                              visitDate.toDateString() === today.toDateString()
                            );
                          }).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card-standard">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[#94A3B8] text-sm font-mono">
                        Bulan Ini
                      </p>
                      <p className="text-2xl font-heading font-bold text-white">
                        {
                          guests.filter((g) => {
                            const now = new Date();
                            const visitDate = new Date(g.visitDate);
                            return (
                              visitDate.getMonth() === now.getMonth() &&
                              visitDate.getFullYear() === now.getFullYear()
                            );
                          }).length
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
