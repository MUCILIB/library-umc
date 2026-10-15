import { auth } from "../lib/auth";
import type { Request } from "express";

// Definisi Role seuai schema/better-auth
import { ROLES, type Role } from "./auth-types";

/**
 * GET current session from request headers (Server-side check)
 * Digunakan di dalam controller atau middlware Express
 */

export async function getSession(req: Request) {
  // Convert Node/Express headers to Web Standard Headers
  const headers = new Headers();
  let bearerToken = "";

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else if (typeof value === "string") {
      headers.append(key, value);
      if (
        key.toLowerCase() === "authorization" &&
        value.startsWith("Bearer ")
      ) {
        bearerToken = value.split(" ")[1];
      }
    }
  }

  // Fallback: ambil token dari query parameter jika direct navigation / iframe
  if (!bearerToken && req.query && typeof req.query.token === "string") {
    bearerToken = req.query.token;
  }

  if (bearerToken) {
    const existingCookie = headers.get("cookie");
    const sessionCookie = `better-auth.session_token=${bearerToken}`;
    const secureSessionCookie = `__Secure-better-auth.session_token=${bearerToken}`;
    const injectedCookies = `${sessionCookie}; ${secureSessionCookie}`;

    if (existingCookie) {
      headers.set("cookie", `${existingCookie}; ${injectedCookies}`);
    } else {
      headers.set("cookie", injectedCookies);
    }
  }

  try {
    const session = await auth.api.getSession({
      headers: headers,
    });
    return session;
  } catch (error) {
    console.error("Error getting session: ", error);
    return null;
  }
}

/**
 * Helper untuk mendapatkan User dari session
 */

export async function getCurrentUser(req: Request) {
  const session = await getSession(req);
  return session?.user ?? null;
}

/**
 * Check if user has a spesific role
 */

export function hasRole(
  userRole: string | null | undefined,
  requiredRole: Role,
) {
  return userRole === requiredRole;
}

/**
 * Check if user has any of the spesific roles
 */

export function hasAnyRole(userRole: string | null | undefined, roles: Role[]) {
  if (!userRole) return false;
  return roles.includes(userRole as Role);
}

/**
 * Check if user can manage other users(super_admin)
 */

export function canManageUsers(userRole: string | null | undefined) {
  return userRole === ROLES.SUPER_ADMIN;
}

/**
 * Helper Middleware like function (opsional, jika tidak ingin pakai middleware express full)
 * Melempar error jika tidak punya akses
 */

export function requireRole(
  userRole: string | null | undefined,
  allowedRoles: Role[],
) {
  if (!userRole || !hasAnyRole(userRole, allowedRoles)) {
    throw new Error("FORBIDDEN_ACCESS");
  }
  return true;
}
