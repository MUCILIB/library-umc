import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Tag } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

export default function AddCategoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        alert("Kategori berhasil ditambahkan!");
        navigate("/dashboard/super-admin");
      } else {
        alert("Gagal menambahkan kategori: " + data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat menambahkan kategori");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030304] font-body text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="radial-blur-orange w-96 h-96 top-0 right-0"></div>
      <div className="radial-blur-gold w-96 h-96 bottom-0 left-0"></div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
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
            Tambah Kategori Baru
          </h1>
          <p className="text-[#94A3B8] font-mono">
            Buat kategori baru untuk mengorganisir koleksi perpustakaan
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card-standard space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-lg bg-[#F7931A]/20 border border-[#F7931A]/50 glow-orange">
                <Tag className="w-6 h-6 text-[#F7931A]" />
              </div>
              <h3 className="font-heading font-semibold text-lg">
                Informasi Kategori
              </h3>
            </div>

            <div>
              <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                Nama Kategori *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input-technical w-full rounded-lg"
                placeholder="Contoh: Fiksi, Non-Fiksi, Teknologi, dll."
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="input-technical w-full rounded-lg min-h-[120px] resize-none"
                placeholder="Deskripsi kategori (opsional)"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Link to="/dashboard/super-admin" className="btn-outline">
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan...
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4" />
                  Simpan Kategori
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
