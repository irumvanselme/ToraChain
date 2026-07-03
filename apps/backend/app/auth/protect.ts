import { Elysia } from "elysia";

import type { UserType } from "@tora-chain/configs";

import type { AuthIdentity, JwtVerifier } from "./jwt.ts";

/**
 * Builds the auth guard plugin that exposes the `protect` route macro.
 *
 * Usage in a controller:
 *
 * ```ts
 * new Elysia().use(auth).get("/things", ({ auth }) => ..., {
 *   protect: ["admins", "auditors"], // JWKS of these domains are accepted
 * });
 * ```
 *
 * A route that sets `protect` requires a valid Bearer JWT signed by one of the
 * listed domains; the verified {@link AuthIdentity} is injected as `auth` on the
 * handler context. Missing/invalid/expired tokens throw `AppError.unauthenticated`
 * (401), which the global error handler renders as the standard error body.
 *
 * The same guard instance is shared across every controller so Elysia dedupes
 * it by name and the JWKS caches inside `verifier` are reused.
 */
export function createAuthGuard(verifier: JwtVerifier) {
  return new Elysia({ name: "auth-guard" }).macro({
    protect(allowed: readonly UserType[]) {
      return {
        async resolve({
          request,
        }: {
          request: Request;
        }): Promise<{ auth: AuthIdentity }> {
          const auth = await verifier.verify(
            request.headers.get("authorization"),
            allowed,
          );
          return { auth };
        },
      };
    },
  });
}

/** The auth guard plugin type, for controllers that accept it as a parameter. */
export type AuthGuard = ReturnType<typeof createAuthGuard>;
