import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/modal";
import { authClient } from "@/utils/auth-client";
import memberService, { type MemberProfile } from "@/services/memberService";
import { useToast } from "@/hooks/useToast";
import {
  Phone,
  User,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  LogOut,
  KeyRound,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("620")) return `62${digits.slice(3)}`;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function MandatoryContactModal() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { success, error } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [initialPhone, setInitialPhone] = useState("");
  const [initialPhoneVerified, setInitialPhoneVerified] = useState(false);

  const [otpCode, setOtpCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const checkedUserIdRef = useRef<string | null>(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    // Hanya periksa jika sesi sudah selesai dimuat dan user telah login
    if (sessionLoading || !userId || !session?.user) {
      setIsOpen(false);
      return;
    }

    // Hindari pemanggilan getMyProfile berulang jika sudah diperiksa untuk user ini
    if (checkedUserIdRef.current === userId) {
      return;
    }

    // Role admin & staf perpustakaan tidak memerlukan konfirmasi kontak
    const userRole = String((session.user as any)?.role || "").toLowerCase();
    const isStaffOrAdmin =
      userRole === "super_admin" ||
      userRole === "staff" ||
      userRole === "admin" ||
      userRole === "librarian";

    // Pemeriksaan rute dashboard admin
    const isDashboardRoute =
      typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard");

    if (isStaffOrAdmin || isDashboardRoute) {
      checkedUserIdRef.current = userId;
      setIsOpen(false);
      return;
    }

    let isMounted = true;

    const checkContact = async () => {
      try {
        setLoading(true);
        const profile: MemberProfile = await memberService.getMyProfile();
        if (!isMounted) return;
        checkedUserIdRef.current = userId;

        // Pastikan kembali dari data profil bahwa akun bukan staf atau admin
        const profileRole = String(
          profile.memberType || (profile.user as any)?.role || ""
        ).toLowerCase();
        if (
          profileRole === "super_admin" ||
          profileRole === "staff" ||
          profileRole === "admin" ||
          profileRole === "librarian"
        ) {
          setIsOpen(false);
          return;
        }

        const rawName = profile.user?.name || session.user.name || "";
        const currentName = rawName.replace(/\s*\((?:external|mahasiswa|dosen|staff)\)$/i, "").trim();
        const currentPhone = profile.phone || "";

        // Hanya wajib bagi mahasiswa / pemustaka baru yang belum memiliki nomor HP atau nama
        const isPhoneMissing = !currentPhone || currentPhone.trim() === "";
        const isNameMissing = !currentName || currentName.trim() === "";

        if (isPhoneMissing || isNameMissing) {
          setName(currentName);
          setPhone(currentPhone);
          setInitialPhone(currentPhone);
          setInitialPhoneVerified(Boolean(profile.phoneVerified));
          setStep("form");
          setOtpCode("");
          setDevOtpCode(null);
          setValidationError(null);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      } catch {
        // Jika gagal memuat profil (misal jaringan atau belum terdaftar), jangan ganggu user
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void checkContact();

    return () => {
      isMounted = false;
    };
  }, [userId, sessionLoading, session?.user]);

  const phoneRequiresOtp = (() => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return true;
    if (!initialPhone.trim()) return true;
    const sameNumber =
      normalizePhoneDigits(cleanPhone) === normalizePhoneDigits(initialPhone);
    if (!sameNumber) return true;
    return !initialPhoneVerified && !initialPhone.trim();
  })();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length < 2) {
      setValidationError("Nama lengkap wajib diisi (minimal 2 karakter).");
      return;
    }

    // Validasi nomor telepon/WA (9 - 15 digit angka)
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (!cleanPhone || phoneDigits.length < 9 || phoneDigits.length > 15) {
      setValidationError("Nomor telepon/WhatsApp wajib diisi dengan format yang benar (9-15 digit angka).");
      return;
    }

    // Jika nomor telepon sudah tersimpan sebelumnya dan tidak berubah, langsung simpan nama
    if (!phoneRequiresOtp) {
      try {
        setSubmitting(true);
        await memberService.updateMyProfile({
          name: cleanName,
          phone: cleanPhone,
        });
        success("Profil Diperbarui", "Nama dan nomor kontak Anda berhasil disimpan.");
        setIsOpen(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gagal memperbarui kontak";
        error("Gagal Menyimpan", message);
        setValidationError(message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);
      const res = await memberService.requestPhoneOtp(cleanPhone);
      setMaskedPhone(res.maskedPhone || cleanPhone);
      setDevOtpCode(res.devOtpCode || null);
      setCooldown(res.cooldownSeconds || 60);
      setOtpCode("");
      setStep("otp");
      success(
        "Kode OTP Dikirim",
        res.provider === "simulation"
          ? "Kode OTP simulasi telah dibuat untuk pengujian."
          : `Kode OTP verifikasi dikirim ke WhatsApp ${res.maskedPhone}.`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengirim kode OTP";
      error("Gagal Mengirim OTP", message);
      setValidationError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanCode = otpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setValidationError("Masukkan 6 digit kode OTP yang valid.");
      return;
    }

    try {
      setSubmitting(true);
      await memberService.verifyPhoneOtp({
        phone: phone.trim(),
        code: cleanCode,
        name: name.trim(),
      });
      success(
        "Nomor Terverifikasi",
        "Nomor telepon Anda berhasil dikonfirmasi melalui OTP dan disimpan."
      );
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kode OTP tidak valid";
      error("Verifikasi Gagal", message);
      setValidationError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;
    setValidationError(null);
    try {
      setResending(true);
      const res = await memberService.requestPhoneOtp(phone.trim());
      setMaskedPhone(res.maskedPhone || phone.trim());
      setDevOtpCode(res.devOtpCode || null);
      setCooldown(res.cooldownSeconds || 60);
      success("Kode OTP Dikirim Ulang", "Silakan periksa kode OTP terbaru Anda.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengirim ulang OTP";
      error("Gagal Mengirim Ulang", message);
      setValidationError(message);
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        // Form wajib diisi & diverifikasi bagi mahasiswa/pemustaka baru sebelum dapat melanjutkan
      }}
      title="Konfirmasi Kontak & Identitas Mahasiswa"
      size="md"
    >
      <div className="space-y-5 py-1">
        {/* Banner Informasi Ramah */}
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300">
          <ShieldAlert className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs space-y-1">
            <p className="font-bold">
              {step === "form"
                ? "Lengkapi Data Kontak Pemustaka"
                : "Verifikasi Kode OTP Nomor Telepon"}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {step === "form"
                ? "Selamat datang di Perpustakaan Digital UMC. Demi kelancaran sirkulasi buku dan memastikan nomor aktif, silakan lengkapi Nama Lengkap dan Nomor WhatsApp/Telepon Anda untuk verifikasi kode OTP."
                : `Masukkan 6 digit kode OTP yang dikirim ke nomor WhatsApp ${maskedPhone || phone} untuk membuktikan kepemilikan nomor aktif Anda.`}
            </p>
          </div>
        </div>

        {validationError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
            {validationError}
          </div>
        )}

        {step === "form" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Nama Lengkap <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Muhammad Ihsan"
                  disabled={submitting || loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nama resmi yang tercantum pada data kemahasiswaan / keanggotaan UMC.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Nomor Telepon / WhatsApp Aktif <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  disabled={submitting || loading}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Kode OTP akan dikirimkan ke nomor ini untuk memastikan nomor telepon asli dan aktif.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting || loading || !name.trim() || !phone.trim()}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer min-h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>{phoneRequiresOtp ? "Mengirim Kode OTP..." : "Menyimpan Data..."}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4" />
                    <span>
                      {phoneRequiresOtp ? "Kirim Kode OTP" : "Simpan & Lanjutkan"}
                    </span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Ganti akun atau keluar</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {devOtpCode && (
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-semibold">Mode Simulasi OTP (Pengembangan)</p>
                <p className="mt-0.5">
                  Gateway WhatsApp belum dikonfigurasi. Kode OTP Anda:{" "}
                  <strong className="font-mono text-sm tracking-widest">{devOtpCode}</strong>
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-foreground">
                  Kode OTP (6 Digit) <span className="text-destructive">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setValidationError(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  <ArrowLeft className="size-3" />
                  Ubah Nomor
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Masukkan 6 digit kode OTP"
                  disabled={submitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-base font-mono tracking-[0.35em] font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground placeholder:tracking-normal placeholder:text-sm placeholder:font-sans placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Berlaku selama 5 menit.</span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || resending || submitting}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  <RefreshCw className={`size-3 ${resending ? "animate-spin" : ""}`} />
                  {cooldown > 0 ? `Kirim ulang (${cooldown}d)` : "Kirim Ulang OTP"}
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer min-h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Memverifikasi OTP...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Verifikasi &amp; Simpan</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Ganti akun atau keluar</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export default MandatoryContactModal;
