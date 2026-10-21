import { useState } from "react";
import { useNavigate } from "react-router";
import { authClient } from "@/utils/auth-client";
import { setAuthToken } from "@/api/client";
import { Mail, Lock, UserCircle2, UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/useToast";

const GoogleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { success, error, info, loading, removeToast } = useToast();

  // ─── Google SSO ───────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      info("SSO", "Menghubungkan ke Google...", 3000);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
        errorCallbackURL: `${window.location.origin}/login`,
      });
    } catch {
      error("Gagal!", "Gagal login SSO. Coba lagi.", 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      error("Form Tidak Lengkap", "Email dan password harus diisi.");
      return;
    }

    const loadingId = loading("Memproses...", "Sedang memverifikasi akun Anda");
    setIsLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: email.toLowerCase().trim(),
        password,
        rememberMe,
      });

      removeToast(loadingId);

      if (authError) {
        const msg = authError.message ?? "";
        if (
          msg.toLowerCase().includes("invalid") ||
          msg.toLowerCase().includes("credentials") ||
          msg.toLowerCase().includes("password")
        ) {
          throw new Error("Email atau password salah");
        }
        if (
          msg.toLowerCase().includes("not found") ||
          msg.toLowerCase().includes("user")
        ) {
          throw new Error("Akun tidak ditemukan. Silakan daftar terlebih dahulu.");
        }
        throw new Error(msg || "Gagal login. Silakan coba lagi.");
      }

      if (data?.user) {
        if ((data as any).token) {
          setAuthToken((data as any).token);
        }
        success(
          "Login Berhasil!",
          `Selamat datang, ${data.user.name || data.user.email}! 🎉`,
          2500
        );
        
        const role = (data.user as any).role;
        setTimeout(() => {
          if (role === "super_admin" || role === "staff") {
            navigate("/dashboard/super-admin");
          } else {
            navigate("/");
          }
        }, 1500);
      }
    } catch (err) {
      removeToast(loadingId);
      const msg =
        err instanceof Error ? err.message : "Gagal login. Silakan coba lagi.";
      error("Login Gagal", msg);
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-muted flex items-center justify-center p-2 font-sans overflow-hidden">

      <div className="w-full max-w-[380px] bg-card rounded-[24px] shadow-2xl overflow-hidden flex flex-col">

        {/* Header Merah */}
        <div className="bg-primary pt-5 pb-7 px-6 text-center relative">
          <div className="flex justify-center mb-2">
            <div className="bg-white/10 p-2 rounded-full">
              <UserCircle2 className="text-white w-10 h-10" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-white text-lg font-bold">Selamat Datang</h1>
          <p className="text-white/70 text-[11px]">Akses Koleksi Digital UMC</p>
          <div className="absolute -bottom-1 left-0 right-0 h-4 bg-white rounded-t-[24px]"></div>
        </div>

        <div className="px-8 pb-6 pt-1 space-y-3.5">
          {/* Tombol SSO */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
            ) : (
              <>
                <span className="flex items-center justify-center size-5 bg-white rounded-full shrink-0 shadow-2xs">
                  <GoogleIcon className="size-3.5" />
                </span>
                <span>Login SSO</span>
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center">
            <div className="absolute w-full border-t border-border"></div>
            <span className="relative px-3 bg-card text-muted-foreground text-[9px] uppercase font-bold tracking-widest">
              Atau
            </span>
          </div>

          {/* Form Login Manual */}
          <form onSubmit={handleManualLogin} className="space-y-3">
            {/* Email Field */}
            <div>
              <label className="block text-foreground text-[10px] font-bold mb-1 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email"
                  className="w-full pl-10 pr-4 h-10 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none text-xs text-foreground placeholder-muted-foreground transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between mb-1 ml-1">
                <label className="text-foreground text-[10px] font-bold">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-primary text-[9px] font-bold hover:underline"
                >
                  Lupa sandi?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 h-10 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none text-xs text-foreground placeholder-muted-foreground transition-all"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-300 text-primary focus:ring-primary"
                  disabled={isLoading}
                />
                <span className="text-muted-foreground text-[10px]">Ingat saya</span>
              </label>
            </div>

            {/* Auto Fill Super Admin */}
            <button
              type="button"
              onClick={() => {
                setEmail("admin@mucilib.ac.id");
                setPassword("Admin123456!");
                info("Super Admin", "Kredensial Super Admin berhasil diisi.");
              }}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 h-8 bg-primary/10 hover:bg-primary/15 border border-dashed border-primary/40 text-primary rounded-xl font-semibold text-[11px] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldCheck size={14} className="text-primary" />
              <span>Auto Fill Super Admin</span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 bg-foreground hover:bg-foreground/90 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Memproses...
                </span>
              ) : "Masuk Ke Perpustakaan"}
            </button>
          </form>

          {/* Tombol Register */}
          <div className="pt-2 text-center">
            <p className="text-muted-foreground text-[10px] mb-1">Belum memiliki akun?</p>
            <button
              onClick={() => navigate("/register")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 w-full h-9 bg-card border border-border text-foreground hover:bg-muted rounded-xl font-bold text-[11px] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={14} className="text-primary" />
              Daftar Akun Baru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
