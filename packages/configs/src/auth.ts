import { idpLink } from "./links.ts";

/**
 * The three independent identity domains served by the auth service. Each has
 * its own better-auth instance mounted at `/{userType}/api`, with its own
 * JWKS (used to verify JWTs) and `/token` endpoint (used to mint them).
 *
 * Kept here — in the zero-dep shared config — so the backend (JWT verification)
 * and the frontends (token minting) agree on the exact set of domains and URLs
 * without importing across app boundaries.
 */
export const USER_TYPES = ["voters", "admins", "auditors"] as const;

export type UserType = (typeof USER_TYPES)[number];

/** better-auth API root for a domain, e.g. `http://idp.localhost:8001/voters/api`. */
export function authApiUrl(userType: UserType): string {
  return `${idpLink}/${userType}/api`;
}

/**
 * JWKS endpoint for a domain (exposed by better-auth's `jwt` plugin). The
 * backend fetches and caches these keys to verify Bearer tokens.
 */
export function jwksUrl(userType: UserType): string {
  return `${authApiUrl(userType)}/jwks`;
}

/**
 * Token endpoint for a domain (exposed by better-auth's `jwt` plugin). A signed
 * session cookie is exchanged here for a short-lived JWT via `GET`.
 */
export function tokenUrl(userType: UserType): string {
  return `${authApiUrl(userType)}/token`;
}
