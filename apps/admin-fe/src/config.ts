export const USER_TYPE = "admins" as const;

/** Base path for the auth service domain (login pages + better-auth API). */
export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE;
if (!AUTH_BASE) throw new Error("AUTH_BASE not set");

/** Base path for the elections backend API. */
export const API_BASE = import.meta.env.VITE_API_BASE;
if (!API_BASE) throw new Error("API_BASE not set");

/** better-auth API root for this domain. */
export const AUTH_API = `${AUTH_BASE}/api`;

/**
 * URL of the server-rendered sign-in page, carrying a `redirect` back to where
 * the admin was headed. We pass the *full* URL (origin + path + search) because
 * the admin SPA and the auth service may live on different domains; the auth
 * side honors full URLs whose origin is trusted, so a bare path would not be
 * enough to land back on this app.
 */
export function loginUrl(redirectTo: string): string {
  return `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirectTo)}`;
}
