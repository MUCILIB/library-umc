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
  ArrowRight
} from "lucide-react";
import {
  guestApi,
  studyProgramApi,
  type GuestScanResponse,
  type StudyProgram
} from "@/api/client";
import BgCampus from "@/assets/bg-new.jpeg";

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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-cover bg-center font-sans" style={{ backgroundImage: `url(${BgCampus})` }}>
      {/* Overlay untuk keterbacaan */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/85 to-slate-950/90"></div>
      
      <div className="relative w-full max-w-2xl bg-card/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10 max-h-[90vh] flex-shrink-0">
        {/* Header Merah */}
        <div className="bg-primary pt-8 pb-6 px-8 text-center relative border-b border-white/10 flex-shrink-0">
          <div className="flex justify-center mb-3">
            <div className="bg-white/10 p-3 rounded-full">
              <BookOpen className="text-white w-12 h-12" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-white text-2xl font-bold">Selamat Datang</h1>
          <p className="text-white/70 text-sm mt-1">Perpustakaan UMC - Kiosk Presensi</p>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="overflow-y-auto flex-1 px-8 py-8 space-y-6">
          {/* Tab Switcher */}
          <div className="flex items-center justify-center p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("member");
                setScanError(null);
                setIsNotFound(false);
                setTimeout(() => scanInputRef.current?.focus(), 50);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === "member"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <QrCode className="w-5 h-5" />
              Kartu Anggota
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("non-member");
                setScanError(null);
                setIsNotFound(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === "non-member"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserCheck className="w-5 h-5" />
              Tamu Umum
            </button>
          </div>

          {/* TAB 1: KIOSK SCAN ANGGOTA */}
          {activeTab === "member" && (
            <div className="space-y-6 bg-card/50 rounded-2xl p-6 border border-border">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 mb-4 animate-bounce">
                  <CreditCard className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                  Tempelkan Kartu Anggota
                </h2>
                <p className="text-sm text-slate-400">
                  Scan KTM atau ketik NIM di bawah
                </p>
              </div>

              {/* Scan Error Notice */}
              {scanError && (
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive-foreground flex flex-col gap-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm">
                      <p className="font-bold">{scanError}</p>
                      {isNotFound && (
                        <p className="text-xs opacity-80 mt-1">
                          Belum terdaftar sebagai anggota UMC? Silakan isi form presensi tamu luar.
                        </p>
                      )}
                    </div>
                  </div>
                  {isNotFound && (
                    <button
                      type="button"
                      onClick={switchToNonMemberTab}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      Buka Formulir Tamu Non-Member <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Scanner Input Form */}
              <form onSubmit={handleScanSubmit} className="space-y-4">
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
                    className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-center text-lg font-mono font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                  />
                  {memberIdentifier && (
                    <button
                      type="button"
                      onClick={() => {
                        setMemberIdentifier("");
                        scanInputRef.current?.focus();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isScanning || !memberIdentifier.trim()}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Memverifikasi...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Konfirmasi
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCameraActive((prev) => !prev)}
                    className={`p-4 rounded-2xl border font-bold transition-all ${
                      cameraActive
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-background border-border text-muted-foreground hover:text-foreground"
                    }`}
                    title="Gunakan Kamera"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {/* Optional Camera Viewfinder */}
              {cameraActive && (
                <div className="bg-background border border-border rounded-2xl p-4 text-center">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-border">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-8 border-2 border-primary/60 border-dashed rounded-xl pointer-events-none animate-pulse" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FORM PENGUNJUNG NON-MEMBER (TAMU UMUM) */}
          {activeTab === "non-member" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
                  <UserCheck className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                  Buku Tamu Pengunjung
                </h2>
              </div>

              {nonMemberSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 flex items-center gap-3 animate-in fade-in zoom-in-95">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div className="text-sm font-semibold">{nonMemberSuccess}</div>
                </div>
              )}

              {nonMemberError && (
                <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-200 flex items-center gap-3 animate-in fade-in zoom-in-95">
                  <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
                  <div className="text-sm font-semibold">{nonMemberError}</div>
                </div>
              )}

              <form onSubmit={handleNonMemberSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Nama Lengkap *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Institusi / Instansi *</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Keperluan *</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer"
                    >
                      <option value="Membaca Buku">Membaca Buku / Referensi</option>
                      <option value="Riset / Tugas Akhir">Riset / Penelitian / Tugas Akhir</option>
                      <option value="Kunjungan Studi">Kunjungan Studi / Pengenalan Kampus</option>
                      <option value="Mengembalikan / Mengurus Buku">Mengurus Administrasi Buku</option>
                      <option value="Lainnya">Keperluan Lainnya</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Nomor HP / WhatsApp *</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Program Studi (Opsional)</label>
                  <select
                    value={studyProgramId}
                    onChange={(e) => setStudyProgramId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer"
                  >
                    <option value="">-- Pilih Program Studi --</option>
                    {studyPrograms.map((sp) => (
                      <option key={sp.id} value={sp.id}>{sp.name} {sp.faculty?.name ? `(${sp.faculty.name})` : ""}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingNonMember}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm mt-6 cursor-pointer"
                >
                  {isSubmittingNonMember ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-5 h-5" />
                      Catat Kehadiran
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/50 px-4">
        Perpustakaan Universitas Muhammadiyah Cirebon • Kiosk Presensi Mandiri
      </footer>

      {/* VISUAL POPUP KARTU MEMBER (Modal Konfirmasi Sukses) */}
      {scanResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative max-w-md w-full bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-500 rounded-3xl p-8 shadow-2xl shadow-red-600/30 text-center overflow-hidden">
            <button
              type="button"
              onClick={closeMemberModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <p className="text-xs uppercase font-extrabold tracking-widest text-red-400 mb-1">
              {scanResult.alreadyCheckedIn ? "Kehadiran Sudah Tercatat" : "Presensi Berhasil!"}
            </p>
            <h3 className="text-3xl font-black text-white tracking-tight mb-2">Selamat Datang!</h3>
            
            <div className="bg-gradient-to-br from-red-950/70 via-slate-900 to-slate-950 border border-red-500/40 rounded-2xl p-5 text-left shadow-lg mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
                  {scanResult.name ? scanResult.name.charAt(0).toUpperCase() : "M"}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-lg font-black text-white truncate">{scanResult.name}</h4>
                  <p className="text-xs font-mono font-bold text-red-400">{scanResult.nim || scanResult.cardNumber}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeMemberModal}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all"
            >
              Tutup ({countdown}s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}