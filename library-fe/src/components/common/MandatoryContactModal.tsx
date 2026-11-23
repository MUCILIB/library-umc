import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/modal";
import { authClient } from "@/utils/auth-client";
import memberService, { type MemberProfile } from "@/services/memberService";
import { useToast } from "@/hooks/useToast";
import { Phone, User, Loader2, ShieldAlert, CheckCircle2, LogOut } from "lucide-react";

export function MandatoryContactModal() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const { success, error } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const checkedUserIdRef = useRef<string | null>(null);

  const userId = session?.user?.id;

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Form wajib diisi bagi mahasiswa/pemustaka baru sebelum dapat melanjutkan
      }}
      title="Konfirmasi Kontak & Identitas Mahasiswa"
      size="md"
    >
      <div className="space-y-5 py-1">
        {/* Banner Informasi Ramah */}
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 text-amber-800 dark:text-amber-300">
          <ShieldAlert className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Lengkapi Data Kontak Pemustaka</p>
            <p className="text-muted-foreground leading-relaxed">
              Selamat datang di Perpustakaan Digital UMC. Demi kelancaran sirkulasi buku, notifikasi peminjaman, serta pengingat pengembalian otomatis via WhatsApp/SMS, silakan lengkapi atau konfirmasi Nama Lengkap dan Nomor Telepon/WhatsApp Anda sebelum melanjutkan.
            </p>
          </div>
        </div>

        {validationError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Digunakan untuk pengingat jatuh tempo sirkulasi buku dan informasi perpustakaan.
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
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Simpan & Lanjutkan</span>
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
      </div>
    </Modal>
  );
}

export default MandatoryContactModal;
