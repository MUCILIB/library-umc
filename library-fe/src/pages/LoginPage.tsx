import LogoUmc from "@/assets/logo_umc.png";
import { authClient } from "@/lib/auth-client"; // Pastikan path sesuai

const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className="h-6 w-6"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    ></path>
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    ></path>
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    ></path>
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    ></path>
    <path d="M1 1h22v22H1z" fill="none"></path>
  </svg>
);

// --- Main App Component ---
export default function Login() {
  // const [showPassword, setShowPassword] = useState(false);
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: import.meta.env.VITE_BASE_URL,
    });
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&display=swap');
          
          /* Dot grid pattern */
          .bg-dots {
            background-image: radial-gradient(#121212 1px, transparent 1px);
            background-size: 20px 20px;
          }
        `}
      </style>

      {/* Container: Bauhaus Off-white (#F0F0F0) 
        Layout: Geometric composition with absolute shapes 
      */}
      <div className="relative w-full min-h-screen flex items-center justify-center font-['Outfit'] bg-[#F0F0F0] overflow-hidden">
        {/* --- Background Construction --- */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Dot texture overlay */}
          <div className="absolute inset-0 bg-dots opacity-[0.15]" />

          {/* Blue Circle Top Left */}
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#1040C0] rounded-full border-4 border-black shadow-[8px_8px_0px_0px_black] opacity-20 lg:opacity-100" />

          {/* Yellow Square Bottom Right (Rotated) */}
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#F0C020] border-4 border-black rotate-12 shadow-[8px_8px_0px_0px_black] opacity-20 lg:opacity-100" />

          {/* Red Triangle Decoration (CSS Clip Path) */}
          <div
            className="absolute top-1/2 left-10 w-24 h-24 bg-[#D02020] hidden lg:block opacity-80"
            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          ></div>
        </div>

        {/* --- Login Card --- 
            Style: Hard edges (rounded-none), thick borders, deep hard shadow
        */}
        <div className="relative w-full max-w-sm mx-4 bg-white border-4 border-black shadow-[8px_8px_0px_0px_black] hover:-translate-y-1 transition-transform duration-300">
          {/* Card Corner Decoration (Bauhaus signature) */}
          <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#D02020] border-2 border-black" />

          <div className="p-8 space-y-8">
            {/* Header section */}
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon Container: Yellow Square with thick border */}
              <div className="inline-flex p-4 border-2 border-black shadow-[4px_4px_0px_0px_black]">
                <img src={LogoUmc} alt="logo_umc" className="w-10 h-10" />
              </div>

              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                  MUCILIB
                </h1>
                <p className="text-base font-medium text-zinc-600 mt-2">
                  Masuk menggunakan akun kampus
                </p>
              </div>
            </div>

            {/* Social login buttons */}
            <div className="grid grid-cols-1">
              <button
                onClick={handleGoogleLogin}
                className="group flex items-center justify-center gap-3 h-12 px-4 bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_black] hover:bg-zinc-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-200"
              >
                <GoogleIcon />
                <span className="font-bold uppercase tracking-wide text-sm">
                  Sign in with Google
                </span>
              </button>
            </div>

            {/* Divider: Geometric line (Commented out) */}
            {/* 
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t-2 border-black" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs font-bold uppercase tracking-widest text-black border-2 border-black">
                  OR
                </span>
              </div>
            </div>
             */}

            {/* Form (Commented out) */}
            {/* 
            <form className="space-y-5">
              <div className="space-y-2">
                 ... Input Email ...
              </div>
              ...
            </form>
            */}

            {/* Footer links (Commented out or Adjusted) */}
            <div className="text-center space-y-3 pt-2">
              <p className="text-xs font-medium text-zinc-500">
                Hubungi administrator jika mengalami kendala login.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
