import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Upload, Book } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

interface Category {
  id: number;
  name: string;
}

export default function AddCollectionPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publisher: "",
    publicationYear: "",
    isbn: "",
    type: "physical_book",
    categoryId: "",
    description: "",
    quantity: "1",
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/categories`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch categories", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("author", formData.author);
      formDataToSend.append("publisher", formData.publisher);
      formDataToSend.append("publicationYear", formData.publicationYear);
      formDataToSend.append("isbn", formData.isbn);
      formDataToSend.append("type", formData.type);
      formDataToSend.append("categoryId", formData.categoryId);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("quantity", formData.quantity);

      if (coverFile) {
        formDataToSend.append("cover", coverFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/collections`, {
        method: "POST",
        credentials: "include",
        body: formDataToSend,
      });

      const data = await res.json();

      if (data.success) {
        alert("Koleksi berhasil ditambahkan!");
        navigate("/dashboard/super-admin");
      } else {
        alert("Gagal menambahkan koleksi: " + data.message);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Terjadi kesalahan saat menambahkan koleksi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030304] font-body text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="radial-blur-orange w-96 h-96 top-0 right-0"></div>
      <div className="radial-blur-gold w-96 h-96 bottom-0 left-0"></div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
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
            Tambah Koleksi Baru
          </h1>
          <p className="text-[#94A3B8] font-mono">
            Isi detail buku atau koleksi yang ingin ditambahkan
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cover Image Upload */}
          <div className="card-standard">
            <h3 className="font-heading font-semibold text-lg mb-4">
              Cover Buku
            </h3>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                  Upload Cover
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label
                    htmlFor="cover-upload"
                    className="flex items-center justify-center gap-3 px-6 py-4 bg-black/50 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[#F7931A] hover:bg-white/5 transition-all duration-300"
                  >
                    <Upload className="w-5 h-5 text-[#94A3B8]" />
                    <span className="text-[#94A3B8] font-mono text-sm">
                      {coverFile ? coverFile.name : "Pilih file gambar"}
                    </span>
                  </label>
                </div>
              </div>
              {imagePreview && (
                <div className="w-48 h-64 bg-black/50 rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="card-standard space-y-4">
            <h3 className="font-heading font-semibold text-lg mb-4">
              Informasi Dasar
            </h3>

            <div>
              <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                Judul Buku *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="input-technical w-full rounded-lg"
                placeholder="Masukkan judul buku"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                  Penulis *
                </label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  className="input-technical w-full rounded-lg"
                  placeholder="Nama penulis"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                  Penerbit *
                </label>
                <input
                  type="text"
                  required
                  value={formData.publisher}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                  className="input-technical w-full rounded-lg"
                  placeholder="Nama penerbit"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                  Tahun Terbit *
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
                  className="input-technical w-full rounded-lg"
                  placeholder="YYYY"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                  ISBN
                </label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) =>
                    setFormData({ ...formData, isbn: e.target.value })
                  }
                  className="input-technical w-full rounded-lg"
                  placeholder="ISBN number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                  Tipe Koleksi *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="input-technical w-full rounded-lg"
                >
                  <option value="physical_book">Buku Fisik</option>
                  <option value="ebook">E-Book</option>
                  <option value="journal">Jurnal</option>
                  <option value="thesis">Skripsi/Thesis</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                  Kategori *
                </label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="input-technical w-full rounded-lg"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono text-[#94A3B8] mb-2 uppercase tracking-wider">
                Jumlah (untuk buku fisik)
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                className="input-technical w-full rounded-lg"
                placeholder="1"
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
                placeholder="Deskripsi atau sinopsis buku"
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
                  <Book className="w-4 h-4" />
                  Simpan Koleksi
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
