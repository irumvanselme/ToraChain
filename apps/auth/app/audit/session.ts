import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";

import { idpLink, jwksUrl } from "@tora-chain/configs";

import type { App } from "../_apps.ts";

/**
 * The resolved auditor principal — the subset of session/JWT fields the audit
 * status endpoint needs to look up and report org approval.
 */
export interface AuditorPrincipal {
  id: string;
  name: string;
  email: string;
}

// The auditors domain signs JWTs with its own key set; verifying tokens against
// this JWKS is how we authenticate the *backend*, which forwards the auditor's
// Bearer JWT (it never has the auditor's session cookie). Lazily fetched and
// cached by jose, with automatic refetch on key rotation.
const auditorsJwks = createRemoteJWKSet(new URL(jwksUrl("auditors")));

/** Pull the token out of an `Authorization: Bearer <token>` header. */
function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() ?? null;
}

/**
 * Resolves the calling auditor from a request, supporting **both** transports:
 *
 * - a better-auth **session cookie** (how the auditing-fe browser calls this
 *   endpoint directly), and
 * - an `Authorization: Bearer <jwt>` **auditor JWT** (how the backend forwards
 *   the caller's identity — it holds a JWT, not the session cookie).
 *
 * Returns `null` when neither transport yields a valid auditor.
 */
export async function resolveAuditor(
  auditorsApp: App,
  request: Request,
): Promise<AuditorPrincipal | null> {
  // 1. Session cookie (browser). getSession returns null when no cookie is set.
  const session = await auditorsApp.auth.api.getSession({
    headers: request.headers,
  });
  if (session?.user) {
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
  }

  // 2. Bearer JWT (server-to-server, e.g. the backend audit endpoints). Verify
  //    against the auditors JWKS — same issuer/keys the backend uses.
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, auditorsJwks, {
      issuer: idpLink,
    });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      name: typeof payload.name === "string" ? payload.name : "",
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch (err) {
    // An unknown key / expired / forged token is simply an unauthenticated
    // caller here; JWKSNoMatchingKey et al. all map to null.
    if (err instanceof joseErrors.JOSEError) return null;
    throw err;
  }
}
