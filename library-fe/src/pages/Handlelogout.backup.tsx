import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";

const HandleLogout = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut();
    navigate("/login");
  };

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

  return (
    <div className="flex items-center justify-center w-full h-screen">
      {session ? (
        (session.user as User).role === "unauthorized" ? (
          <div className="flex flex-col items-center gap-4 p-8 bg-red-50 rounded-xl shadow-sm border border-red-200 max-w-md">
            <div className="text-red-500 bg-red-100 p-3 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-red-700">Akses Ditolak</h2>
              <p className="text-red-600 mt-2">
                Email <strong>{session.user.email}</strong> tidak terdaftar di
                sistem Kampus. Silakan gunakan email universitas atau hubungi
                admin.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors w-full"
            >
              Kembali ke Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl shadow-sm border">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={session.user.image || ""}
                alt={session.user.name}
              />
              <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-xl font-semibold">{session.user.name}</p>
              <p className="text-sm text-gray-500">{session.user.email}</p>
              <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {(session.user as User).role || "User"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xl text-gray-600">
            Manage your books and resources efficiently
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/login"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Sign In with Google
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandleLogout;
