import { useState, useEffect, useCallback } from "react";
import {
  Book,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Info,
  BookOpen,
  Database,
  Image as ImageIcon,
  UploadCloud,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cleanIsbn } from "@/utils/format";
import { resolveCoverUrl } from "@/utils/imageUrl";
import { API_BASE_URL } from "@/utils/api-config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  bibliographyApi,
  type Bibliography,
  type Location,
  type Item,
  locationApi,
  itemApi,
  facultyApi,
  studyProgramApi,
} from "@/api/client";

export interface BibliographyFormProps {
  bib: Bibliography | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BibliographyForm({ bib, onClose, onSuccess }: BibliographyFormProps) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: bib?.title || "",
    isbn: bib?.isbn ? cleanIsbn(bib.isbn) : (bib?.isbnIssn && !bib.isbnIssn.startsWith("ISSN") ? cleanIsbn(bib.isbnIssn) : ""),
    issn: bib?.issn ? bib.issn.replace(/^ISSN[:\s]*/i, "").trim() : (bib?.isbnIssn && bib.isbnIssn.startsWith("ISSN") ? bib.isbnIssn.replace(/^ISSN[:\s]*/i, "").trim() : ""),
    edition: bib?.edition || "",
    publishYear: bib?.publishYear?.toString() || "",
    collation: bib?.collation || "",
    seriesTitle: bib?.seriesTitle || "",
    callNumber: bib?.callNumber || "",
    classification: bib?.classification || "",
    notes: bib?.notes || "",
    sor: bib?.sor || "",
    description: bib?.description || "",
    type: bib?.type || "physical_book",
    image: bib?.image || "",
    isPopular: bib?.isPopular || false,
    publisherName: bib?.publisher?.name || "",
    // Defaults to Text GMD
    gmdId: bib?.gmd?.id?.toString() || "1",
    publishPlace: bib?.publicationPlace?.name || "",
  });

  const [authors, setAuthors] = useState<Array<{ name: string; role: string }>>(
    bib?.authors?.map((a) => ({ name: a.name, role: a.role })) || [{ name: "", role: "primary" }]
  );
  const [subjects, setSubjects] = useState<Array<{ name: string }>>(
    bib?.subjects?.map((s) => ({ name: s.name })) || []
  );
  const [unlistedAuthorsLabel, setUnlistedAuthorsLabel] = useState(bib?.unlistedAuthorsLabel || "");

  // Subject adding input state
  const [subjectInput, setSubjectInput] = useState("");

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<Array<{ id: string; title: string; isbn?: string; issn?: string; isbnIssn?: string; authors: Array<{ name: string }>; similarity: string }>>([]);
  const [checkingDup, setCheckingDup] = useState(false);

  const isbnDuplicate = duplicates.find((d) => d.similarity === "isbn" && d.id !== bib?.id);
  const issnDuplicate = duplicates.find((d) => d.similarity === "issn" && d.id !== bib?.id);
  const hasExactConflict = Boolean(isbnDuplicate || issnDuplicate);

  // Faculty / Study Program
  const [facultyOptions, setFacultyOptions] = useState<{ id: number; name: string }[]>([]);
  const [studyProgramOptions, setStudyProgramOptions] = useState<{ id: number; name: string; facultyId: number }[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>(bib?.faculties?.map((f: any) => f.id) || []);
  const [selectedStudyProgramIds, setSelectedStudyProgramIds] = useState<number[]>(bib?.studyPrograms?.map((sp: any) => sp.id) || []);

    // Duplicate detection
  useEffect(() => {
    const title = formData.title.trim();
    const isbn = formData.isbn.trim().replace(/[^0-9Xx]/g, "");
    const issn = formData.issn.trim().replace(/[^0-9]/g, "");
    if (title.length < 3 && isbn.length < 3 && issn.length < 3) { setDuplicates([]); return; }
    const timer = setTimeout(async () => {
      setCheckingDup(true);
      try {
        const params: Record<string, string> = {};
        if (isbn.length >= 3) params.isbn = isbn;
        if (issn.length >= 3) params.issn = issn;
        if (title.length >= 3) params.title = title;
        if (bib?.id) params.excludeId = bib.id;
        if (Object.keys(params).length === 0) { setDuplicates([]); return; }
        const res = await bibliographyApi.checkDuplicate(params);
        setDuplicates(res.data.duplicates.filter((d: any) => d.id !== bib?.id));
      } catch { setDuplicates([]); } finally { setCheckingDup(false); }
    }, 600);
    return () => clearTimeout(timer);
  }, [formData?.title, formData?.isbn, formData?.issn, bib?.id]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [facRes, spRes] = await Promise.all([
          facultyApi.list(),
          studyProgramApi.list(),
        ]);
        if (facRes.data) setFacultyOptions(facRes.data);
        if (spRes.data) setStudyProgramOptions(spRes.data);
      } catch {}
    };
    loadOptions();
  }, []);

  const toggleFaculty = (id: number) => {
    setSelectedFacultyIds((prev) => {
      if (prev.includes(id)) {
        // Also remove study programs of this faculty
        setSelectedStudyProgramIds((spPrev) =>
          spPrev.filter((spid) => {
            const sp = studyProgramOptions.find((o) => o.id === spid);
            return sp ? sp.facultyId !== id : true;
          })
        );
        return prev.filter((fid) => fid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleStudyProgram = (id: number) => {
    setSelectedStudyProgramIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((spid) => spid !== id);
      } else {
        const sp = studyProgramOptions.find((o) => o.id === id);
        if (sp && !selectedFacultyIds.includes(sp.facultyId)) {
          setSelectedFacultyIds((facPrev) =>
            facPrev.includes(sp.facultyId) ? facPrev : [...facPrev, sp.facultyId]
          );
        }
        return [...prev, id];
      }
    });
  };

  const filteredStudyPrograms = selectedFacultyIds.length > 0
    ? studyProgramOptions.filter((sp) => selectedFacultyIds.includes(sp.facultyId))
    : studyProgramOptions;

  const handleIsbnChange = (val: string) => {
    // Strip everything except digits and x/X
    let clean = val.replace(/^ISBN[:\s]*/i, "").replace(/[^0-9Xx]/g, "");
    let formatted = clean;

    // ISBN-13 format (starts with 9)
    clean = clean.substring(0, 13);
    if (clean.length <= 3) {
      formatted = clean;
    } else if (clean.length <= 6) {
      formatted = `${clean.substring(0, 3)}-${clean.substring(3)}`;
    } else if (clean.length <= 9) {
      formatted = `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6)}`;
    } else if (clean.length <= 12) {
      formatted = `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6, 9)}-${clean.substring(9)}`;
    } else {
      formatted = `${clean.substring(0, 3)}-${clean.substring(3, 6)}-${clean.substring(6, 9)}-${clean.substring(9, 12)}-${clean.substring(12)}`;
    }

    setFormData((prev) => ({ ...prev, isbn: formatted }));
  };

  const handleIssnChange = (val: string) => {
    // Strip everything except digits
    let clean = val.replace(/^ISSN[:\s]*/i, "").replace(/[^0-9]/g, "");
    let formatted = clean;

    // ISSN format (8 digits, XXXX-XXXX)
    clean = clean.substring(0, 8);
    if (clean.length <= 4) {
      formatted = clean;
    } else {
      formatted = `${clean.substring(0, 4)}-${clean.substring(4)}`;
    }

    setFormData((prev) => ({ ...prev, issn: formatted }));
  };

  // Step 3: Copies & Inventory states
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemsList, setItemsList] = useState<Item[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // New items added locally (for new bibliography)
  const [localNewItems, setLocalNewItems] = useState<Array<{ itemCode: string; inventoryCode?: string; locationId: number; locationName: string }>>([]);

  // Form for adding single copy
  const [polaKodeItem, setPolaKodeItem] = useState("");
  const [inventoryCodeInput, setInventoryCodeInput] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  const loadLocationsList = async () => {
    try {
      const result = await locationApi.list();
      const list = result.data || [];
      setLocations(list);
      if (list.length > 0) {
        setSelectedLocationId((prev) =>
          prev && list.some((l) => l.id.toString() === prev) ? prev : list[0].id.toString()
        );
      } else {
        setSelectedLocationId("");
      }
    } catch (err) {
      console.error("Gagal memuat lokasi", err);
    }
  };

  const handleGenerateCode = async () => {
    if (!bib && localNewItems.length === 0) {
      setStep3Error("Simpan bibliografi terlebih dahulu, atau tambahkan item manual");
      return;
    }
    const bibId = bib?.id;
    if (!bibId) {
      setStep3Error("Bibliografi belum disimpan. Gunakan input manual untuk kode item.");
      return;
    }
    setGeneratingCode(true);
    setStep3Error(null);
    try {
      const res = await itemApi.generateCode(bibId, polaKodeItem.trim() || undefined);
      setPolaKodeItem(res.data.itemCode);
      if (!inventoryCodeInput) {
        setInventoryCodeInput(res.data.itemCode);
      }
    } catch (err: unknown) {
      setStep3Error(err instanceof Error ? err.message : "Gagal generate kode item");
    } finally {
      setGeneratingCode(false);
    }
  };

  // Load locations on mount
  useEffect(() => {
    loadLocationsList();
  }, []);

  // Load existing items if editing
  const loadItems = useCallback(async () => {
    if (!bib) return;
    setItemsLoading(true);
    try {
      const result = await bibliographyApi.getItems(bib.id);
      setItemsList(result.data || []);
    } catch (err) {
      console.error("Gagal memuat eksemplar", err);
    } finally {
      setItemsLoading(false);
    }
  }, [bib]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addAuthor = () => setAuthors([...authors, { name: "", role: "primary" }]);
  const removeAuthor = (idx: number) => {
    if (authors.length > 1) {
      setAuthors(authors.filter((_, i) => i !== idx));
    } else {
      setAuthors([{ name: "", role: "primary" }]);
    }
  };
  const updateAuthor = (idx: number, field: string, value: string) => {
    const updated = [...authors];
    updated[idx] = { ...updated[idx], [field]: value };
    setAuthors(updated);
  };

  const handleAddSubject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = subjectInput.trim();
    if (!val) return;
    if (subjects.some((s) => s.name.toLowerCase() === val.toLowerCase())) {
      setSubjectInput("");
      return;
    }
    setSubjects([...subjects, { name: val }]);
    setSubjectInput("");
  };

  const removeSubject = (idx: number) => {
    setSubjects(subjects.filter((_, i) => i !== idx));
  };

  // Step 3 Copy Handlers
  const handleSaveCopy = async () => {
    setStep3Error(null);
    const code = polaKodeItem.trim();
    if (!code) {
      setStep3Error("Kode item tidak boleh kosong");
      return;
    }
    if (!selectedLocationId) {
      setStep3Error("Silakan pilih tipe koleksi / lokasi");
      return;
    }

    const locId = parseInt(selectedLocationId);
    const locObj = locations.find((l) => l.id === locId);
    const locName = locObj ? `${locObj.room} - ${locObj.rack} - ${locObj.shelf}` : "Sirkulasi";
    const invCode = inventoryCodeInput.trim() || undefined;

    if (bib) {
      // Editing Mode: Save to DB immediately
      try {
        setItemsLoading(true);
        const res = await itemApi.create(bib.id, {
          itemCode: code,
          locationId: locId,
          inventoryCode: invCode,
          status: "available",
        });
        if (res.success) {
          setPolaKodeItem("");
          setInventoryCodeInput("");
          await loadItems();
        } else {
          setStep3Error(res.message || "Gagal menyimpan eksemplar");
        }
      } catch (err: unknown) {
        setStep3Error(err instanceof Error ? err.message : "Kode item sudah digunakan atau error sistem");
      } finally {
        setItemsLoading(false);
      }
    } else {
      // Creating Mode: Save to local state array
      if (localNewItems.some((item) => item.itemCode.toLowerCase() === code.toLowerCase())) {
        setStep3Error("Kode item sudah ada di daftar");
        return;
      }
      setLocalNewItems([...localNewItems, { itemCode: code, inventoryCode: invCode, locationId: locId, locationName: locName }]);
      setPolaKodeItem("");
      setInventoryCodeInput("");
    }
  };

  const handleDeleteCopy = async (indexOrId: number | string, itemCode: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus salinan item "${itemCode}"?`)) return;

    if (bib && typeof indexOrId === "string") {
      // Editing Mode: Delete from DB immediately
      try {
        setItemsLoading(true);
        await itemApi.delete(indexOrId);
        await loadItems();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Gagal menghapus eksemplar");
      } finally {
        setItemsLoading(false);
      }
    } else if (typeof indexOrId === "number") {
      // Creating Mode: Filter local list
      setLocalNewItems(localNewItems.filter((_, i) => i !== indexOrId));
    }
  };

  // Step 4 File Upload Handlers (upload ke S3 Dahono dengan fallback kompresi base64)
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const compressAndSetBase64 = (file: File) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 800;
      let { width, height } = img;
      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      if (dataUrl.length > 400 * 1024) {
        const smaller = canvas.toDataURL("image/jpeg", 0.5);
        setFormData((prev) => ({ ...prev, image: smaller }));
      } else {
        setFormData((prev) => ({ ...prev, image: dataUrl }));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Berkas Terlalu Besar", "Ukuran maksimal gambar sampul adalah 5 MB.");
      e.target.value = "";
      return;
    }

    const toastId = toast.loading("Mengunggah Sampul...", `Mengirim ${file.name} ke penyimpanan S3.`);
    setIsUploadingCover(true);

    // Coba upload berkas fisik langsung ke S3 backend
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload/cover`, {
        method: "POST",
        body: uploadData,
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.url) {
          setFormData((prev) => ({ ...prev, image: json.data.url }));
          toast.removeToast(toastId);
          toast.success("Sampul Berhasil Diunggah", "Berkas gambar sampul telah tersimpan di S3.");
          return;
        }
      }
      // Fallback ke kompresi client jika offline / error
      compressAndSetBase64(file);
      toast.removeToast(toastId);
      toast.info("Sampul Disimpan Lokal", "Berhasil dikompresi sebagai data lokal.");
    } catch {
      compressAndSetBase64(file);
      toast.removeToast(toastId);
      toast.info("Sampul Disimpan Lokal", "Berhasil dikompresi sebagai data lokal.");
    } finally {
      setIsUploadingCover(false);
      e.target.value = "";
    }
  };

  // PDF file mock upload
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const handleDigitalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDigitalFile(file);
    }
  };

  // Submit all steps
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isbnDuplicate) {
      setError(`ISBN "${formData.isbn}" sudah digunakan oleh buku "${isbnDuplicate.title}". ISBN tidak boleh duplikat.`);
      return;
    }
    if (issnDuplicate) {
      setError(`ISSN "${formData.issn}" sudah digunakan oleh buku/jurnal "${issnDuplicate.title}". ISSN tidak boleh duplikat.`);
      return;
    }
    setLoading(true);
    setError(null);

    const cleanIsbnVal = formData.isbn.trim();
    const cleanIssnVal = formData.issn.trim();

    try {
      const { isbn, issn, ...restFormData } = formData;
      const payload: Record<string, any> = {
        ...restFormData,
        isbn: cleanIsbnVal ? cleanIsbn(cleanIsbnVal) : (bib ? "" : undefined),
        issn: cleanIssnVal ? cleanIssnVal.replace(/^ISSN[:\s]*/i, "").trim() : (bib ? "" : undefined),
        isbnIssn: cleanIsbnVal ? cleanIsbn(cleanIsbnVal) : (cleanIssnVal ? `ISSN ${cleanIssnVal.replace(/^ISSN[:\s]*/i, "").trim()}` : (bib ? "" : undefined)),
        publishYear: formData.publishYear ? parseInt(formData.publishYear) : undefined,
        authors: authors.filter((a) => a.name.trim()),
        subjects: subjects.filter((s) => s.name.trim()),
        unlistedAuthorsLabel: unlistedAuthorsLabel || undefined,
        gmdId: formData.gmdId ? parseInt(formData.gmdId) : undefined,
        facultyIds: selectedFacultyIds.length > 0 ? selectedFacultyIds : (bib ? [] : undefined),
        studyProgramIds: selectedStudyProgramIds.length > 0 ? selectedStudyProgramIds : (bib ? [] : undefined),
      };

      if (bib) {
        // Update Bibliography
        await bibliographyApi.update(bib.id, payload);
        onSuccess();
      } else {
        // Create Bibliography
        const res = await bibliographyApi.create(payload);
        const newBib = res.data;

        // If there are local items to add, create them now
        if (localNewItems.length > 0 && newBib?.id) {
          await itemApi.bulkCreate(newBib.id, {
            items: localNewItems.map((item) => ({
              itemCode: item.itemCode,
              locationId: item.locationId,
              ...(item.inventoryCode ? { inventoryCode: item.inventoryCode } : {}),
            })),
          });
        }
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan bibliografi");
    } finally {
      setLoading(false);
    }
  };

  // Navigation validation
  const nextStep = () => {
    if (step === 1) {
      if (!formData.title.trim()) {
        setError("Judul buku wajib diisi");
        return;
      }
      if (authors.some((a) => !a.name.trim())) {
        setError("Silakan isi nama penulis atau hapus baris kosong");
        return;
      }
    }
    if (step === 2) {
      if (isbnDuplicate) {
        setError(`ISBN "${formData.isbn}" sudah digunakan oleh buku "${isbnDuplicate.title}". ISBN tidak boleh duplikat.`);
        return;
      }
      if (issnDuplicate) {
        setError(`ISSN "${formData.issn}" sudah digunakan oleh buku/jurnal "${issnDuplicate.title}". ISSN tidak boleh duplikat.`);
        return;
      }
    }
    setError(null);
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  // Rendering step indicator UI
  const stepsConfig = [
    { num: 1, label: "1. Informasi Dasar & Pengarang", icon: Info },
    { num: 2, label: "2. Penerbitan & Klasifikasi", icon: BookOpen },
    { num: 3, label: "3. Inventaris & Salinan", icon: Database },
    { num: 4, label: "4. Sampul & Berkas", icon: ImageIcon },
    { num: 5, label: "5. Pratinjau & Simpan", icon: Check },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {bib ? "Edit Bibliografi" : "Tambah Bibliografi Baru"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Isi rincian data buku lengkap sesuai dengan format standar katalogisasi bibliografi
          </p>
        </div>
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <ArrowLeft className="size-4" />
            Kembali ke Daftar
          </button>
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
          {stepsConfig.map((item) => {
            const isActive = step === item.num;
            const isCompleted = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => {
                  if (item.num < step || (item.num <= step + 1 && formData.title.trim())) {
                    setStep(item.num);
                  }
                }}
                className={`flex items-center gap-3 py-3 px-2 border-b-2 transition-all text-left ${
                  isActive
                    ? "border-primary text-primary font-semibold"
                    : isCompleted
                    ? "border-success/80 text-success/80 font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs transition-all ${
                    isActive
                      ? "bg-primary text-white"
                      : isCompleted
                      ? "bg-success text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="size-4" /> : item.num}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    Langkah {item.num}
                  </span>
                  <span className="text-sm line-clamp-1">{item.label.substring(3)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-warning-border bg-warning-bg p-4 flex items-center gap-3">
          <AlertCircle className="size-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className={`rounded-xl border p-4 ${hasExactConflict ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className={`size-5 ${hasExactConflict ? "text-destructive" : "text-amber-600"}`} />
            <span className={`text-sm font-semibold ${hasExactConflict ? "text-destructive" : "text-amber-800"}`}>
              {isbnDuplicate
                ? `Duplikasi ISBN Terdeteksi: ISBN ini sudah dipakai oleh buku "${isbnDuplicate.title}"`
                : issnDuplicate
                ? `Duplikasi ISSN Terdeteksi: ISSN ini sudah dipakai oleh publikasi "${issnDuplicate.title}"`
                : "Judul serupa ditemukan"}
            </span>
            {checkingDup && <Loader2 className={`size-4 animate-spin ${hasExactConflict ? "text-destructive" : "text-amber-600"}`} />}
          </div>
          <div className="space-y-2">
            {duplicates.map((d) => (
              <div key={d.id} className={`flex items-center justify-between bg-white dark:bg-card rounded-lg p-3 border ${d.similarity === 'isbn' || d.similarity === 'issn' ? 'border-destructive/30 bg-destructive/5' : 'border-amber-100'}`}>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${d.similarity === 'isbn' || d.similarity === 'issn' ? 'text-destructive font-bold' : 'text-amber-900'}`}>{d.title}</p>
                  <p className={`text-xs ${d.similarity === 'isbn' || d.similarity === 'issn' ? 'text-destructive/80' : 'text-amber-700'}`}>
                    {d.authors.map((a) => a.name).join(", ")}
                    {d.isbn ? ` | ISBN: ${cleanIsbn(d.isbn)}` : d.issn ? ` | ISSN: ${d.issn}` : d.isbnIssn ? ` | ${cleanIsbn(d.isbnIssn)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`/dashboard?tab=bibliography&id=${d.id}`, '_blank')}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline"
                >
                  Lihat
                </button>
              </div>
            ))}
          </div>
          {hasExactConflict && (
            <p className="mt-2 text-xs font-medium text-destructive">
              Setiap buku atau publikasi harus memiliki ISBN/ISSN yang unik. ISBN/ISSN tidak boleh duplikat.
            </p>
          )}
        </div>
      )}

      {/* Wizard Form Panels */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6"
      >
        {/* STEP 1: INFORMASI DASAR & PENGARANG */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Informasi Utama Buku
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Judul Buku *
                </label>
                <input
                  type="text"
                  placeholder="Masukkan judul utama buku"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Edisi / Cetakan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Edisi Revisi, Cetakan ke-3"
                  value={formData.edition}
                  onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Pernyataan Tanggung Jawab (Statement of Responsibility)
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama penulis, editor, atau penerjemah"
                  value={formData.sor}
                  onChange={(e) => setFormData({ ...formData, sor: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  General Material Designation (GMD)
                </label>
                <Select
                  value={formData.gmdId}
                  onValueChange={(val) => setFormData({ ...formData, gmdId: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih GMD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Text</SelectItem>
                    <SelectItem value="2">Electronic</SelectItem>
                    <SelectItem value="3">Audio</SelectItem>
                    <SelectItem value="4">Video</SelectItem>
                    <SelectItem value="5">Image</SelectItem>
                    <SelectItem value="6">Map</SelectItem>
                    <SelectItem value="7">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tipe Koleksi
                </label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih Tipe Koleksi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical_book">Buku Fisik</SelectItem>
                    <SelectItem value="ebook">E-Book</SelectItem>
                    <SelectItem value="journal">Jurnal</SelectItem>
                    <SelectItem value="thesis">Skripsi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Author List */}
            <div className="border border-border rounded-xl p-4 bg-muted/40 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Daftar Pengarang / Penulis
                </label>
                <button
                  type="button"
                  onClick={addAuthor}
                  className="flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-all"
                >
                  <Plus className="size-3.5" />
                  Tambah Pengarang
                </button>
              </div>

              <div className="space-y-3">
                {authors.map((author, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Select
                      value={author.role}
                      onValueChange={(val) => updateAuthor(idx, "role", val)}
                    >
                      <SelectTrigger className="w-1/3 min-w-[130px]">
                        <SelectValue placeholder="Peran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Utama</SelectItem>
                        <SelectItem value="secondary">Tambahan</SelectItem>
                        <SelectItem value="editor">Penyunting</SelectItem>
                        <SelectItem value="translator">Penerjemah</SelectItem>
                      </SelectContent>
                    </Select>
                    <input
                      type="text"
                      value={author.name}
                      onChange={(e) => updateAuthor(idx, "name", e.target.value)}
                      placeholder="Ketikkan nama penulis lengkap"
                      required
                      className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeAuthor(idx)}
                      className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors shrink-0"
                    >
                      <Trash2 className="size-4.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border/60">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Label Penulis Tambahan Lainnya (cth: dkk, et al.)
                </label>
                <input
                  type="text"
                  value={unlistedAuthorsLabel}
                  onChange={(e) => setUnlistedAuthorsLabel(e.target.value)}
                  placeholder="cth: dkk"
                  className="w-full max-w-xs rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>
            </div>


          </div>
        )}

        {/* STEP 2: PENERBITAN & KLASIFIKASI */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Rincian Penerbitan & Klasifikasi
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>ISBN</span>
                      {isbnDuplicate && (
                        <span className="text-[11px] font-normal text-destructive lowercase">
                          (sudah terpakai)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 978-090-231-122-6"
                      value={formData.isbn}
                      onChange={(e) => handleIsbnChange(e.target.value)}
                      maxLength={17}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none transition-colors bg-background ${
                        isbnDuplicate
                          ? "border-destructive ring-1 ring-destructive text-destructive"
                          : "border-border focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    {isbnDuplicate && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1 font-medium">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Sudah digunakan oleh: {isbnDuplicate.title}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>ISSN</span>
                      {issnDuplicate && (
                        <span className="text-[11px] font-normal text-destructive lowercase">
                          (sudah terpakai)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 1234-5678"
                      value={formData.issn}
                      onChange={(e) => handleIssnChange(e.target.value)}
                      maxLength={9}
                      className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none transition-colors bg-background ${
                        issnDuplicate
                          ? "border-destructive ring-1 ring-destructive text-destructive"
                          : "border-border focus:border-primary focus:ring-1 focus:ring-primary"
                      }`}
                    />
                    {issnDuplicate && (
                      <p className="mt-1 text-xs text-destructive flex items-center gap-1 font-medium">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Sudah digunakan oleh: {issnDuplicate.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tahun Terbit
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 2026"
                  value={formData.publishYear}
                  onChange={(e) => setFormData({ ...formData, publishYear: e.target.value })}
                  min="1000"
                  max="9999"
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>



              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Penerbit (Publisher)
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama penerbit"
                  value={formData.publisherName}
                  onChange={(e) => setFormData({ ...formData, publisherName: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Tempat Terbit
                </label>
                <input
                  type="text"
                  placeholder="Nama kota terbit"
                  value={formData.publishPlace}
                  onChange={(e) => setFormData({ ...formData, publishPlace: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div className="md:col-span-3">
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Deskripsi Fisik / Kolasi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: x, 248 hlm.: ilus; 21 cm."
                  value={formData.collation}
                  onChange={(e) => setFormData({ ...formData, collation: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Judul Seri (Series Title)
                </label>
                <input
                  type="text"
                  placeholder="Masukkan judul seri jika ada"
                  value={formData.seriesTitle}
                  onChange={(e) => setFormData({ ...formData, seriesTitle: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Klasifikasi (Classification)
                </label>
                <input
                  type="text"
                  placeholder="Kode klasifikasi DDC"
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-foreground uppercase tracking-wider">
                  Nomor Panggil (Call Number)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 371.4 ANW b"
                  value={formData.callNumber}
                  onChange={(e) => setFormData({ ...formData, callNumber: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
              </div>
            </div>

            {/* Faculty / Study Program Selection */}
            <div className="border-t border-border pt-4 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Fakultas & Program Studi
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tentukan fakultas dan program studi untuk buku ini agar terfilter dengan tepat
                </p>
              </div>

              {/* Dropdowns for quick selection */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Pilih Fakultas
                  </label>
                  <Select
                    value={selectedFacultyIds.length === 1 ? String(selectedFacultyIds[0]) : ""}
                    onValueChange={(val) => {
                      if (val) {
                        const id = Number(val);
                        if (!selectedFacultyIds.includes(id)) {
                          toggleFaculty(id);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="-- Pilih Fakultas --" />
                    </SelectTrigger>
                    <SelectContent>
                      {facultyOptions.map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Interactive faculty chips / pills */}
                  <div className="mt-2.5">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Daftar Fakultas (klik untuk memilih/membatalkan):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-border rounded-lg bg-muted/20">
                      {facultyOptions.length === 0 && (
                        <span className="text-xs text-muted-foreground">Memuat fakultas...</span>
                      )}
                      {facultyOptions.map((f) => {
                        const isSelected = selectedFacultyIds.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleFaculty(f.id)}
                            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:border-primary/60 hover:text-foreground"
                            }`}
                          >
                            <span>{f.name}</span>
                            {isSelected && <Check className="size-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Pilih Program Studi
                  </label>
                  <Select
                    value={selectedStudyProgramIds.length === 1 ? String(selectedStudyProgramIds[0]) : ""}
                    onValueChange={(val) => {
                      if (val) {
                        const id = Number(val);
                        if (!selectedStudyProgramIds.includes(id)) {
                          toggleStudyProgram(id);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="-- Pilih Program Studi --" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStudyPrograms.map((sp) => (
                        <SelectItem key={sp.id} value={String(sp.id)}>
                          {sp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Interactive prodi chips / pills */}
                  <div className="mt-2.5">
                    <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Daftar Program Studi (klik untuk memilih/membatalkan):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-border rounded-lg bg-muted/20">
                      {filteredStudyPrograms.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          {facultyOptions.length === 0 ? "Memuat prodi..." : "Pilih fakultas atau belum ada prodi"}
                        </span>
                      )}
                      {filteredStudyPrograms.map((sp) => {
                        const isSelected = selectedStudyProgramIds.includes(sp.id);
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => toggleStudyProgram(sp.id)}
                            className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all flex items-center gap-1 ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:border-emerald-500/60 hover:text-foreground"
                            }`}
                          >
                            <span>{sp.name}</span>
                            {isSelected && <Check className="size-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected summary tags */}
              {(selectedFacultyIds.length > 0 || selectedStudyProgramIds.length > 0) && (
                <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                  <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Terpilih untuk buku ini:
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedFacultyIds.map((fid) => {
                      const fac = facultyOptions.find((f) => f.id === fid);
                      if (!fac) return null;
                      return (
                        <span
                          key={`fac-${fid}`}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          Fakultas: {fac.name}
                          <button
                            type="button"
                            onClick={() => toggleFaculty(fid)}
                            className="hover:text-red-600 ml-1"
                            title="Hapus fakultas"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      );
                    })}
                    {selectedStudyProgramIds.map((spid) => {
                      const sp = studyProgramOptions.find((p) => p.id === spid);
                      if (!sp) return null;
                      return (
                        <span
                          key={`sp-${spid}`}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        >
                          Prodi: {sp.name}
                          <button
                            type="button"
                            onClick={() => toggleStudyProgram(spid)}
                            className="hover:text-red-600 ml-1"
                            title="Hapus prodi"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t border-border">
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={formData.isPopular}
                  onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer"
                />
                <label
                  htmlFor="isPopular"
                  className="text-sm font-semibold text-foreground cursor-pointer select-none"
                >
                  Tampilkan di Beranda (Buku Populer)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: INVENTARIS & SALINAN */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Manajemen Inventaris & Salinan Buku
            </h3>

            {/* OPSI POLA KODE ITEM INVENTARISASI */}
            <div className="border border-border rounded-xl p-5 bg-muted/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Plus className="size-4 text-primary" />
                  POLA KODE BUKU &amp; EKSEMPLAR
                </h4>
              </div>

              {/* Guidance Card Antislop */}
              <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  <Info className="size-3.5 shrink-0" />
                  Panduan Pola Penomoran Eksemplar
                </p>
                <p className="leading-relaxed text-[11px] text-muted-foreground">
                  Nomor eksemplar dibentuk otomatis berjenjang mengikuti kode buku induk. Masukkan pola dasar atau klik tombol <strong>Generate</strong>.
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                  <span className="p-1.5 bg-white/80 dark:bg-background/80 rounded border border-blue-100 dark:border-blue-900/60 text-foreground">
                    Pola: <strong className="text-primary">PND-01</strong> &rarr; Eksemplar: <strong>PND-01-01</strong>, <strong>PND-01-02</strong>
                  </span>
                  <span className="p-1.5 bg-white/80 dark:bg-background/80 rounded border border-blue-100 dark:border-blue-900/60 text-foreground">
                    Pola: <strong className="text-primary">TI-2026-05</strong> &rarr; Eksemplar: <strong>TI-2026-05-01</strong>, <strong>TI-2026-05-02</strong>
                  </span>
                </div>
              </div>

              {step3Error && (
                <p className="text-xs text-destructive font-medium bg-red-50 p-2 rounded border border-red-200">
                  {step3Error}
                </p>
              )}

              <div className="grid gap-4 md:grid-cols-4 items-end">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                    Pola / Kode Item
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: PND-01"
                      value={polaKodeItem}
                      onChange={(e) => setPolaKodeItem(e.target.value.replace(/\s/g, ""))}
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      disabled={generatingCode}
                      className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      {generatingCode ? <Loader2 className="size-4 animate-spin" /> : "Generate"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                    No. Inventaris
                  </label>
                  <input
                    type="text"
                    placeholder="Sama dengan kode item jika kosong"
                    value={inventoryCodeInput}
                    onChange={(e) => setInventoryCodeInput(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase">
                    Tipe Koleksi / Lokasi
                  </label>
                  <Select
                    value={selectedLocationId}
                    onValueChange={(val) => setSelectedLocationId(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          locations.length === 0
                            ? "Belum ada data lokasi"
                            : "Pilih lokasi"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.room} - Rak {loc.rack} (Shelf {loc.shelf})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleSaveCopy}
                    className="w-full rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/95 transition-all"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>

            {/* SALINAN FISIK & LOKASI BUKU */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  SALINAN FISIK & LOKASI BUKU
                </h4>
                <div className="text-sm font-medium text-muted-foreground">
                  Jumlah Salinan:{" "}
                  <span className="font-bold text-primary px-2.5 py-1 bg-primary/10 rounded-lg">
                    {bib ? itemsList.length : localNewItems.length}
                  </span>
                </div>
              </div>

              {itemsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <Table className="w-full text-left text-sm">
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-transparent border-b border-border">
                        <TableHead className="px-4 py-3 text-xs uppercase font-bold text-muted-foreground">Kode Item</TableHead>
                        <TableHead className="px-4 py-3 text-xs uppercase font-bold text-muted-foreground">Lokasi / Rak</TableHead>
                        <TableHead className="px-4 py-3 text-xs uppercase font-bold text-muted-foreground">Status Ketersediaan</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs uppercase font-bold text-muted-foreground">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* For Editing Mode */}
                      {bib &&
                        (itemsList.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              Belum ada eksemplar fisik. Silakan input kode item di atas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          itemsList.map((item) => (
                            <TableRow key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <TableCell className="px-4 py-3 font-semibold text-foreground">
                                {item.itemCode}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-muted-foreground">
                                {item.location
                                  ? `${item.location.room} - Rak ${item.location.rack} (${item.location.shelf})`
                                  : "Sirkulasi"}
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    item.status === "available"
                                      ? "bg-success/10 text-success"
                                      : "bg-amber-500/10 text-amber-600"
                                  }`}
                                >
                                  {item.status === "available" ? "Tersedia" : item.status}
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCopy(item.id, item.itemCode)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        ))}

                      {/* For Creating Mode */}
                      {!bib &&
                        (localNewItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                              Belum ada eksemplar fisik. Silakan input kode item di atas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          localNewItems.map((item, idx) => (
                            <TableRow key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                              <TableCell className="px-4 py-3 font-semibold text-foreground">
                                {item.itemCode}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-muted-foreground">
                                {item.locationName}
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success">
                                  Tersedia
                                </span>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCopy(idx, item.itemCode)}
                                  className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          ))
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: KONTEN, SAMPUL & BERKAS */}
        {step === 4 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <h3 className="text-base font-semibold text-foreground border-b border-border pb-3">
              Konten, Sampul & Lampiran Digital
            </h3>

            {/* Keyword / Subjects */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Subyek / Kata Kunci Buku
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tambah subjek baru"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubject()}
                  className="rounded-lg bg-sidebar px-4 py-2 text-sm font-semibold text-white hover:bg-sidebar/95 transition-all"
                >
                  Tambah
                </button>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 border border-border rounded-xl">
                  {subjects.map((subj, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary border border-primary/20"
                    >
                      {subj.name}
                      <button
                        type="button"
                        onClick={() => removeSubject(idx)}
                        className="text-primary hover:text-red-700 font-bold ml-1 rounded-full hover:bg-primary/15 p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Cover and Visual Preview block */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Unggah Gambar Sampul Buku
                </label>
                <div className="relative border-2 border-dashed border-border hover:border-primary/50 transition-all rounded-xl p-8 bg-muted/20 text-center flex flex-col items-center justify-center gap-3 group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="size-10 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="text-sm font-medium text-foreground">
                    Klik untuk jelajah berkas atau tarik gambar ke sini
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Hanya file JPG, JPEG atau PNG. Maksimal 1MB
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Atau Masukkan URL Gambar Sampul
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                  />
                </div>
              </div>

              {/* PRATINJAU SAMPUL VISUAL */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Pratinjau Sampul Visual
                  </label>
                  {isUploadingCover && (
                    <span className="text-xs text-primary font-medium flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" /> Mengunggah ke S3...
                    </span>
                  )}
                </div>
                <div className="border border-border rounded-xl p-4 bg-muted/30 flex items-start gap-4 h-[180px] overflow-hidden">
                  <div className="relative w-28 h-full bg-card border border-border rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    {(() => {
                      const previewSrc = resolveCoverUrl(formData.image) || formData.image;
                      return previewSrc ? (
                        <img
                          src={previewSrc}
                          alt="Preview cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Book className="size-12 text-muted-foreground/40" />
                      );
                    })()}
                  </div>
                  <div className="flex flex-col justify-center h-full space-y-2 py-1">
                    <h4 className="font-bold text-base text-foreground line-clamp-2">
                      {formData.title || "Judul Buku"}
                    </h4>
                    <p className="text-sm text-muted-foreground font-semibold line-clamp-1">
                      {authors.filter((a) => a.name.trim()).map((a) => a.name).join(", ") || "Penulis"}
                    </p>
                    <p className="text-xs text-muted-foreground/80 font-mono line-clamp-1">
                      {formData.isbn && formData.issn
                        ? `ISBN: ${cleanIsbn(formData.isbn)} | ISSN: ${cleanIsbn(formData.issn)}`
                        : formData.isbn
                        ? `ISBN: ${cleanIsbn(formData.isbn)}`
                        : formData.issn
                        ? `ISSN: ${cleanIsbn(formData.issn)}`
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lampiran Berkas Digital */}
            <div className="space-y-3 pt-4 border-t border-border">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Lampiran Berkas Digital (E-BOOK/PDF)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-muted hover:bg-muted/80 text-muted-foreground font-semibold text-xs px-4 py-2.5 rounded-lg border border-border transition-all">
                  Browse...
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleDigitalFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-muted-foreground">
                  {digitalFile ? digitalFile.name : "No file selected."}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PRATINJAU & KONFIRMASI */}
        {step === 5 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Pratinjau & Konfirmasi Bibliografi
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Periksa kembali seluruh informasi data buku sebelum menyimpan ke sistem.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary border border-primary/20">
                <Check className="size-4" /> Siap Disimpan
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Sampul Preview */}
              <div className="md:col-span-1 space-y-3">
                <div className="border border-border rounded-xl p-4 bg-muted/20 flex flex-col items-center justify-center text-center gap-3 min-h-[220px]">
                  {formData.image ? (
                    <div className="relative w-36 h-48 rounded-lg overflow-hidden border border-border shadow-md">
                      <img
                        src={formData.image}
                        alt="Sampul Buku"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
                      <ImageIcon className="size-16 opacity-30 mb-2" />
                      <p className="text-xs font-medium">Belum ada gambar sampul</p>
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="mt-3 text-xs text-primary font-bold hover:underline"
                      >
                        + Tambah Sampul di Langkah 4
                      </button>
                    </div>
                  )}
                </div>

                {digitalFile && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    <Check className="size-4 shrink-0 text-emerald-600" />
                    <span className="truncate">File PDF: {digitalFile.name}</span>
                  </div>
                )}
              </div>

              {/* Rincian Ringkas Data */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-primary tracking-widest">
                    {formData.type ? formData.type.replace("_", " ") : "Buku Fisik"}
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    {formData.title || "Judul Belum Diisi"}
                  </h3>
                  <p className="text-sm font-semibold text-muted-foreground mt-1">
                    Oleh: {authors.filter((a) => a.name.trim()).map((a) => a.name).join(", ") || "Penulis belum diisi"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-4 rounded-xl border border-border">
                  <div>
                    <span className="text-muted-foreground font-semibold">ISBN:</span>
                    <p className="font-bold text-foreground font-mono mt-0.5">{formData.isbn ? cleanIsbn(formData.isbn) : "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">ISSN:</span>
                    <p className="font-bold text-foreground font-mono mt-0.5">{formData.issn ? cleanIsbn(formData.issn) : "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Edisi:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.edition || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Penerbit:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.publisherName || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Tahun Terbit:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.publishYear || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">GMD:</span>
                    <p className="font-medium text-foreground mt-0.5">
                      {formData.gmdId === "2" ? "Electronic" : formData.gmdId === "3" ? "Audio" : formData.gmdId === "4" ? "Video" : "Text"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Call Number:</span>
                    <p className="font-medium text-foreground mt-0.5">{formData.callNumber || "-"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Fakultas:</span>
                    <p className="font-medium text-foreground mt-0.5">
                      {selectedFacultyIds.length > 0
                        ? facultyOptions
                            .filter((f) => selectedFacultyIds.includes(f.id))
                            .map((f) => f.name)
                            .join(", ")
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-semibold">Program Studi:</span>
                    <p className="font-medium text-foreground mt-0.5">
                      {selectedStudyProgramIds.length > 0
                        ? studyProgramOptions
                            .filter((sp) => selectedStudyProgramIds.includes(sp.id))
                            .map((sp) => sp.name)
                            .join(", ")
                        : "-"}
                    </p>
                  </div>
                </div>

                {subjects.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-muted-foreground">Subjek / Kata Kunci:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {subjects.map((subj, idx) => (
                        <span key={idx} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {subj.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">Eksemplar yang akan terdaftar:</span>
                  <span className="font-bold text-primary">
                    {bib ? `${itemsList.length} Eksemplar Terdaftar` : `${localNewItems.length} Eksemplar Baru`}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
              <Info className="size-5 shrink-0 text-amber-600" />
              <span>
                Semua data sudah siap. Klik tombol <strong>"Simpan Bibliografi"</strong> di bawah untuk menyelesaikan penyimpanan.
              </span>
            </div>
          </div>
        )}

        {/* Wizard Navigation Action Controls */}
        <div className="flex justify-between items-center bg-card border border-border rounded-xl p-4 shadow-sm">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
            >
              Batalkan
            </button>
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-all"
              >
                Sebelumnya
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/95 transition-all"
              >
                Selanjutnya
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || hasExactConflict}
                onClick={handleSubmit}
                className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary/95 disabled:opacity-50 transition-all"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {bib ? "Simpan Perubahan" : "Simpan Bibliografi"}
              </button>
            )}
          </div>
        </div>
      </form>

    </div>
  );
}

export default BibliographyForm;
