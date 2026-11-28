import { useState, useEffect, useRef, useCallback } from "react";
import {
  IdCard,
  User,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Camera,
  ScanLine,
} from "lucide-react";
import { studyProgramApi, guestApi, type StudyProgram } from "@/api/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CameraScannerModal } from "@/components/dashboard/circulation/CameraScannerModal";
import LogoUmc from "@/assets/logo_umc.png";
import BgLibrary from "@/assets/bg1.jpeg";

// Native Web Audio API beep for attendance confirmation
function playKioskBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Audio context may fail if user hasn't interacted with page yet
  }
}

function isMemberNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("tidak ditemukan") ||
    msg.includes("not found") ||
    msg.includes("not_found")
  );
}

const GENERAL_PUBLIC_OPTION = "Umum / Pengunjung Luar";

// Fallback list of UMC study programs
const FALLBACK_STUDY_PROGRAMS = [
  "Teknik Informatika",
  "Sistem Informasi",
  "Ilmu Komunikasi",
  "Manajemen",
  "Akuntansi",
  "Ilmu Hukum",
  "Ilmu Pemerintahan",
  "Pendidikan Guru Sekolah Dasar (PGSD)",
  "Pendidikan Guru PAUD (PGPAUD)",
  "Pendidikan Matematika",
  "Pendidikan Bahasa Inggris",
  "Pendidikan Kimia",
  "Pendidikan Biologi",
  "Ilmu Keperawatan",
  "Profesi Ners",
  "D3 Kebidanan",
  "Farmasi",
  "Agroteknologi",
  "Peternakan",
  "Teknik Industri",
  "Pariwisata",
];

export default function Absensi() {
  // Form State
  const [nim, setNim] = useState("");
  const [fullName, setFullName] = useState("");
  const [studyProgram, setStudyProgram] = useState("");
  const [studyProgramsList, setStudyProgramsList] = useState<
    { id: string | number; name: string }[]
  >([]);

  // UI / Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    name: string;
    nim?: string;
    cardNumber?: string;
    major?: string;
    isMember?: boolean;
    alreadyCheckedIn?: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Live Clock & Date State
  const [currentTime, setCurrentTime] = useState(new Date());

  const nimInputRef = useRef<HTMLInputElement>(null);
  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef(false);

  // Focus NIM / Card input automatically on load
  const focusNimInput = useCallback(() => {
    nimInputRef.current?.focus();
  }, []);

  useEffect(() => {
    focusNimInput();
  }, [focusNimInput]);

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Study Programs from API with fallback
  useEffect(() => {
    let active = true;
    studyProgramApi
      .list()
      .then((res) => {
        if (!active) return;
        const raw = res.data || [];
        if (raw.length > 0) {
          setStudyProgramsList(
            raw.map((sp: StudyProgram) => ({ id: sp.id, name: sp.name }))
          );
        } else {
          setStudyProgramsList(
            FALLBACK_STUDY_PROGRAMS.map((name, idx) => ({ id: idx + 1, name }))
          );
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Gagal memuat prodi:", err);
        setStudyProgramsList(
          FALLBACK_STUDY_PROGRAMS.map((name, idx) => ({ id: idx + 1, name }))
        );
      });
    return () => {
      active = false;
    };
  }, []);

  // Direct Card / NIM Scan Attendance (without needing Nama & Prodi)
  const executeCardScan = useCallback(
    async (rawIdentifier: string) => {
      const trimmed = rawIdentifier.trim();
      if (!trimmed) {
        setErrorMessage(
          "Silakan scan kartu anggota atau masukkan NIM/No. Kartu."
        );
        focusNimInput();
        return;
      }

      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const response = await guestApi.scan(trimmed);
        if (response.data) {
          playKioskBeep();
          setSuccessData({
            name: response.data.name,
            nim: response.data.nim || undefined,
            cardNumber: response.data.cardNumber || undefined,
            major:
              response.data.prodi ||
              response.data.faculty ||
              "Anggota Perpustakaan",
            isMember: true,
            alreadyCheckedIn: Boolean(response.data.alreadyCheckedIn),
          });
          setNim("");
          setFullName("");
          setStudyProgram("");
          return;
        }
      } catch (err: unknown) {
        if (isMemberNotFoundError(err)) {
          setErrorMessage(
            "Kartu atau NIM belum terdaftar sebagai anggota. Silakan lengkapi Nama Lengkap dan Program Studi untuk presensi tamu."
          );
          fullNameInputRef.current?.focus();
        } else {
          const msg =
            err instanceof Error
              ? err.message
              : "Gagal memproses scan kartu. Silakan coba lagi.";
          setErrorMessage(msg);
        }
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [focusNimInput]
  );

  // Handle Camera QR / Barcode Scan Success
  const handleCameraScanSuccess = useCallback(
    (scannedText: string) => {
      setIsCameraOpen(false);
      setNim(scannedText);
      void executeCardScan(scannedText);
    },
    [executeCardScan]
  );

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNim = nim.trim();
    const trimmedName = fullName.trim();
    const selectedProdi = studyProgram.trim();

    if (!trimmedNim && !trimmedName) {
      setErrorMessage(
        "Silakan scan kartu / ketik NIM, atau isi Nama Lengkap untuk pengunjung umum."
      );
      focusNimInput();
      return;
    }

    // Jika hanya NIM / Kartu Anggota yang diisi, proses langsung sebagai scan anggota
    if (trimmedNim && !trimmedName && !selectedProdi) {
      await executeCardScan(trimmedNim);
      return;
    }

    if (!trimmedName) {
      setErrorMessage("Silakan isi Nama Lengkap Anda.");
      fullNameInputRef.current?.focus();
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Step 1: Jika NIM/kartu diisi, coba scan member terlebih dahulu
      let recorded = false;
      let isAlreadyCheckedIn = false;
      let isMember = false;
      let resolvedName = trimmedName;
      const isGeneralPublic =
        !selectedProdi || selectedProdi === GENERAL_PUBLIC_OPTION;
      let resolvedProdi = isGeneralPublic ? "Pengunjung Umum" : selectedProdi;
      let resolvedNim: string | undefined = trimmedNim || undefined;
      let resolvedCardNumber: string | undefined;

      if (trimmedNim) {
        try {
          const scanRes = await guestApi.scan(trimmedNim);
          if (scanRes.data) {
            recorded = true;
            isMember = true;
            isAlreadyCheckedIn = Boolean(scanRes.data.alreadyCheckedIn);
            resolvedName = scanRes.data.name || trimmedName;
            resolvedProdi =
              scanRes.data.prodi || scanRes.data.faculty || resolvedProdi;
            resolvedNim = scanRes.data.nim || trimmedNim;
            resolvedCardNumber = scanRes.data.cardNumber;
          }
        } catch (scanErr: unknown) {
          if (!isMemberNotFoundError(scanErr)) {
            throw scanErr;
          }
          // Tidak terdaftar sebagai member, lanjut catat sebagai pengunjung umum / non-member
        }
      }

      // Step 2: Catat sebagai pengunjung umum / non-member (tanpa wajib NIM)
      if (!recorded) {
        const matchedProdi = !isGeneralPublic
          ? studyProgramsList.find(
              (sp) => sp.name.toLowerCase() === selectedProdi.toLowerCase()
            )
          : undefined;
        const prodiId =
          matchedProdi && typeof matchedProdi.id === "number"
            ? matchedProdi.id
            : null;

        await guestApi.createNonMember({
          fullName: trimmedName,
          institution: isGeneralPublic
            ? "Pengunjung Umum"
            : "Universitas Muhammadiyah Cirebon",
          purpose: "Kunjungan Perpustakaan",
          phone: trimmedNim.length >= 8 ? trimmedNim : "",
          studyProgramId: prodiId,
        });
        recorded = true;
        isMember = false;
      }

      playKioskBeep();
      setSuccessData({
        name: resolvedName,
        nim: resolvedNim,
        cardNumber: resolvedCardNumber,
        major: resolvedProdi,
        isMember,
        alreadyCheckedIn: isAlreadyCheckedIn,
      });

      // Clear input form
      setNim("");
      setFullName("");
      setStudyProgram("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal mencatat absensi. Silakan coba lagi.";
      setErrorMessage(msg);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Auto-dismiss success modal countdown & Escape shortcut
  useEffect(() => {
    if (!successData) return;
    setCountdown(4);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSuccessData(null);
        focusNimInput();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSuccessData(null);
          focusNimInput();
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, [successData, focusNimInput]);

  const closeSuccessModal = () => {
    setSuccessData(null);
    focusNimInput();
  };

  // Indonesian Date Formatter (e.g., "Selasa, 6 Oktober 2026")
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(currentTime);

  // Indonesian Time Formatter (e.g., "10:24")
  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div
      className="relative min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden w-full flex flex-col justify-between overflow-x-hidden bg-cover bg-center font-sans select-none"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.40) 0%, rgba(255, 255, 255, 0.20) 50%, rgba(255, 255, 255, 0.15) 100%), url(${BgLibrary})`,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Subtle Warm Overlay for Depth & Crisp Contrast */}
      <div className="absolute inset-0 bg-white/20 dark:bg-slate-950/40 pointer-events-none" />

      {/* Decorative Red Curved Wave Shapes at Bottom-Left (Matching Design) */}
      <div className="absolute bottom-0 left-0 w-64 sm:w-80 lg:w-88 h-64 sm:h-80 lg:h-88 pointer-events-none overflow-hidden z-0">
        <svg
          viewBox="0 0 350 350"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M-50 380 C-40 240, 100 180, 240 260 C290 290, 310 350, 310 380 Z"
            fill="#9D171D"
            fillOpacity="0.45"
          />
          <path
            d="M-60 390 C-30 270, 70 230, 170 300 C210 330, 230 360, 230 390 Z"
            fill="#B30E16"
            fillOpacity="0.85"
          />
        </svg>
      </div>

      {/* TOP HEADER BAR */}
      <header className="relative w-full z-20 flex items-center justify-between px-4 sm:px-10 lg:px-14 pt-3 sm:pt-5 pb-1 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src={LogoUmc}
            alt="Logo UMC"
            className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0 drop-shadow-xs"
          />
          <div>
            <h1 className="font-extrabold text-slate-900 dark:text-foreground text-xs sm:text-base leading-tight tracking-tight">
              UMC Library
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-muted-foreground font-medium leading-tight">
              Digital Library System
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300">
            {formattedDate}
          </p>
          <p className="text-xl sm:text-3xl font-black text-slate-900 dark:text-foreground tracking-tight leading-none mt-0.5">
            {formattedTime}
          </p>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-10 lg:px-14 py-3 sm:py-4 flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-5 sm:gap-8 lg:gap-12">
        {/* LEFT COLUMN: Glassmorphism Welcome Card */}
        <div className="w-full lg:max-w-xl">
          <div className="backdrop-blur-md bg-white/70 dark:bg-card/70 border border-white/70 dark:border-border/60 rounded-2xl sm:rounded-3xl p-5 sm:p-8 lg:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all">
            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-black text-slate-900 dark:text-foreground leading-[1.15] tracking-tight">
              Selamat Datang di
            </h2>
            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-black text-[#9D171D] leading-[1.15] tracking-tight mt-1">
              Perpustakaan UMC
            </h2>

            <p className="text-slate-600 dark:text-muted-foreground text-xs sm:text-sm lg:text-base font-normal leading-relaxed mt-2.5 sm:mt-4 max-w-md">
              Silahkan lakukan absen kunjungan sebelum memasuki area perpustakaan
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean White Form Card ("Absen Pengunjung") */}
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="bg-white dark:bg-card rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-border/80">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-foreground tracking-tight">
                Absen Pengunjung
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#9D171D] px-2.5 py-1 text-[11px] font-bold shrink-0 border border-red-100 dark:border-red-900/50">
                <ScanLine className="w-3.5 h-3.5" />
                <span>Support Scan Kartu</span>
              </span>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="mb-3.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
              {/* Field 1: NIM / Kartu Anggota + Scan Kamera */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  NIM / Kartu Anggota{" "}
                  <span className="text-[11px] font-normal text-slate-400 dark:text-muted-foreground">
                    (opsional untuk umum)
                  </span>
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1 flex items-center">
                    <div className="absolute left-3.5 pointer-events-none text-slate-400">
                      <IdCard className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.8} />
                    </div>
                    <input
                      ref={nimInputRef}
                      type="text"
                      value={nim}
                      onChange={(e) => {
                        setNim(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (fullName.trim() && studyProgram.trim()) {
                            void handleSubmit(e as unknown as React.FormEvent);
                          } else {
                            void executeCardScan(nim);
                          }
                        }
                      }}
                      placeholder="Scan kartu anggota / ketik NIM..."
                      autoComplete="off"
                      className="w-full bg-[#F1F3F5] dark:bg-muted/60 border border-slate-200/90 dark:border-border rounded-xl pl-10 sm:pl-11 pr-3 py-2.5 sm:py-3 text-sm font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 focus:outline-none focus:border-[#9D171D] focus:ring-2 focus:ring-[#9D171D]/15 transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    disabled={isSubmitting}
                    aria-label="Scan Kamera"
                    title="Scan Barcode / QR Kartu via Kamera"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all active:scale-[0.98] disabled:opacity-60 shrink-0 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Scan Kartu</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-1 leading-snug">
                  💡 Scan kartu / tekan <strong>Scan Kartu</strong> untuk absensi cepat tanpa isi Nama &amp; Prodi.
                </p>
              </div>

              {/* Field 2: Nama Lengkap (tetap tampil untuk tamu / manual) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Nama Lengkap{" "}
                  <span className="text-[11px] font-normal text-slate-400 dark:text-muted-foreground">
                    (opsional jika scan kartu)
                  </span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 pointer-events-none text-slate-400">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.8} />
                  </div>
                  <input
                    ref={fullNameInputRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ahmad Rizky Pratama"
                    autoComplete="off"
                    className="w-full bg-[#F1F3F5] dark:bg-muted/60 border border-slate-200/90 dark:border-border rounded-xl pl-10 sm:pl-11 pr-3 py-2.5 sm:py-3 text-sm font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 focus:outline-none focus:border-[#9D171D] focus:ring-2 focus:ring-[#9D171D]/15 transition-all"
                  />
                </div>
              </div>

              {/* Field 3: Program Studi (tetap tampil untuk tamu / manual) */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Program Studi{" "}
                  <span className="text-[11px] font-normal text-slate-400 dark:text-muted-foreground">
                    (opsional jika scan kartu)
                  </span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 z-10 pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.8} />
                  </div>
                  <Select value={studyProgram} onValueChange={setStudyProgram}>
                    <SelectTrigger className="h-auto w-full bg-[#F1F3F5] dark:bg-muted/60 border border-slate-200/90 dark:border-border rounded-xl pl-10 sm:pl-11 pr-3 py-2.5 sm:py-3 text-sm font-medium text-slate-800 dark:text-foreground focus:border-[#9D171D] focus:ring-2 focus:ring-[#9D171D]/15 transition-all">
                      <SelectValue placeholder="Pilih program studi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GENERAL_PUBLIC_OPTION}>
                        {GENERAL_PUBLIC_OPTION}
                      </SelectItem>
                      {studyProgramsList.map((prodi) => (
                        <SelectItem key={prodi.id} value={prodi.name}>
                          {prodi.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Button: Masuk */}
              <div className="pt-1 sm:pt-1.5">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#B30E16] hover:bg-[#8F0B11] text-white font-bold py-3 sm:py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Masuk</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-2.5 sm:py-3 text-center text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium shrink-0">
        Perpustakaan Universitas Muhammadiyah Cirebon &bull; Kiosk Presensi Mandiri
      </footer>

      {/* CAMERA SCANNER MODAL */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          focusNimInput();
        }}
        onScanSuccess={handleCameraScanSuccess}
      />

      {/* SUCCESS MODAL POPUP */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-card rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-100 dark:border-border text-center overflow-hidden">
            <button
              type="button"
              onClick={closeSuccessModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="w-9 h-9" strokeWidth={2.2} />
            </div>

            <p className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
              {successData.alreadyCheckedIn
                ? "Kehadiran Sudah Tercatat"
                : "Presensi Berhasil!"}
            </p>
            <h4 className="text-2xl font-black text-slate-900 dark:text-foreground tracking-tight mb-2">
              Selamat Datang!
            </h4>

            <div className="bg-slate-50 dark:bg-muted/40 border border-slate-200/80 dark:border-border rounded-2xl p-4 sm:p-5 text-left my-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Pengunjung Terdaftar
                </p>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    successData.isMember
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                  }`}
                >
                  {successData.isMember ? "Member" : "Non-Member"}
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-foreground mt-0.5 truncate">
                {successData.name}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-border/60 text-xs">
                {successData.cardNumber && (
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Kartu: {successData.cardNumber}
                  </span>
                )}
                {successData.nim && (
                  <span className="font-mono font-bold text-[#9D171D] bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                    NIM: {successData.nim}
                  </span>
                )}
                <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                  {successData.major}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Silakan memasuki area perpustakaan. Selamat belajar!</span>
            </p>

            <button
              type="button"
              onClick={closeSuccessModal}
              className="w-full bg-[#B30E16] hover:bg-[#8F0B11] text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              Selesai ({countdown}s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
