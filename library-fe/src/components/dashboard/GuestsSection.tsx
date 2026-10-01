import { useState, Fragment, useRef, useEffect } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  UserPlus,
  UserCheck,
  Loader,
  X,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { dashboardDataService } from "@/services/dashboard/dashboardDataService";
import { useToast } from "@/hooks/useToast";
import { exportApi, importApi, facultyApi, studyProgramApi, type Faculty, type StudyProgram } from "@/api/client";
import AddMemberModal from "./AddMemberModal";
import AddGuestModal from "./AddGuestModal";

interface GuestLog {
  id: string;
  name: string;
  email?: string | null;
  identifier: string;
  faculty?: string | null;
  major?: string | null;
  institution?: string | null;
  purpose?: string | null;
  phone?: string | null;
  studyProgramId?: number | null;
  facultyId?: number | null;
  type?: "member" | "non-member" | string;
  visitDate: string;
  createdAt?: string;
}

interface GuestsSectionProps {
  guests: GuestLog[];
  members: any[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onDelete: (id: string, name: string) => void;
  onRefresh: () => void;
}

export default function GuestsSection({
  guests,
  members,
  searchTerm,
  onSearchChange,
  onRefresh
}: GuestsSectionProps) {
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isManualGuestModalOpen, setIsManualGuestModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"anggota" | "tamu">("anggota");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  // Dropdown state for picking a member to record as guest (tab buku tamu)
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [memberDropdownQuery, setMemberDropdownQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;
  const { success, error: showErrorToast } = useToast();
  const [exportingGuests, setExportingGuests] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filters for Faculty & Study Program
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("all");
  const [selectedStudyProgram, setSelectedStudyProgram] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    facultyApi
      .list()
      .then((res) => setFaculties(res.data || []))
      .catch((err) => console.error("Failed to load faculties:", err));

    studyProgramApi
      .list()
      .then((res) => setStudyPrograms(res.data || []))
      .catch((err) => console.error("Failed to load study programs:", err));
  }, []);

  const availableStudyPrograms =
    selectedFaculty === "all"
      ? studyPrograms
      : studyPrograms.filter((sp) => {
          const fid = Number(selectedFaculty);
          return sp.facultyId === fid || sp.faculty?.id === fid;
        });

  const handleFacultyChange = (value: string) => {
    setSelectedFaculty(value);
    setSelectedStudyProgram("all");
    setCurrentPage(1);
  };

  const handleStudyProgramChange = (value: string) => {
    setSelectedStudyProgram(value);
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    setCurrentPage(1);
  };

  const handleExportGuests = async () => {
    setExportingGuests(true);
    try {
      await exportApi.downloadGuests({ search: searchTerm || undefined });
      success("Export Berhasil", "Data pengunjung berhasil diunduh.");
    } catch (err: unknown) {
      showErrorToast("Export Gagal", err instanceof Error ? err.message : "Gagal mengunduh CSV");
    } finally {
      setExportingGuests(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isMemberDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsMemberDropdownOpen(false);
        setMemberDropdownQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMemberDropdownOpen]);

  const filteredGuests = guests.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      q === "" ||
      item.name.toLowerCase().includes(q) ||
      item.identifier.toLowerCase().includes(q) ||
      (item.faculty || "").toLowerCase().includes(q) ||
      (item.major || "").toLowerCase().includes(q) ||
      (item.institution || "").toLowerCase().includes(q) ||
      (item.purpose || "").toLowerCase().includes(q);

    const matchesFaculty =
      selectedFaculty === "all" ||
      (item.facultyId && String(item.facultyId) === selectedFaculty) ||
      (item.faculty &&
        faculties.find((f) => String(f.id) === selectedFaculty)?.name.toLowerCase() ===
          item.faculty.toLowerCase());

    const matchesStudyProgram =
      selectedStudyProgram === "all" ||
      (item.studyProgramId && String(item.studyProgramId) === selectedStudyProgram) ||
      (item.major &&
        studyPrograms
          .find((sp) => String(sp.id) === selectedStudyProgram)
          ?.name.toLowerCase() === item.major.toLowerCase());

    const matchesType =
      selectedType === "all" ||
      (item.type && item.type.toLowerCase() === selectedType.toLowerCase()) ||
      (!item.type && selectedType === "member");

    return matchesSearch && matchesFaculty && matchesStudyProgram && matchesType;
  });

  const filteredMembers = members.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      q === "" ||
      (item.user?.name || "").toLowerCase().includes(q) ||
      (item.nimNidn || "").toLowerCase().includes(q) ||
      (item.memberType || "").toLowerCase().includes(q);

    const matchesFaculty =
      selectedFaculty === "all" ||
      (item.faculty &&
        faculties.find((f) => String(f.id) === selectedFaculty)?.name.toLowerCase() ===
          item.faculty.toLowerCase());

    return matchesSearch && matchesFaculty;
  });

  const activeList = activeTab === "anggota" ? filteredMembers : filteredGuests;
  const totalPages = Math.max(1, Math.ceil(activeList.length / itemsPerPage));
  const paginatedList = activeList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleTabChange = (tab: "anggota" | "tamu") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    setCurrentPage(1);
  };

  // Catat kehadiran dari dropdown di tab "Buku Tamu"
  const handleQuickRecordFromDropdown = async (member: any) => {
    setIsMemberDropdownOpen(false);
    setMemberDropdownQuery("");
    setRecordingId(member.id);
    try {
      await dashboardDataService.recordVisit({
        name: member.user?.name || "Unknown",
        email: member.user?.email || "",
        identifier: member.nimNidn || "UNKNOWN",
        faculty: member.faculty || "Not Specified",
        major: "Not Specified"
      });
      success(
        "Kehadiran Dicatat",
        `${member.user?.name || "Pengunjung"} berhasil dicatat.`
      );
      onRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal mencatat kehadiran";
      showErrorToast("Gagal", message);
    } finally {
      setRecordingId(null);
    }
  };

  const filteredDropdownMembers = members.filter((m) => {
    const q = memberDropdownQuery.toLowerCase();
    return (
      (m.user?.name || "").toLowerCase().includes(q) ||
      (m.nimNidn || "").toLowerCase().includes(q)
    );
  });

  // Helper function to format date
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const isToday = new Date().toDateString() === date.toDateString();
      const time = date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit"
      });

      if (isToday) {
        return `Hari ini, ${time}`;
      }
      return `${date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}, ${time}`;
    } catch {
      return "Waktu tidak diketahui";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-extrabold text-foreground tracking-tight">
            Manajemen Pengguna
          </h2>
          <p className="text-muted-foreground font-medium text-[15px] mt-1">
            Kelola data keanggotaan dan riwayat pengunjung perpustakaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportGuests}
            disabled={exportingGuests}
            className="bg-card hover:bg-muted text-foreground border border-border px-5 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            title="Export riwayat pengunjung ke CSV"
          >
            {exportingGuests ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} strokeWidth={2.5} />
            )}
            Export CSV
          </button>

          <button
            onClick={() => setIsManualGuestModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus size={16} strokeWidth={2.5} />
            Input Pengunjung (Nama & Prodi)
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="bg-card hover:bg-muted text-foreground border border-border px-5 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            title="Import data pengunjung dari CSV"
          >
            <Upload size={16} strokeWidth={2.5} />
            Import Data
          </button>

          {activeTab === "anggota" ? (
            <button
              onClick={() => setIsMemberModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} /> Tambah Anggota
            </button>
          ) : (
          // Dropdown: pick an existing member to record as guest instantly
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsMemberDropdownOpen((v) => !v)}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all"
            >
              <UserCheck size={18} strokeWidth={2.5} />
              Catat Pengunjung
              <ChevronDown
                size={15}
                className={`transition-transform ${isMemberDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isMemberDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Dropdown Header */}
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
                      Pilih Anggota
                    </p>
                    <button
                      onClick={() => {
                        setIsMemberDropdownOpen(false);
                        setMemberDropdownQuery("");
                      }}
                      className="text-muted-foreground hover:text-muted-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Cari nama / NIM..."
                      value={memberDropdownQuery}
                      onChange={(e) => setMemberDropdownQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-500/10 focus:border-primary/40 outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Member list */}
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-50 pb-2">
                  {filteredDropdownMembers.length === 0 ? (
                    <p className="px-4 py-5 text-center text-xs text-muted-foreground">
                      Tidak ada anggota ditemukan
                    </p>
                  ) : (
                    filteredDropdownMembers.map((member) => (
                      <button
                        key={member.id}
                        disabled={recordingId === member.id}
                        onClick={() =>
                          void handleQuickRecordFromDropdown(member)
                        }
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-warning-bg transition-colors text-left group disabled:opacity-50 disabled:cursor-wait"
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                          {member.user?.image ? (
                            <img
                              src={member.user.image}
                              alt={member.user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <Users size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-slate-800 group-hover:text-primary truncate transition-colors">
                            {member.user?.name || "No Name"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {member.nimNidn || "-"} ·{" "}
                            {member.memberType?.replace("_", " ") || "student"}
                          </p>
                        </div>
                        {recordingId === member.id ? (
                          <Loader
                            size={14}
                            className="animate-spin text-primary shrink-0"
                          />
                        ) : (
                          <UserCheck
                            size={14}
                            className="text-muted-foreground group-hover:text-primary shrink-0 transition-colors"
                          />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Tabs Layout matching new designs: pills instead of bottom border */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => handleTabChange("anggota")}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
            activeTab === "anggota"
              ? "bg-card border-warning-border text-primary shadow-sm ring-1 ring-primary/10"
              : "bg-transparent border-transparent text-muted-foreground hover:text-slate-800 hover:bg-muted"
          }`}
        >
          Daftar Anggota Aktif
        </button>
        <button
          onClick={() => handleTabChange("tamu")}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
            activeTab === "tamu"
              ? "bg-card border-warning-border text-primary shadow-sm ring-1 ring-primary/10"
              : "bg-transparent border-transparent text-muted-foreground hover:text-slate-800 hover:bg-muted"
          }`}
        >
          Buku Tamu (Pengunjung)
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-card rounded-[24px] border border-border shadow-sm overflow-hidden flex flex-col">
        {/* Controls Bar */}
        <div className="p-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border-b border-border">
          {/* Dropdown Filters for Fakultas & Program Studi */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Fakultas */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Fakultas:</span>
              <select
                value={selectedFaculty}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className="px-3 py-2 bg-muted text-foreground border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Semua Fakultas</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Program Studi */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Prodi:</span>
              <select
                value={selectedStudyProgram}
                onChange={(e) => handleStudyProgramChange(e.target.value)}
                className="px-3 py-2 bg-muted text-foreground border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[200px] truncate"
              >
                <option value="all">Semua Prodi</option>
                {availableStudyPrograms.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Tipe on Buku Tamu */}
            {activeTab === "tamu" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Tipe:</span>
                <select
                  value={selectedType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="px-3 py-2 bg-muted text-foreground border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="member">Member UMC</option>
                  <option value="non-member">Tamu Non-Member</option>
                </select>
              </div>
            )}

            {(selectedFaculty !== "all" || selectedStudyProgram !== "all" || selectedType !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFaculty("all");
                  setSelectedStudyProgram("all");
                  setSelectedType("all");
                  setCurrentPage(1);
                }}
                className="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="relative w-full lg:w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder={
                activeTab === "anggota"
                  ? "Cari NIM, Nama..."
                  : "Cari Nama, NIM, Institusi..."
              }
              className="w-full pl-11 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500/10 focus:border-primary/40 transition-all outline-none placeholder:text-muted-foreground"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {activeTab === "tamu" ? (
                  <>
                    <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      WAKTU KEDATANGAN
                    </th>
                    <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      NAMA PENGUNJUNG
                    </th>
                    <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      TIPE
                    </th>
                    <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      PRODI / ASAL INSTANSI
                    </th>
                    <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      FAKULTAS
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      INFORMASI ANGGOTA
                    </th>
                    <th className="px-8 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      TIPE AKUN
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeTab === "tamu" ? (
                // BUKU TAMU RENDER
                paginatedList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-8 py-12 text-center text-muted-foreground"
                    >
                      <Users size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-semibold">
                        Tidak ada data pengunjung ditemukan
                      </p>
                    </td>
                  </tr>
                ) : (
                  (paginatedList as GuestLog[]).map((guest) => (
                    <tr
                      key={guest.id}
                      className="hover:bg-surface-hover/50 transition-colors group"
                    >
                      <td className="px-8 py-5">
                        <p className="text-[13px] font-medium text-muted-foreground">
                          {formatDate(
                            guest.visitDate ||
                              guest.createdAt ||
                              new Date().toISOString()
                          )}
                        </p>
                      </td>
                      <td className="px-8 py-5">
                        <div>
                          <p className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
                            {guest.name}
                          </p>
                          <p className="text-[11px] font-semibold text-muted-foreground tracking-wide mt-1">
                            {guest.identifier || "-"}
                            {guest.phone ? ` • ${guest.phone}` : ""}
                          </p>
                          {guest.purpose && (
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5 italic">
                              "{guest.purpose}"
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            guest.type === "non-member"
                              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          }`}
                        >
                          {guest.type === "non-member" ? "Non-Member" : "Member"}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[13px] font-semibold text-foreground">
                          {guest.major || guest.institution || "-"}
                        </p>
                        {guest.institution && guest.major !== guest.institution && (
                          <p className="text-[11px] text-muted-foreground">
                            {guest.institution}
                          </p>
                        )}
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-[13px] font-medium text-muted-foreground">
                          {guest.faculty || "-"}
                        </p>
                      </td>
                    </tr>
                  ))
                )
              ) : // DAFTAR ANGGOTA RENDER — view only
              paginatedList.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-8 py-12 text-center text-muted-foreground"
                  >
                    <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="font-semibold">
                      Tidak ada data anggota ditemukan
                    </p>
                  </td>
                </tr>
              ) : (
                (paginatedList as any[]).map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-surface-hover/50 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
                          {member.user?.image ? (
                            <img
                              src={member.user.image}
                              alt={member.user.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users size={20} />
                          )}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-foreground group-hover:text-primary transition-colors">
                            {member.user?.name || "No Name"}
                          </p>
                          <p className="text-[11px] font-semibold text-muted-foreground tracking-wide mt-1">
                            {member.nimNidn || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-[13px] font-bold text-muted-foreground capitalize">
                        {member.memberType?.replace("_", " ") || "student"}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {member.major || "-"}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Menampilkan{" "}
              {Math.min(
                (currentPage - 1) * itemsPerPage + 1,
                activeList.length
              )}
              –{Math.min(currentPage * itemsPerPage, activeList.length)} dari{" "}
              {activeList.length} data
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} /> Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 1
                )
                .map((p, idx, arr) => {
                  const showDot = idx > 0 && arr[idx - 1] !== p - 1;
                  return (
                    <Fragment key={p}>
                      {showDot && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                          currentPage === p
                            ? "bg-primary text-white shadow-md shadow-red-500/20"
                            : "text-muted-foreground hover:bg-surface-hover hover:text-muted-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    </Fragment>
                  );
                })}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-muted-foreground hover:bg-surface-hover rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AddMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onRefresh={onRefresh}
      />

      <AddGuestModal
        isOpen={isManualGuestModalOpen}
        onClose={() => setIsManualGuestModalOpen(false)}
        onRefresh={onRefresh}
      />

      <ImportGuestModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          onRefresh();
          success("Import Berhasil", "Data pengunjung telah diperbarui.");
        }}
      />
    </div>
  );
}

function ImportGuestModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ row: number; errors: string[] }>;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await importApi.downloadTemplate("guests");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal mengunduh template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await importApi.uploadGuests(file);
      setResult(res.data);
      if (res.data.successCount > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Import gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-[540px] rounded-[24px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <h2 className="text-foreground text-[16px] font-bold">Import Data Pengunjung</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl">
            <span>Gunakan format CSV dengan pemisah titik koma (;)</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              {downloadingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              Unduh Template
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {result && (
            <div className="p-4 bg-muted rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <CheckCircle size={16} className="text-emerald-500" />
                <span>Hasil Import: {result.successCount} berhasil dari {result.total} baris</span>
              </div>
              {result.errorCount > 0 && (
                <div className="text-destructive space-y-1 max-h-32 overflow-y-auto">
                  <p className="font-semibold">{result.errorCount} baris bermasalah:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {result.errors.slice(0, 5).map((e, idx) => (
                      <li key={idx}>Baris {e.row}: {e.errors.join(", ")}</li>
                    ))}
                    {result.errors.length > 5 && <li>...dan {result.errors.length - 5} baris lainnya</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5">Pilih File CSV</label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={!file || loading}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Upload & Proses
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
