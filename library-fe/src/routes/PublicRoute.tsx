import { type ReactNode, useState, useEffect } from "react";
import { Navigate } from "react-router";
import { authClient } from "@/utils/auth-client";

export default function PublicRoute({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setHasLoadedOnce(true);
    }
  }, [isPending]);

  // Hanya block render pada initial load, bukan refetch (tab focus)
  if (isPending && !hasLoadedOnce) return null;

  if (session) {
    const role = (session.user as any)?.role;
    if (role === "super_admin") {
      return <Navigate to="/dashboard/super-admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}