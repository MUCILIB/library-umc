import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Book } from "lucide-react";
import { API_BASE_URL } from "@/lib/api-config";

interface CollectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CollectionForm({
  onSuccess,
  onCancel,
}: CollectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publisher: "",
    publicationYear: "",
    isbn: "",
    type: "physical_book",
    categoryId: "1",
    description: "",
    cover: null as File | null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, cover: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      (Object.keys(formData) as (keyof typeof formData)[]).forEach((key) => {
        if (key === "cover" && formData.cover) {
          data.append("cover", formData.cover);
        } else if (key !== "cover") {
          const value = formData[key];
          data.append(key, value as string);
        }
      });

      const res = await fetch(`${API_BASE_URL}/api/collections`, {
        method: "POST",
        credentials: "include",
        body: data,
      });

      const result = await res.json();
      if (result.success) {
        alert("Buku berhasil ditambahkan!");
        onSuccess();
      } else {
        alert(
          "Gagal menambahkan buku: " +
            JSON.stringify(result.errors || result.message),
        );
      }
    } catch (error) {
      console.error("Error submitting form", error);
      alert("Terjadi kesalahan saat upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Judul Buku
          </label>
          <input
            required
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="Masukkan judul..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Penulis</label>
          <input
            required
            name="author"
            value={formData.author}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="Nama penulis..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Penerbit
          </label>
          <input
            required
            name="publisher"
            value={formData.publisher}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="Nama penerbit..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Tahun Terbit
          </label>
          <input
            required
            name="publicationYear"
            value={formData.publicationYear}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="YYYY"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">ISBN</label>
          <input
            name="isbn"
            value={formData.isbn}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="Nomor ISBN..."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Tipe Koleksi
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="physical_book">Buku Fisik</option>
            <option value="ebook">E-Book</option>
            <option value="journal">Jurnal</option>
            <option value="thesis">Skripsi/Tesis</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">
          Deskripsi Singkat
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          placeholder="Sinopsis atau deskripsi koleksi..."
        ></textarea>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700">
          Cover Image
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
          <input
            type="file"
            name="cover"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept="image/*"
          />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Book className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-600">
              {formData.cover
                ? formData.cover.name
                : "Klik atau drag file gambar ke sini"}
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="px-6"
        >
          Batal
        </Button>
        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
          disabled={loading}
        >
          {loading ? "Menyimpan..." : "Simpan Koleksi"}
        </Button>
      </div>
    </form>
  );
}
