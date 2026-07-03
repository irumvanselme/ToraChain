import type { UserType } from "@tora-chain/configs";

import { createAuthGuard } from "../auth/protect.ts";
import type { AuthIdentity, JwtVerifier } from "../auth/jwt.ts";

/**
 * A verifier that accepts every request without inspecting the token, so
 * controller/integration tests can exercise business logic without minting
 * real JWTs. The reported `userType` defaults to the route's first allowed
 * domain; override any field via the constructor.
 */
export class AllowAllVerifier implements JwtVerifier {
  constructor(private readonly identity: Partial<AuthIdentity> = {}) {}

  async verify(
    _authorization: string | null,
    allowed: readonly UserType[],
  ): Promise<AuthIdentity> {
    return {
      userId: "test-user",
      email: "test@example.com",
      name: "Test User",
      role: null,
      userType: allowed[0] ?? "admins",
      claims: {},
      ...this.identity,
    };
  }
}

/** An auth guard backed by {@link AllowAllVerifier}, for use in tests. */
export function testAuthGuard(identity?: Partial<AuthIdentity>) {
  return createAuthGuard(new AllowAllVerifier(identity));
}
