import { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Loader2,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { useToast } from "@/hooks/useToast";
import { studyProgramApi, type StudyProgram } from "@/api/client";
import { repositoryService } from "@/services/repositoryService";
import {
  CHAPTER_CONFIGS,
  COMMON_PARTS_START,
  COMMON_PARTS_END,
  detectMajorChapterType,
  getProgramChapterConfig,
  type ChapterOption,
  type CustomProgramChapterSetting,
  type ProgramChapterSettingsMap,
  type MajorChapterType
} from "@/utils/thesisChapters";

interface ProgramChapterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialProgramId?: number;
}

export default function ProgramChapterSettingsModal({
  isOpen,
  onClose,
  onSaved,
  initialProgramId,
}: ProgramChapterSettingsModalProps) {
  const toast = useToast();

  const [programs, setPrograms] = useState<StudyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number>(initialProgramId || 1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Map konfigurasi yang tersimpan di backend
  const [customMap, setCustomMap] = useState<ProgramChapterSettingsMap>({});

  // State rincian bab utama yang sedang diedit
  const [totalChapters, setTotalChapters] = useState<number>(5);
  const [categoryLabel, setCategoryLabel] = useState<string>("");
  const [mainChapters, setMainChapters] = useState<ChapterOption[]>([]);

  // Load data prodi dan konfigurasi dari server
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    Promise.all([
      studyProgramApi.list(),
      repositoryService.getChapterSettings().catch(() => ({})),
    ])
      .then(([progRes, settingsRes]) => {
        if (!active) return;
        const progList = progRes.data || [];
        setPrograms(progList);
        const map = (settingsRes || {}) as ProgramChapterSettingsMap;
        setCustomMap(map);

        const targetId =
          initialProgramId && progList.some((p) => p.id === initialProgramId)
            ? initialProgramId
            : progList.length > 0
            ? progList[0].id
            : 1;

        setSelectedProgramId(targetId);
        loadProgramDraft(targetId, progList, map);
      })
      .catch((err) => {
        console.error("Gagal memuat pengaturan bab:", err);
        toast.error("Gagal Memuat", "Tidak dapat mengambil data program studi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, initialProgramId]);

  // Load draft untuk program studi terpilih
  const loadProgramDraft = (
    progId: number,
    progList: StudyProgram[] = programs,
    map: ProgramChapterSettingsMap = customMap
  ) => {
    const prog = progList.find((p) => p.id === progId) || null;
    const custom = map[progId] || map[String(progId)];

    if (custom && custom.chapters && custom.chapters.length > 0) {
      const mains = custom.chapters.filter((c) => c.isMainChapter);
      setTotalChapters(custom.totalChapters || mains.length || 5);
      setCategoryLabel(custom.categoryLabel || prog?.name || "");
      setMainChapters(mains);
    } else {
      const config = getProgramChapterConfig(prog);
      const mains = config.chapters.filter((c) => c.isMainChapter);
      setTotalChapters(config.totalChapters);
      setCategoryLabel(config.categoryLabel);
      setMainChapters(mains);
    }
  };

  const handleProgramChange = (newProgId: number) => {
    setSelectedProgramId(newProgId);
    loadProgramDraft(newProgId);
  };

  const handleTotalChaptersChange = (newTotal: number) => {
    const validTotal = Math.max(1, Math.min(10, newTotal));
    setTotalChapters(validTotal);

    setMainChapters((prevMains) => {
      const nextMains: ChapterOption[] = [];
      for (let i = 1; i <= validTotal; i++) {
        const val = `BAB_${i}`;
        const existing = prevMains.find((c) => c.value === val);
        if (existing) {
          nextMains.push({ ...existing });
        } else {
          nextMains.push({
            value: val,
            label: `BAB ${i}: Bab ${i}`,
            defaultTitle: `Bab ${i}`,
            description: "",
            isMainChapter: true,
          });
        }
      }
      return nextMains;
    });
  };

  // Terapkan Template Preset
  const applyPreset = (presetType: MajorChapterType) => {
    const presetConfig = CHAPTER_CONFIGS[presetType];
    const mains = presetConfig.chapters.filter((c) => c.isMainChapter);
    setTotalChapters(presetConfig.totalChapters);
    setCategoryLabel(presetConfig.categoryLabel);
    setMainChapters(mains.map((c) => ({ ...c })));
    toast.success("Preset Diterapkan", `Format ${presetConfig.categoryLabel} (${presetConfig.totalChapters} Bab) telah diterapkan.`);
  };

  // Reset ke Default Sistem
  const handleResetToDefault = () => {
    const prog = programs.find((p) => p.id === selectedProgramId) || null;
    const config = CHAPTER_CONFIGS[detectMajorChapterType(prog)];
    const mains = config.chapters.filter((c) => c.isMainChapter);
    setTotalChapters(config.totalChapters);
    setCategoryLabel(config.categoryLabel);
    setMainChapters(mains.map((c) => ({ ...c })));

    const nextMap = { ...customMap };
    delete nextMap[selectedProgramId];
    delete nextMap[String(selectedProgramId)];
    setCustomMap(nextMap);

    toast.info("Direset", `Format bab prodi ${prog?.name} dikembalikan ke default sistem.`);
  };

  // Simpan ke database
  const handleSave = async () => {
    if (mainChapters.length === 0) {
      toast.error("Validasi Gagal", "Minimal harus ada 1 bab.");
      return;
    }

    try {
      setSaving(true);
      const prog = programs.find((p) => p.id === selectedProgramId);
      const fullChapters = [...COMMON_PARTS_START, ...mainChapters, ...COMMON_PARTS_END];

      const customSetting: CustomProgramChapterSetting = {
        studyProgramId: selectedProgramId,
        programName: prog?.name,
        programCode: prog?.code || undefined,
        totalChapters: mainChapters.length,
        categoryLabel: categoryLabel.trim() || prog?.name || "Program Studi",
        badgeLabel: `Format ${mainChapters.length} BAB (Kustom)`,
        chapters: fullChapters,
        updatedAt: new Date().toISOString(),
      };

      const updatedMap: ProgramChapterSettingsMap = {
        ...customMap,
        [selectedProgramId]: customSetting,
      };

      await repositoryService.saveChapterSettings(updatedMap);
      setCustomMap(updatedMap);

      toast.success(
        "Tersimpan",
        `Struktur ${mainChapters.length} Bab untuk ${prog?.name} berhasil disimpan.`
      );

      if (onSaved) onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan pengaturan";
      toast.error("Gagal Menyimpan", msg);
    } finally {
      setSaving(false);
    }
  };

  const activeProg = programs.find((p) => p.id === selectedProgramId);
  const isCustomized = Boolean(customMap[selectedProgramId] || customMap[String(selectedProgramId)]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Struktur Bab Skripsi per Program Studi"
      size="xl"
      className="max-w-6xl w-full"
      bodyClassName="p-6"
    >
      <div className="space-y-6">
        {/* Panel Kontrol Atas: Pilihan Prodi, Status, Preset, dan Jumlah Bab */}
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Pemilihan Program Studi */}
            <div className="lg:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="size-4 text-primary" />
                  Program Studi
                </label>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isCustomized
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {isCustomized ? "Kustom Aktif" : "Default Sistem"}
                </span>
              </div>
              <select
                value={selectedProgramId}
                onChange={(e) => handleProgramChange(Number(e.target.value))}
                disabled={loading || saving}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {programs.map((prog) => {
                  const hasCustom = Boolean(customMap[prog.id] || customMap[String(prog.id)]);
                  return (
                    <option key={prog.id} value={prog.id}>
                      {prog.name} {prog.code ? `(${prog.code})` : ""} {hasCustom ? "— [Kustom]" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Pilihan Template Preset */}
            <div className="lg:col-span-7 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Template Cepat:</span>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    Reset ke Default
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset("TI")}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-muted border border-border transition-colors cursor-pointer"
                >
                  Informatika (6 Bab)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("STANDARD")}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-muted border border-border transition-colors cursor-pointer"
                >
                  Standar (5 Bab)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("TIND")}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-muted border border-border transition-colors cursor-pointer"
                >
                  Teknik Industri (6 Bab)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("KESEHATAN")}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-background hover:bg-muted border border-border transition-colors cursor-pointer"
                >
                  Kesehatan (6 Bab)
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Pemilihan Jumlah Bab (Segmented Control) */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-foreground">Jumlah Bab Utama:</span>
              <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5">
                {[3, 4, 5, 6, 7, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleTotalChaptersChange(num)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      totalChapters === num
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {num} Bab
                  </button>
                ))}
              </div>
            </div>

            {/* Label Format */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Label Format:</span>
              <input
                type="text"
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                placeholder={activeProg?.name || "Nama Format"}
                className="w-48 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Tabel Editor Bab Skripsi (Spacious, Clean, No Double Scrollbar) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Daftar Bab Naskah ({mainChapters.length} BAB)
            </span>
            <button
              type="button"
              onClick={() => handleTotalChaptersChange(totalChapters + 1)}
              disabled={totalChapters >= 10}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Tambah Bab
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <th className="px-3.5 py-2.5 w-20 text-center">Bab</th>
                  <th className="px-3.5 py-2.5 w-[28%]">Label Dropdown</th>
                  <th className="px-3.5 py-2.5 w-[28%]">Judul Standar Bab</th>
                  <th className="px-3.5 py-2.5">Keterangan Isi (Opsional)</th>
                  <th className="px-3.5 py-2.5 w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {mainChapters.map((chap, idx) => (
                  <tr key={chap.value} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3.5 py-2.5 text-center align-middle">
                      <span className="font-mono font-bold px-2 py-1 rounded bg-muted text-foreground inline-block">
                        BAB {idx + 1}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        required
                        value={chap.label}
                        onChange={(e) => {
                          const next = [...mainChapters];
                          next[idx].label = e.target.value;
                          setMainChapters(next);
                        }}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        required
                        value={chap.defaultTitle}
                        onChange={(e) => {
                          const next = [...mainChapters];
                          next[idx].defaultTitle = e.target.value;
                          setMainChapters(next);
                        }}
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <input
                        type="text"
                        value={chap.description || ""}
                        onChange={(e) => {
                          const next = [...mainChapters];
                          next[idx].description = e.target.value;
                          setMainChapters(next);
                        }}
                        placeholder="Cakupan pembahasan naskah..."
                        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td className="px-3.5 py-2.5 text-center align-middle">
                      {mainChapters.length > 1 && idx === mainChapters.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => handleTotalChaptersChange(totalChapters - 1)}
                          title="Hapus bab terakhir"
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            * Bagian Awal (Cover, Pengesahan, Abstrak) dan Bagian Akhir (Daftar Pustaka, Lampiran) otomatis disertakan pada semua program studi.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </Modal>
  );
}
