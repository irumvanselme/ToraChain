export const USER_TYPE = "auditors" as const;

/** Base path for the auth service domain (login pages + better-auth API). */
export const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_BASE;
if (!AUTH_BASE) throw new Error("NEXT_PUBLIC_AUTH_BASE not set");

/** Base path for the elections backend API. */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE not set");

/** better-auth API root for this domain. */
export const AUTH_API = `${AUTH_BASE}/api`;

/** Backend audit API root. */
export const AUDIT_API = `${API_BASE}/audit`;

/**
 * URL of the server-rendered sign-in page, carrying a `redirect` back to where
 * the auditor was headed. We pass the *full* URL (origin + path + search)
 * because this SPA and the auth service may live on different domains; the auth
 * side honors full URLs whose origin is trusted, so a bare path would not be
 * enough to land back on this app.
 */
export function loginUrl(redirectTo: string): string {
  return `${AUTH_BASE}/login?redirect=${encodeURIComponent(redirectTo)}`;
}

/** URL of the server-rendered onboarding page. */
export const ONBOARDING_URL = `${AUTH_BASE}/onboarding`;

/** URL of the server-rendered pending-approval page. */
export const PENDING_URL = `${AUTH_BASE}/pending`;
