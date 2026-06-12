/**
 * Runtime configuration for the admin SPA.
 *
 * In development everything is served same-origin through the Vite proxy (see
 * `vite.config.ts`): the auth service under `/admins/*` and the elections
 * backend under `/api/*`. Same-origin matters because the better-auth session
 * cookie is `SameSite=Lax` and would not be sent on cross-site fetches.
 *
 * In production, serve the SPA, auth service, and API behind one gateway and
 * override these bases via `VITE_AUTH_BASE` / `VITE_API_BASE` if the paths
 * differ.
 */

/** Which identity domain this app authenticates against. */
export const USER_TYPE = "admins" as const;

/** Base path for the auth service domain (login pages + better-auth API). */
export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE ?? `/${USER_TYPE}`;

/** Base path for the elections backend API. */
export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

/** better-auth API root for this domain. */
export const AUTH_API = `${AUTH_BASE}/api`;

/**
 * URL of the server-rendered sign-in page, carrying a same-origin `redirect`
 * back to where the admin was headed. `safeRedirect` on the auth side only
 * honors absolute-path redirects, so we pass `pathname + search`.
 */
export function loginUrl(redirectTo: string): string {
  return `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirectTo)}`;
}
