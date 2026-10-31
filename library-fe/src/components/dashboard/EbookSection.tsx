import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  FileText,
  Eye,
  Loader2,
  AlertCircle,
  Upload,
  Lock,
  Globe,
  Filter,
  MoreHorizontal
} from "lucide-react";
import { ebookService, type EbookItem } from "@/services/ebookService";
import { dashboardDataService, type CategoryItem } from "@/services/dashboard/dashboardDataService";
import { useToast } from "@/hooks/useToast";
import Modal from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function EbookSection() {
  const { success, error } = useToast();
  const [ebooks, setEbooks] = useState<EbookItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form Modal State (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EbookItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formPublisher, setFormPublisher] = useState("");
  const [formYear, setFormYear] = useState<string>("");
  const [formIsbn, setFormIsbn] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [formIsFullAccess, setFormIsFullAccess] = useState(true);
  const [formStartPage, setFormStartPage] = useState<number>(1);
  const [formEndPage, setFormEndPage] = useState<number>(10);
  const [formAllowDownload, setFormAllowDownload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [deletingItem, setDeletingItem] = useState<EbookItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview State
  const [previewItem, setPreviewItem] = useState<EbookItem | null>(null);

  const getCleanErrorMessage = (err: any, fallback: string) => {
    const msg = err?.message;
    if (!msg || typeof msg !== "string" || msg.length > 120 || msg.includes("Failed query")) {
      return fallback;
    }
    return msg;
  };

  const fetchEbooks = async () => {
    try {
      setLoading(true);
      const res = await ebookService.getEbooks({
        page,
        limit: 10,
        search: searchTerm.trim() || undefined,
        categoryId: selectedCategory
      });
      setEbooks(res.data);
      setTotalPages(res.meta.totalPages || 1);
      setTotalCount(res.meta.total || 0);
    } catch (err: any) {
      error(getCleanErrorMessage(err, "Gagal memuat data e-book"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEbooks();
  }, [page, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchEbooks();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    dashboardDataService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormAuthor("");
    setFormPublisher("");
    setFormYear("");
    setFormIsbn("");
    setFormCategoryId("");
    setFormDescription("");
    setFormImage("");
    setFormPdfFile(null);
    setFormIsFullAccess(true);
    setFormStartPage(1);
    setFormEndPage(10);
    setFormAllowDownload(false);
    setIsFormOpen(true);
  };

  const openEditModal = (item: EbookItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormAuthor(item.authors?.[0]?.name || "");
    setFormPublisher(item.publisher?.name || "");
    setFormYear(item.publishYear ? String(item.publishYear) : "");
    setFormIsbn(item.isbn || "");
    setFormCategoryId(item.category?.id ? String(item.category.id) : "");
    setFormDescription(item.description || "");
    setFormImage(item.image || "");
    setFormPdfFile(null);
    setFormIsFullAccess(item.content?.isFullAccess ?? true);
    setFormStartPage(item.content?.previewStartPage ?? 1);
    setFormEndPage(item.content?.previewEndPage ?? 10);
    setFormAllowDownload(item.content?.allowDownload ?? false);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      error("Judul e-book wajib diisi");
      return;
    }

    if (!editingItem && !formPdfFile) {
      error("Berkas PDF e-book wajib diunggah saat menambahkan buku baru");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("title", formTitle.trim());
      if (formAuthor.trim()) formData.append("authorName", formAuthor.trim());
      if (formPublisher.trim()) formData.append("publisherName", formPublisher.trim());
      if (formYear) formData.append("publishYear", formYear);
      if (formIsbn.trim()) formData.append("isbn", formIsbn.trim());
      if (formCategoryId) formData.append("categoryId", formCategoryId);
      if (formDescription.trim()) formData.append("description", formDescription.trim());
      if (formImage.trim()) formData.append("image", formImage.trim());
      formData.append("isFullAccess", String(formIsFullAccess));
      formData.append("previewStartPage", String(formStartPage));
      formData.append("previewEndPage", String(formEndPage));
      formData.append("allowDownload", String(formAllowDownload));

      if (formPdfFile) {
        formData.append("file", formPdfFile);
      }

      if (editingItem) {
        await ebookService.updateEbook(editingItem.id, formData);
        success("E-Book berhasil diperbarui");
      } else {
        await ebookService.createEbook(formData);
        success("E-Book berhasil ditambahkan");
      }

      setIsFormOpen(false);
      fetchEbooks();
    } catch (err: any) {
      error(getCleanErrorMessage(err, "Gagal menyimpan e-book"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      await ebookService.deleteEbook(deletingItem.id);
      success("E-Book berhasil dihapus");
      setDeletingItem(null);
      fetchEbooks();
    } catch (err: any) {
      error(getCleanErrorMessage(err, "Gagal menghapus e-book"));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Manajemen Koleksi E-Book
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola buku digital, berkas PDF cloud storage S3, dan konfigurasi pratinjau halaman.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Tambah E-Book
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari judul, ISBN, atau deskripsi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select
            value={selectedCategory !== undefined ? String(selectedCategory) : "all"}
            onValueChange={(val) => {
              setSelectedCategory(val === "all" ? undefined : Number(val));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-56 h-[44px] bg-background border-input rounded-lg text-sm cursor-pointer shadow-xs">
              <div className="flex items-center gap-2 truncate">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Semua Kategori" />
              </div>
            </SelectTrigger>
            <SelectContent align="end" className="w-56">
              <SelectItem value="all" className="cursor-pointer font-medium">Semua Kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="cursor-pointer">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Memuat koleksi e-book...</p>
          </div>
        ) : ebooks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="p-3 bg-muted rounded-full text-muted-foreground">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Belum ada e-book yang terdaftar</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Mulai tambahkan buku digital ke repositori e-book dengan menekan tombol Tambah E-Book di atas.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              Unggah E-Book Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">Cover</TableHead>
                  <TableHead>Judul & ISBN</TableHead>
                  <TableHead>Penulis / Penerbit</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-center">Halaman</TableHead>
                  <TableHead>Akses Baca</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ebooks.map((item) => {
                  const authorName = item.authors?.[0]?.name || "Penulis tidak dicatat";
                  const isFull = item.content?.isFullAccess ?? true;

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="w-10 h-14 bg-muted rounded border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground line-clamp-1">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.isbn ? `ISBN: ${item.isbn}` : "ISBN tidak dicatat"}
                          {item.publishYear ? ` • Th. ${item.publishYear}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground line-clamp-1">{authorName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.publisher?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                          {item.category?.name || "Umum"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm font-semibold tabular-nums text-foreground">
                          {item.content?.pageCount ? `${item.content.pageCount} hal` : "-"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatFileSize(item.content?.fileSize)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isFull ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <Globe className="h-3 w-3" />
                            Akses Penuh
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            <Lock className="h-3 w-3" />
                            Pratinjau ({item.content?.previewStartPage || 1}-{item.content?.previewEndPage || 10})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Buka Preview Baca"
                            onClick={() => setPreviewItem(item)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer border border-border/60 shadow-xs"
                                title="Menu Opsi E-Book"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Menu aksi</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => setPreviewItem(item)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                                <span>Baca Pratinjau</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openEditModal(item)}
                                className="cursor-pointer text-xs flex items-center gap-2"
                              >
                                <Edit className="h-4 w-4 text-amber-600" />
                                <span>Edit Metadata</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingItem(item)}
                                className="cursor-pointer text-xs flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                                <span>Hapus E-Book</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-sm">
            <span className="text-muted-foreground">
              Total {totalCount} e-book terdaftar
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted disabled:opacity-50 min-h-[36px]"
              >
                Sebelumnya
              </button>
              <span className="text-xs font-medium px-2">
                Halaman {page} dari {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted disabled:opacity-50 min-h-[36px]"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={editingItem ? "Edit Metadata E-Book" : "Tambah Koleksi E-Book Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Judul E-Book <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Contoh: Pemrograman Web Modern dengan React dan TypeScript"
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Nama Penulis</label>
              <input
                type="text"
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
                placeholder="Nama penulis utama"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Penerbit</label>
              <input
                type="text"
                value={formPublisher}
                onChange={(e) => setFormPublisher(e.target.value)}
                placeholder="Nama penerbit"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Tahun Terbit</label>
              <input
                type="number"
                min="1900"
                max="2100"
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                placeholder="2024"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">ISBN</label>
              <input
                type="text"
                value={formIsbn}
                onChange={(e) => setFormIsbn(e.target.value)}
                placeholder="978-..."
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Kategori</label>
              <Select
                value={formCategoryId ? String(formCategoryId) : "none"}
                onValueChange={(val) => setFormCategoryId(val === "none" ? "" : val)}
              >
                <SelectTrigger className="w-full h-[44px] bg-background border-input rounded-lg text-sm cursor-pointer shadow-xs">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none" className="cursor-pointer text-muted-foreground">Pilih Kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">URL Gambar Sampul (Opsional)</label>
            <input
              type="url"
              value={formImage}
              onChange={(e) => setFormImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Deskripsi / Sinopsis</label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Ringkasan isi buku atau informasi penting..."
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Upload File PDF */}
          <div className="p-4 bg-muted/40 border border-dashed border-border rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-primary" />
                Berkas Dokumen PDF E-Book
              </span>
              {editingItem && (
                <span className="text-xs text-muted-foreground">
                  (Kosongkan jika tidak mengganti file PDF)
                </span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setFormPdfFile(file);
              }}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer py-4 border border-border bg-background hover:bg-muted/50 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-xs font-medium text-foreground">
                {formPdfFile
                  ? formPdfFile.name
                  : "Klik untuk memilih berkas PDF (Maks. 100 MB)"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Disimpan langsung ke Cloud Storage S3 Dahono
              </span>
            </div>
          </div>

          {/* Konfigurasi Kebijakan Akses Baca */}
          <div className="p-4 border border-border rounded-xl bg-card space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Kebijakan Akses Baca Pemustaka
            </h4>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="accessMode"
                  checked={formIsFullAccess}
                  onChange={() => setFormIsFullAccess(true)}
                  className="text-primary focus:ring-primary"
                />
                <span className="font-medium text-foreground">Akses Penuh (Bebas Baca Seluruh Halaman)</span>
              </label>

              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="accessMode"
                  checked={!formIsFullAccess}
                  onChange={() => setFormIsFullAccess(false)}
                  className="text-primary focus:ring-primary"
                />
                <span className="font-medium text-foreground">Pratinjau Halaman Terbatas (Slicing)</span>
              </label>
            </div>

            {!formIsFullAccess && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Halaman Awal Pratinjau
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formStartPage}
                    onChange={(e) => setFormStartPage(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Halaman Akhir Pratinjau
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formEndPage}
                    onChange={(e) => setFormEndPage(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[38px]"
                  />
                </div>
                <p className="col-span-2 text-[11px] text-muted-foreground">
                  * Pengunjung tamu hanya dapat membaca halaman {formStartPage} sampai {formEndPage}. Civitas UMC yang login tetap dapat mengakses buku secara penuh.
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAllowDownload}
                  onChange={(e) => setFormAllowDownload(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <span className="text-foreground">Izinkan pemustaka mengunduh berkas PDF utuh</span>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors min-h-[44px] disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingItem ? "Simpan Perubahan" : "Unggah & Terbitkan E-Book"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Hapus Konfirmasi */}
      <Modal
        isOpen={Boolean(deletingItem)}
        onClose={() => !isDeleting && setDeletingItem(null)}
        title="Hapus E-Book"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-full flex-shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Apakah kamu yakin ingin menghapus e-book ini?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                "{deletingItem?.title}" akan dihapus dari katalog publik dan berkas tidak dapat diakses lagi.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingItem(null)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg min-h-[44px]"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm min-h-[44px] disabled:opacity-50"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, Hapus E-Book
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Preview Reader */}
      <Modal
        isOpen={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={previewItem ? `Pratinjau: ${previewItem.title}` : "Pratinjau E-Book"}
        size="xl"
      >
        {previewItem && (
          <div className="space-y-3">
            <div className="w-full h-[650px] bg-muted rounded-lg border border-border overflow-hidden">
              <iframe
                src={ebookService.getStreamUrl(previewItem.id, "preview")}
                title={previewItem.title}
                className="w-full h-full border-0"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Menampilkan aliran PDF langsung dari storage server S3 Dahono.
              </span>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg min-h-[36px]"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
