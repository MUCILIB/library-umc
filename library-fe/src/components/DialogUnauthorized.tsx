import { useEffect, useState } from "react";
import { authClient } from "@/utils/auth-client";
import { clearAuthToken } from "@/api/client";
import { useNavigate } from "react-router";
import Modal from "./ui/modal";
import { Button } from "./ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";

type User = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null | undefined;
  role: string;
};

const DialogUnauthorized = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<"unauthorized" | "welcome" | null>(
    null,
  );

  useEffect(() => {
    if (session?.user) {
      const user = session.user as User;

      // Prevent redundant state updates if modalType is already set
      if (modalType) return;

      if (user.role === "unauthorized") {
        setModalType("unauthorized");
        setIsOpen(true);
      } else {
        // Check if we already showed the welcome modal
        const hasSeenWelcome = sessionStorage.getItem("hasSeenWelcome");
        if (!hasSeenWelcome) {
          setModalType("welcome");
          setIsOpen(true);
          sessionStorage.setItem("hasSeenWelcome", "true");
        }
      }
    }
  }, [session, modalType]);

  const handleLogout = async () => {
    clearAuthToken();
    await authClient.signOut();
    navigate("/login");
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!modalType) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        modalType === "unauthorized"
          ? "Status Akun: Belum Terverifikasi"
          : "Login Berhasil"
      }
      animation="scale"
    >
      {modalType === "unauthorized" ? (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <AlertCircle className="w-10 h-10 text-yellow-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
              Akses Terbatas
            </h3>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Email <strong>{session?.user.email}</strong> belum terdaftar
              sebagai civitas akademika UMC. Anda tetap dapat melihat katalog,
              namun fitur peminjaman dan akses jurnal lengkap dibatasi.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full sm:w-1/2 border-primary text-primary hover:bg-accent hover:text-primary"
            >
              Ganti Akun
            </Button>
            <Button
              onClick={handleClose}
              className="w-full sm:w-1/2 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Mengerti
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
              Selamat Datang, {session?.user.name}!
            </h3>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Anda telah berhasil login sebagai{" "}
              <span className="font-medium text-blue-600 uppercase">
                {(session?.user as User).role}
              </span>
              . Sekarang Anda dapat meminjam buku, membaca jurnal, dan mengakses
              seluruh layanan perpustakaan digital kami.
            </p>
          </div>
          <div className="w-full pt-2">
            <Button
              onClick={handleClose}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Mulai Jelajahi
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DialogUnauthorized;
