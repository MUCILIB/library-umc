import { useState } from "react";
import { useNavigate } from "react-router";
import { authClient } from "@/utils/auth-client";
import { setAuthToken } from "@/api/client";
import { Mail, Lock, LogIn, UserCircle2, UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/useToast";

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
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 h-10 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={16} />
            <span>{isLoading ? "Memproses..." : "Login SSO"}</span>
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