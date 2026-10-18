import { useState, useEffect, useRef, useCallback } from "react";
import {
  IdCard,
  User,
  GraduationCap,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { studyProgramApi, guestApi, type StudyProgram } from "@/api/client";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    name: string;
    nim?: string;
    major?: string;
    alreadyCheckedIn?: boolean;
  } | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Live Clock & Date State
  const [currentTime, setCurrentTime] = useState(new Date());

  const nimInputRef = useRef<HTMLInputElement>(null);

  // Focus NIM input automatically on load
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
    studyProgramApi
      .list()
      .then((res) => {
        const raw = res.data || [];
        if (raw.length > 0) {
          setStudyProgramsList(raw.map((sp: StudyProgram) => ({ id: sp.id, name: sp.name })));
        } else {
          setStudyProgramsList(
            FALLBACK_STUDY_PROGRAMS.map((name, idx) => ({ id: idx + 1, name }))
          );
        }
      })
      .catch((err) => {
        console.error("Gagal memuat prodi:", err);
        setStudyProgramsList(
          FALLBACK_STUDY_PROGRAMS.map((name, idx) => ({ id: idx + 1, name }))
        );
      });
  }, []);

  // Auto-lookup member details when NIM is entered/scanned
  const handleNimBlurOrEnter = async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed.length < 5) return;

    try {
      const response = await guestApi.scan(trimmed);
      if (response.data?.name) {
        setFullName(response.data.name);
      }
      if (response.data?.prodi) {
        // Find matching study program
        const prodiName = response.data.prodi;
        const match = studyProgramsList.find(
          (sp) => sp.name.toLowerCase() === prodiName.toLowerCase()
        );
        if (match) {
          setStudyProgram(match.name);
        } else {
          setStudyProgram(prodiName);
        }
      }
    } catch {
      // If scan fails or student is not pre-registered, let user enter manually
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNim = nim.trim();
    const trimmedName = fullName.trim();
    const selectedProdi = studyProgram.trim();

    if (!trimmedNim || !trimmedName || !selectedProdi) {
      setErrorMessage("Silakan lengkapi NIM, Nama Lengkap, dan Program Studi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Step 1: Attempt standard member scan first
      let recorded = false;
      let isAlreadyCheckedIn = false;

      try {
        const scanRes = await guestApi.scan(trimmedNim);
        if (scanRes.data) {
          recorded = true;
          isAlreadyCheckedIn = Boolean(scanRes.data.alreadyCheckedIn);
        }
      } catch {
        // Not registered as member, fall back to direct absensi creation
      }

      // Step 2: Fallback to createAbsensi or createNonMember if scan did not catch it
      if (!recorded) {
        try {
          await guestApi.createAbsensi({
            name: trimmedName,
            major: selectedProdi,
          });
          recorded = true;
        } catch {
          // Alternative fallback to non-member guest record
          await guestApi.createNonMember({
            fullName: trimmedName,
            institution: "Universitas Muhammadiyah Cirebon",
            purpose: "Kunjungan Perpustakaan",
            phone: trimmedNim,
          });
          recorded = true;
        }
      }

      playKioskBeep();
      setSuccessData({
        name: trimmedName,
        nim: trimmedNim,
        major: selectedProdi,
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
      setIsSubmitting(false);
    }
  };

  // Auto-dismiss success modal countdown
  useEffect(() => {
    if (!successData) return;
    setCountdown(4);

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

    return () => clearInterval(interval);
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
      className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-cover bg-center font-sans select-none"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.40) 0%, rgba(255, 255, 255, 0.20) 50%, rgba(255, 255, 255, 0.15) 100%), url(${BgLibrary})`,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Subtle Warm Overlay for Depth & Crisp Contrast */}
      <div className="absolute inset-0 bg-white/20 dark:bg-slate-950/40 pointer-events-none" />

      {/* Decorative Red Curved Wave Shapes at Bottom-Left (Matching Design) */}
      <div className="absolute bottom-0 left-0 w-80 sm:w-96 h-80 sm:h-96 pointer-events-none overflow-hidden z-0">
        <svg
          viewBox="0 0 350 350"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Outer softer wave */}
          <path
            d="M-50 380 C-40 240, 100 180, 240 260 C290 290, 310 350, 310 380 Z"
            fill="#9D171D"
            fillOpacity="0.45"
          />
          {/* Inner primary red wave */}
          <path
            d="M-60 390 C-30 270, 70 230, 170 300 C210 330, 230 360, 230 390 Z"
            fill="#B30E16"
            fillOpacity="0.85"
          />
        </svg>
      </div>

      {/* TOP HEADER BAR */}
      <header className="relative w-full z-20 flex items-center justify-between px-6 sm:px-12 lg:px-16 pt-6 sm:pt-8">
        {/* Left: UMC Library Logo & Title */}
        <div className="flex items-center gap-3 sm:gap-3.5">
          <img
            src={LogoUmc}
            alt="Logo UMC"
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 drop-shadow-xs"
          />
          <div>
            <h1 className="font-extrabold text-slate-900 dark:text-foreground text-sm sm:text-base leading-tight tracking-tight">
              UMC Library
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-muted-foreground font-medium leading-tight">
              Digital Library System
            </p>
          </div>
        </div>

        {/* Right: Real-time Live Date & Digital Clock */}
        <div className="text-right">
          <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            {formattedDate}
          </p>
          <p className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-foreground tracking-tight leading-none mt-0.5">
            {formattedTime}
          </p>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12 flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">
        {/* LEFT COLUMN: Glassmorphism Welcome Card */}
        <div className="w-full lg:max-w-xl">
          <div className="backdrop-blur-md bg-white/70 dark:bg-card/70 border border-white/70 dark:border-border/60 rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all">
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 dark:text-foreground leading-[1.15] tracking-tight">
              Selamat Datang di
            </h2>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-[#9D171D] leading-[1.15] tracking-tight mt-1">
              Perpustakaan UMC
            </h2>

            <p className="text-slate-600 dark:text-muted-foreground text-sm sm:text-base font-normal leading-relaxed mt-4 sm:mt-6 max-w-md">
              Silahkan lakukan absen kunjungan sebelum memasuki area perpustakaan
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean White Form Card ("Absen Pengunjung") */}
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="bg-white dark:bg-card rounded-3xl p-7 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-border/80">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-foreground tracking-tight mb-6 sm:mb-8">
              Absen Pengunjung
            </h3>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Field 1: NIM */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  NIM <span className="text-red-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none text-slate-400">
                    <IdCard className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <input
                    ref={nimInputRef}
                    type="text"
                    required
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    onBlur={(e) => handleNimBlurOrEnter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleNimBlurOrEnter(nim);
                      }
                    }}
                    placeholder="Masukkan NIM Anda"
                    autoComplete="off"
                    className="w-full bg-[#F1F3F5] dark:bg-muted/60 border border-slate-200/90 dark:border-border rounded-xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 focus:outline-none focus:border-[#9D171D] focus:ring-2 focus:ring-[#9D171D]/15 transition-all"
                  />
                </div>
              </div>

              {/* Field 2: Nama Lengkap */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Nama Lengkap <span className="text-red-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none text-slate-400">
                    <User className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ahmad Rizky Pratama"
                    autoComplete="off"
                    className="w-full bg-[#F1F3F5] dark:bg-muted/60 border border-slate-200/90 dark:border-border rounded-xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 focus:outline-none focus:border-[#9D171D] focus:ring-2 focus:ring-[#9D171D]/15 transition-all"
                  />
                </div>
              </div>

              {/* Field 3: Program Studi */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Program Studi <span className="text-red-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 pointer-events-none text-slate-400">
                    <GraduationCap className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <select
                    required
                    value={studyProgram}
                    onChange={(e) => setStudyProgram(e.target.value)}
                    className="w-full bg-[#F1F3F5] dark:bg-muted/60 border border-slate-200/90 dark:border-border rounded-xl pl-12 pr-10 py-3.5 text-sm sm:text-base font-medium text-slate-800 dark:text-foreground focus:outline-none focus:border-[#9D171D] focus:ring-2 focus:ring-[#9D171D]/15 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled className="text-slate-400">
                      Pilih program studi
                    </option>
                    {studyProgramsList.map((prodi) => (
                      <option
                        key={prodi.id}
                        value={prodi.name}
                        className="text-slate-800 dark:text-foreground"
                      >
                        {prodi.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 pointer-events-none text-slate-400">
                    <ChevronDown className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
              </div>

              {/* Action Button: Masuk */}
              <div className="pt-2 sm:pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#B30E16] hover:bg-[#8F0B11] text-white font-bold py-3.5 sm:py-4 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 text-base cursor-pointer"
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

      {/* FOOTER / SUBTLE ATTRIBUTION */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
        Perpustakaan Universitas Muhammadiyah Cirebon &bull; Kiosk Presensi Mandiri
      </footer>

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

            {/* Success Icon */}
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

            {/* Visitor Details Card */}
            <div className="bg-slate-50 dark:bg-muted/40 border border-slate-200/80 dark:border-border rounded-2xl p-4 sm:p-5 text-left my-4">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Pengunjung Terdaftar
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-foreground mt-0.5 truncate">
                {successData.name}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-border/60 text-xs">
                <span className="font-mono font-bold text-[#9D171D] bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md">
                  NIM: {successData.nim}
                </span>
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