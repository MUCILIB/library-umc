import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "react-router";
import Modal from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Plus, Book, Users, TrendingUp, Search, Filter } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

// Modular Components
import StatsCards from "@/components/dashboard/StatsCards";
import CollectionGrid from "@/components/dashboard/CollectionGrid";
import CollectionForm from "@/components/dashboard/CollectionForm";

// Types
interface Collection {
  id: number;
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

export default function SuperAdminDashboard() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isPending && !session) {
      navigate("/login");
    }
  }, [session, isPending, navigate]);

  const fetchCollections = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/collections`);
      const data = await res.json();
      if (data.success) {
        setCollections(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch collections", error);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const filteredCollections = collections.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            MUCILIB Admin
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl"
          >
            <Book className="w-5 h-5" />
            Manajemen Koleksi
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <Users className="w-5 h-5" />
            Anggota
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            Laporan
          </a>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
              {session?.user?.name?.[0] || "A"}
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-900">
                {session?.user?.name || "Admin"}
              </p>
              <p className="text-gray-500 text-xs">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">Koleksi Pustaka</h2>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Koleksi
            </Button>
          </div>
        </header>

        <div className="p-8 space-y-8">
          {/* Stats Cards */}
          <StatsCards
            totalCollections={collections.length}
            loanedCount={12} // Mock data for now
          />

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari buku berdasarkan judul atau penulis..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
          </div>

          {/* Grid Content */}
          <CollectionGrid collections={filteredCollections} />
        </div>
      </main>

      {/* Modal Add Book */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <div className="bg-white p-8 rounded-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Tambah Koleksi Baru
              </h3>
              <p className="text-gray-500 mt-1">
                Isi detail buku atau koleksi yang ingin ditambahkan
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>

          <CollectionForm
            onSuccess={() => {
              setIsOpen(false);
              fetchCollections();
            }}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      </Modal>
    </div>
  );
}
