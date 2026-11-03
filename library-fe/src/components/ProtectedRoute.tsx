import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending) {
      setHasLoadedOnce(true);
    }
  }, [isPending]);

  useEffect(() => {
    if (!isPending) {
      // Not logged in
      if (!session) {
        navigate("/login", { replace: true });
        return;
      }

      // Logged in but role is excluded
      const userRole = (session.user as any).role;
      if (excludeRole && excludeRole.includes(userRole)) {
        navigate("/", { replace: true });
        return;
      }

      // Logged in but required role not met
      if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowed.includes(userRole)) {
          navigate("/", { replace: true });
          return;
        }
      }
    }
  }, [session, isPending, navigate, requiredRole, excludeRole]);

  // Hanya block render pada initial load, bukan saat background refetch (tab focus)
  if (isPending && !hasLoadedOnce) {
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
