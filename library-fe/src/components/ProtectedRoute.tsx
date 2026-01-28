import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";

type User = {
  createdAt: string;
  email: string;
  id: string;
  name: string;
  role: string;
  updatedAt: string;
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole = "super_admin",
}: ProtectedRouteProps) {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending) {
      // Not logged in
      if (!session) {
        navigate("/login");
        return;
      }

      // Logged in but wrong role
      const userRole = (session.user as User).role;
      if (requiredRole && userRole !== requiredRole) {
        navigate("/");
        return;
      }
    }
  }, [session, isPending, navigate, requiredRole]);

  // Show loading state
  if (isPending) {
    return (
      <div className="min-h-screen bg-[#030304] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F7931A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#94A3B8] font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authorized
  const userRole = session ? (session.user as User).role : null;
  if (!session || (requiredRole && userRole !== requiredRole)) {
    return null;
  }

  return <>{children}</>;
}
