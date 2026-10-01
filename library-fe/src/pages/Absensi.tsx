import { useState, useRef, useEffect, useCallback } from "react";
import {
  BookOpen,
  QrCode,
  UserCheck,
  User,
  Building,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Camera,
  X,
  CreditCard,
  ArrowRight,
  Sparkles,
  Volume2
} from "lucide-react";
import {
  guestApi,
  studyProgramApi,
  type GuestScanResponse,
  type StudyProgram
} from "@/api/client";

// ponytail: Native Web Audio API beep; add sound file assets when dedicated audio pack is required.
function playKioskBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio context may fail if user hasn't interacted with page yet
  }
}

export default function Absensi() {
  const [activeTab, setActiveTab] = useState<"member" | "non-member">("member");

  // Tab 1: Member Scan states
  const [memberIdentifier, setMemberIdentifier] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<GuestScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Tab 2: Non-Member states
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [purpose, setPurpose] = useState("Membaca Buku");
  const [phone, setPhone] = useState("");
  const [studyProgramId, setStudyProgramId] = useState<string>("");
  const [studyPrograms, setStudyPrograms] = useState<StudyProgram[]>([]);
  const [isSubmittingNonMember, setIsSubmittingNonMember] = useState(false);
  const [nonMemberSuccess, setNonMemberSuccess] = useState<string | null>(null);
  const [nonMemberError, setNonMemberError] = useState<string | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-focus input for USB barcode scanner
  const focusScanInput = useCallback(() => {
    if (activeTab === "member" && !scanResult) {
      scanInputRef.current?.focus();
    }
  }, [activeTab, scanResult]);

  useEffect(() => {
    focusScanInput();
  }, [focusScanInput]);

  // Load study programs for non-member form
  useEffect(() => {
    studyProgramApi
      .list()
      .then((res) => setStudyPrograms(res.data || []))
      .catch((err) => console.error("Failed to fetch study programs:", err));
  }, []);

  // Countdown timer for auto-dismiss member card modal
  useEffect(() => {
    if (!scanResult) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setScanResult(null);
          focusScanInput();
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scanResult, focusScanInput]);

  // Camera toggle logic
  useEffect(() => {
    if (!cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Camera access failed:", err);
        setCameraActive(false);
        setScanError("Kamera tidak dapat diakses. Gunakan scanner gun USB atau input manual.");
      });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cameraActive]);

  // Handle Member Scan Submit
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = memberIdentifier.trim();
    if (!id) return;

    setIsScanning(true);
    setScanError(null);
    setIsNotFound(false);

    try {
      const response = await guestApi.scan(id);
      playKioskBeep();
      setScanResult(response.data);
      setMemberIdentifier("");
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      playKioskBeep();
      if (errorObj?.code === "not_found" || errorObj?.message?.toLowerCase().includes("tidak ditemukan")) {
        setIsNotFound(true);
        setScanError("Data anggota tidak ditemukan dalam sistem.");
      } else {
        setScanError(errorObj?.message || "Gagal memverifikasi kartu anggota. Coba lagi.");
      }
    } finally {
      setIsScanning(false);
      focusScanInput();
    }
  };

  // Handle Non-Member Submit
  const handleNonMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !institution.trim() || !phone.trim()) {
      setNonMemberError("Mohon lengkapi nama, institusi, dan nomor HP.");
      return;
    }

    setIsSubmittingNonMember(true);
    setNonMemberError(null);
    setNonMemberSuccess(null);

    try {
      await guestApi.createNonMember({
        fullName: fullName.trim(),
        institution: institution.trim(),
        purpose: purpose.trim(),
        phone: phone.trim(),
        studyProgramId: studyProgramId ? Number(studyProgramId) : null
      });

      playKioskBeep();
      setNonMemberSuccess(`Selamat datang di Perpustakaan UMC, ${fullName}! Kehadiran Anda telah dicatat.`);
      setFullName("");
      setInstitution("");
      setPhone("");
      setStudyProgramId("");
      setPurpose("Membaca Buku");

      setTimeout(() => {
        setNonMemberSuccess(null);
      }, 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mencatat presensi non-member";
      setNonMemberError(message);
    } finally {
      setIsSubmittingNonMember(false);
    }
  };

  const closeMemberModal = () => {
    setScanResult(null);
    focusScanInput();
  };

  const switchToNonMemberTab = () => {
    setScanError(null);
    setIsNotFound(false);
    setActiveTab("non-member");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-red-500 selection:text-white">
      {/* Top Bar / Header */}
      <header className="max-w-5xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-600/30">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              KIOSK PRESENSI
              <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">
                Koleksi Digital
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Perpustakaan Universitas Muhammadiyah Cirebon
            </p>
          </div>
        </div>

        {/* Live Clock / Indicator */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold tracking-wide">Kiosk Online & Siap Scan</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto my-6 flex-1 flex flex-col justify-center">
        {/* Tab Switcher */}
        <div className="flex items-center justify-center p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto mb-8 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActiveTab("member");
              setScanError(null);
              setIsNotFound(false);
              setTimeout(() => scanInputRef.current?.focus(), 50);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "member"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="w-4 h-4" />
            Kartu Anggota (KTM / QR)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("non-member");
              setScanError(null);
              setIsNotFound(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "non-member"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Tamu Non-Member
          </button>
        </div>

        {/* TAB 1: KIOSK SCAN ANGGOTA */}
        {activeTab === "member" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="text-center max-w-lg mx-auto mb-8">
              <div className="inline-flex p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4 animate-bounce">
                <CreditCard className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Tempelkan Kartu Anggota
              </h2>
              <p className="text-sm text-slate-400">
                Arahkan Barcode / QR KTM ke scanner gun USB atau ketik NIM langsung di bawah.
              </p>
            </div>

            {/* Scan Error Notice */}
            {scanError && (
              <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-200 flex flex-col gap-3 animate-in fade-in zoom-in-95">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-bold">{scanError}</p>
                    {isNotFound && (
                      <p className="text-xs text-red-300/80 mt-1">
                        Belum terdaftar sebagai anggota UMC? Silakan isi form presensi tamu luar.
                      </p>
                    )}
                  </div>
                </div>
                {isNotFound && (
                  <button
                    type="button"
                    onClick={switchToNonMemberTab}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    Buka Formulir Tamu Non-Member <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Scanner Input Form */}
            <form onSubmit={handleScanSubmit} className="max-w-md mx-auto space-y-4">
              <div className="relative group">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={memberIdentifier}
                  onChange={(e) => setMemberIdentifier(e.target.value)}
                  placeholder="Scan kartu atau ketik NIM..."
                  disabled={isScanning}
                  autoComplete="off"
                  autoFocus
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-5 py-4 text-center text-lg sm:text-xl font-mono font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all shadow-inner"
                />
                {memberIdentifier && (
                  <button
                    type="button"
                    onClick={() => {
                      setMemberIdentifier("");
                      scanInputRef.current?.focus();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isScanning || !memberIdentifier.trim()}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm sm:text-base cursor-pointer"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Konfirmasi Presensi
                    </>
                  )}
                </button>

                {/* Camera scanner toggle */}
                <button
                  type="button"
                  onClick={() => setCameraActive((prev) => !prev)}
                  className={`p-4 rounded-2xl border font-bold transition-all ${
                    cameraActive
                      ? "bg-red-500/20 border-red-500 text-red-400"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                  title="Gunakan Kamera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Optional Camera Viewfinder */}
            {cameraActive && (
              <div className="max-w-md mx-auto mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-8 border-2 border-red-500/60 border-dashed rounded-xl pointer-events-none animate-pulse" />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Arahkan QR atau Barcode KTM ke depan kamera.
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-500" /> Audio Beep Aktif
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-slate-500" /> Auto-Focus Standar
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: FORM PENGUNJUNG NON-MEMBER (TAMU UMUM) */}
        {activeTab === "non-member" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
            <div className="text-center max-w-lg mx-auto mb-8">
              <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
                <UserCheck className="w-10 h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Buku Tamu Pengunjung
              </h2>
              <p className="text-sm text-slate-400">
                Khusus pengunjung dari luar kampus atau tamu umum yang belum memiliki kartu anggota UMC.
              </p>
            </div>

            {/* Success Notification */}
            {nonMemberSuccess && (
              <div className="max-w-xl mx-auto mb-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 flex items-center gap-3 animate-in fade-in zoom-in-95">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-sm font-semibold">{nonMemberSuccess}</div>
              </div>
            )}

            {/* Error Notification */}
            {nonMemberError && (
              <div className="max-w-xl mx-auto mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 flex items-center gap-3 animate-in fade-in zoom-in-95">
                <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                <div className="text-sm font-semibold">{nonMemberError}</div>
              </div>
            )}

            <form onSubmit={handleNonMemberSubmit} className="max-w-xl mx-auto space-y-4">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              {/* Institusi / Kampus Asal */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Institusi / Instansi / Kampus Asal <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: Universitas Indonesia / Umum"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              {/* Keperluan Kunjungan */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Keperluan Berkunjung <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 cursor-pointer"
                  >
                    <option value="Membaca Buku">Membaca Buku / Referensi</option>
                    <option value="Riset / Tugas Akhir">Riset / Penelitian / Tugas Akhir</option>
                    <option value="Kunjungan Studi">Kunjungan Studi / Pengenalan Kampus</option>
                    <option value="Mengembalikan / Mengurus Buku">Mengurus Administrasi Buku</option>
                    <option value="Lainnya">Keperluan Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Nomor Handphone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nomor HP / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              </div>

              {/* Program Studi Minat (Opsional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Program Studi Terkait (Opsional)
                </label>
                <select
                  value={studyProgramId}
                  onChange={(e) => setStudyProgramId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 cursor-pointer"
                >
                  <option value="">-- Pilih Program Studi (Jika Ada) --</option>
                  {studyPrograms.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} {sp.faculty?.name ? `(${sp.faculty.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingNonMember}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm sm:text-base mt-6 cursor-pointer"
              >
                {isSubmittingNonMember ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Catat Kehadiran Tamu
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-4 border-t border-slate-800/80 text-xs text-slate-500">
        Perpustakaan Universitas Muhammadiyah Cirebon • Kiosk Presensi Mandiri
      </footer>

      {/* VISUAL POPUP KARTU MEMBER (Modal Konfirmasi Sukses) */}
      {scanResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-md w-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-600/30 text-center overflow-hidden">
            {/* Close button */}
            <button
              type="button"
              onClick={closeMemberModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing checkmark badge */}
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <p className="text-xs uppercase font-extrabold tracking-widest text-red-400 mb-1">
              {scanResult.alreadyCheckedIn ? "Kehadiran Sudah Tercatat" : "Presensi Berhasil!"}
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Selamat Datang!
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Terima kasih telah berkunjung ke Perpustakaan UMC.
            </p>

            {/* Virtual KTM Card Box */}
            <div className="bg-gradient-to-br from-red-950/70 via-slate-900 to-slate-950 border border-red-500/40 rounded-2xl p-5 text-left shadow-lg relative overflow-hidden mb-6">
              <div className="flex items-center justify-between border-b border-red-500/20 pb-3 mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-300">
                  KTM DIGITAL UMC
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  MEMBER AKTIF
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                  {scanResult.name ? scanResult.name.charAt(0).toUpperCase() : "M"}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-black text-white truncate">
                    {scanResult.name}
                  </h4>
                  <p className="text-xs font-mono font-bold text-red-400 tracking-wider">
                    {scanResult.nim || scanResult.cardNumber || "Member Perpustakaan"}
                  </p>
                  <p className="text-xs text-slate-300 mt-1 truncate">
                    {scanResult.prodi || scanResult.faculty}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Waktu Kedatangan:</span>
                <span className="font-mono text-slate-200">
                  {new Date(scanResult.timestamp).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </span>
              </div>
            </div>

            {/* Close / Next Button with Countdown */}
            <button
              type="button"
              onClick={closeMemberModal}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all"
            >
              Tutup / Scan Berikutnya ({countdown}s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
