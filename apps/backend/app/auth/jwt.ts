import {
  createRemoteJWKSet,
  jwtVerify,
  errors as joseErrors,
  type JWTPayload,
} from "jose";

import { idpLink, jwksUrl, type UserType } from "@tora-chain/configs";

import { AppError } from "../common/errors.ts";

/** The verified identity of a caller, derived from a validated JWT. */
export interface AuthIdentity {
  /** better-auth user id (the JWT `sub` claim). */
  userId: string;
  email: string | null;
  name: string | null;
  role: string | null;
  /** Which identity domain's JWKS verified the token. */
  userType: UserType;
  /** All verified claims, for callers that need more than the fields above. */
  claims: JWTPayload;
}

/**
 * Verifies Bearer JWTs minted by the auth service against the correct domain's
 * JWKS. Implementations decide which key set(s) a token may be checked against.
 */
export interface JwtVerifier {
  /**
   * @param authorization the raw `Authorization` header value (or null)
   * @param allowed       the domains whose JWKS the token may be verified with
   * @throws AppError.unauthenticated when the token is missing/invalid/expired
   */
  verify(
    authorization: string | null,
    allowed: readonly UserType[],
  ): Promise<AuthIdentity>;
}

type RemoteKeySet = ReturnType<typeof createRemoteJWKSet>;

/** Pull the token out of an `Authorization: Bearer <token>` header. */
function extractBearerToken(authorization: string | null): string {
  if (!authorization) {
    throw AppError.unauthenticated(
      "A bearer token is required. Pass it as `Authorization: Bearer <token>`.",
    );
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  if (!match?.[1]) {
    throw AppError.unauthenticated(
      "Malformed Authorization header. Expected `Bearer <token>`.",
    );
  }
  return match[1].trim();
}

/**
 * Verifies tokens against the auth service's remote JWKS endpoints.
 *
 * Every domain (voters/admins/auditors) signs with its own key set, but all
 * three share the same issuer (the IDP base URL), so a token is distinguished
 * only by *which* JWKS validates it. `verify` therefore tries each allowed
 * domain's key set in turn; the first that validates determines `userType`.
 *
 * `createRemoteJWKSet` fetches the JWKS lazily on first use and caches it,
 * refetching (with a cooldown) when it encounters an unknown `kid` — so key
 * rotation on the auth side is picked up automatically.
 */
export class RemoteJwtVerifier implements JwtVerifier {
  private readonly keySets = new Map<UserType, RemoteKeySet>();

  constructor(private readonly issuer: string = idpLink) {}

  private keySet(userType: UserType): RemoteKeySet {
    let set = this.keySets.get(userType);
    if (!set) {
      set = createRemoteJWKSet(new URL(jwksUrl(userType)));
      this.keySets.set(userType, set);
    }
    return set;
  }

  async verify(
    authorization: string | null,
    allowed: readonly UserType[],
  ): Promise<AuthIdentity> {
    const token = extractBearerToken(authorization);

    if (allowed.length === 0) {
      throw AppError.internal("No user types are permitted on this route.");
    }

    // The token's `kid` matches at most one domain's JWKS; verifying against
    // the others yields `JWKSNoMatchingKey`. A *matching* domain that fails
    // (expired/forged) produces a more informative error we prefer to surface.
    let meaningfulError: unknown;

    for (const userType of allowed) {
      try {
        const { payload } = await jwtVerify(token, this.keySet(userType), {
          issuer: this.issuer,
        });
        return this.toIdentity(payload, userType);
      } catch (err) {
        if (!(err instanceof joseErrors.JWKSNoMatchingKey)) {
          meaningfulError = err;
        }
      }
    }

    throw this.toAuthError(meaningfulError);
  }

  private toIdentity(payload: JWTPayload, userType: UserType): AuthIdentity {
    if (!payload.sub) {
      throw AppError.unauthenticated("Token is missing a subject (`sub`).");
    }
    const email = typeof payload.email === "string" ? payload.email : null;
    const name = typeof payload.name === "string" ? payload.name : null;
    const role = typeof payload.role === "string" ? payload.role : null;
    return {
      userId: payload.sub,
      email,
      name,
      role,
      userType,
      claims: payload,
    };
  }

  private toAuthError(error: unknown): AppError {
    if (error instanceof joseErrors.JWTExpired) {
      return AppError.unauthenticated("Token has expired.");
    }
    if (error instanceof joseErrors.JWTClaimValidationFailed) {
      return AppError.unauthenticated("Token claims are invalid.");
    }
    // No domain's key set matched, or the signature failed verification.
    return AppError.unauthenticated("Invalid or unrecognised token.");
  }
}
