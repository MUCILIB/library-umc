import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { ArrowLeft, Save, Loader2, Book, Upload, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

interface Category {
  id: number;
  name: string;
}

export default function EditCollectionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentImage, setCurrentImage] = useState<string>("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publisher: "",
    publicationYear: "",
    isbn: "",
    categoryId: "",
    description: "",
    type: "physical_book" as "physical_book" | "ebook" | "journal" | "thesis",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesRes = await fetch(`${API_BASE_URL}/api/categories`);
        const categoriesData = await categoriesRes.json();
        if (categoriesData.success) {
          setCategories(categoriesData.data || []);
        }

        // Fetch collection
        const collectionRes = await fetch(
          `${API_BASE_URL}/api/collections/${id}`,
          {
            credentials: "include",
          },
        );
        const collectionData = await collectionRes.json();

        if (collectionData.success && collectionData.data) {
          const collection = collectionData.data;
          setFormData({
            title: collection.title || "",
            author: collection.author || "",
            publisher: collection.publisher || "",
            publicationYear: collection.publicationYear || "",
            isbn: collection.isbn || "",
            categoryId: collection.categoryId?.toString() || "",
            description: collection.description || "",
            type: collection.type || "physical_book",
          });
          setCurrentImage(collection.image || "");
        } else {
          alert("Koleksi tidak ditemukan");
          navigate("/dashboard/super-admin");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Gagal memuat data");
        navigate("/dashboard/super-admin");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveNewImage = () => {
    setNewImageFile(null);
    setImagePreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("title", formData.title);
      submitData.append("author", formData.author);
      submitData.append("publisher", formData.publisher);
      submitData.append("publicationYear", formData.publicationYear);
      submitData.append("isbn", formData.isbn);
      submitData.append("categoryId", formData.categoryId);
      submitData.append("description", formData.description);
      submitData.append("type", formData.type);

      if (newImageFile) {
        submitData.append("cover", newImageFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/collections/${id}`, {
        method: "PATCH",
        credentials: "include",
        body: submitData,
      });

      const data = await res.json();

      if (data.success) {
        alert("✅ Koleksi berhasil diperbarui!");
        navigate("/dashboard/super-admin");
      } else {
        alert(`❌ Gagal memperbarui koleksi: ${data.message}`);
      }
    } catch (error) {
      console.error("Error updating collection:", error);
      alert("Terjadi kesalahan saat memperbarui koleksi");
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
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
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
              <Book className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-white">
                Edit Koleksi
              </h1>
              <p className="text-[#94A3B8] font-mono">
                Perbarui informasi koleksi buku
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card-standard space-y-6">
            <h2 className="text-xl font-heading font-bold text-white border-b border-white/10 pb-4">
              Informasi Dasar
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="input-field"
                  placeholder="Judul buku/koleksi"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  Penulis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  className="input-field"
                  placeholder="Nama penulis"
                />
              </div>

              {/* Publisher */}
              <div>
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  Penerbit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.publisher}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                  className="input-field"
                  placeholder="Nama penerbit"
                />
              </div>

              {/* Publication Year */}
              <div>
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  Tahun Terbit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.publicationYear}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      publicationYear: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="2024"
                />
              </div>

              {/* ISBN */}
              <div>
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  ISBN
                </label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) =>
                    setFormData({ ...formData, isbn: e.target.value })
                  }
                  className="input-field"
                  placeholder="978-xxx-xxx-xxx-x"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  Tipe Koleksi <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as typeof formData.type,
                    })
                  }
                  className="input-field"
                >
                  <option value="physical_book">Buku Fisik</option>
                  <option value="ebook">E-Book</option>
                  <option value="journal">Jurnal</option>
                  <option value="thesis">Skripsi/Tesis</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-mono font-semibold text-white mb-2">
                  Deskripsi
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="input-field resize-none"
                  placeholder="Deskripsi singkat tentang koleksi..."
                />
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="card-standard space-y-4">
            <h2 className="text-xl font-heading font-bold text-white border-b border-white/10 pb-4">
              Cover Image
            </h2>

            {/* Current Image */}
            {currentImage && !imagePreview && (
              <div>
                <p className="text-sm text-[#94A3B8] font-mono mb-2">
                  Cover saat ini:
                </p>
                <img
                  src={currentImage}
                  alt="Current cover"
                  className="w-48 h-64 object-cover rounded-lg border border-white/10"
                />
              </div>
            )}

            {/* New Image Preview */}
            {imagePreview && (
              <div>
                <p className="text-sm text-[#94A3B8] font-mono mb-2">
                  Cover baru:
                </p>
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="New cover preview"
                    className="w-48 h-64 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveNewImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div>
              <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                {imagePreview ? "Ganti Cover" : "Upload Cover Baru"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-[#94A3B8] font-mono mt-2">
                Format: JPG, PNG, WebP (Max 5MB)
              </p>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
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
