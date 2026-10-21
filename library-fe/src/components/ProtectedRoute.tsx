import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { authClient } from "@/utils/auth-client";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
  excludeRole?: string[];
}

export default function ProtectedRoute({
  children,
  requiredRole,
  excludeRole,
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

      // Logged in but role is excluded
      const userRole = (session.user as any).role;
      if (excludeRole && excludeRole.includes(userRole)) {
        navigate("/");
        return;
      }

      // Logged in but required role not met
      if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowed.includes(userRole)) {
          navigate("/");
          return;
        }
      }
    }
  }, [session, isPending, navigate, requiredRole, excludeRole]);

  // Avoid double loading UI; page-level skeleton handles content loading.
  if (isPending) {
    return null;
  }

  // Final check for rendering
  if (!session) return null;

  const userRole = (session.user as any).role;
  if (excludeRole && excludeRole.includes(userRole)) return null;
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(userRole)) return null;
  }

  return <>{children}</>;
}
