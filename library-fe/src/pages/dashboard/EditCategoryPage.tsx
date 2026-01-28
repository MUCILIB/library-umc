import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { ArrowLeft, Save, Loader2, Tag } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

export default function EditCategoryPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
          credentials: "include",
        });
        const data = await res.json();

        if (data.success && data.data) {
          setFormData({
            name: data.data.name,
            description: data.data.description || "",
          });
        } else {
          alert("Kategori tidak ditemukan");
          navigate("/dashboard/super-admin");
        }
      } catch (error) {
        console.error("Error fetching category:", error);
        alert("Gagal memuat data kategori");
        navigate("/dashboard/super-admin");
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Kategori berhasil diperbarui!");
        navigate("/dashboard/super-admin");
      } else {
        alert(`❌ Gagal memperbarui kategori: ${data.message}`);
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Terjadi kesalahan saat memperbarui kategori");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#F7931A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030304] font-body text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="radial-blur-orange w-96 h-96 top-0 right-0"></div>
      <div className="radial-blur-gold w-96 h-96 bottom-0 left-0"></div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard/super-admin"
            className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-[#F7931A]/10 border border-[#F7931A]/30 text-[#F7931A]">
              <Tag className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-white">
                Edit Kategori
              </h1>
              <p className="text-[#94A3B8] font-mono">
                Perbarui informasi kategori
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card-standard space-y-6">
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-mono font-semibold text-white mb-2"
            >
              Nama Kategori <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input-field"
              placeholder="Contoh: Teknologi Informasi"
            />
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-mono font-semibold text-white mb-2"
            >
              Deskripsi <span className="text-[#94A3B8]">(Opsional)</span>
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input-field resize-none"
              placeholder="Deskripsi kategori..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Simpan Perubahan
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/super-admin")}
              className="btn-secondary flex-1"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
