import { Elysia } from "elysia";
import { describe, expect, test } from "vitest";

import { errorHandler } from "../common/error-handler.ts";
import { AppError } from "../common/errors.ts";
import { createAuthGuard } from "./protect.ts";
import {
  RemoteJwtVerifier,
  type AuthIdentity,
  type JwtVerifier,
} from "./jwt.ts";

/** Verifier that accepts one magic token and rejects everything else. */
class StubVerifier implements JwtVerifier {
  async verify(
    authorization: string | null,
    allowed: readonly string[],
  ): Promise<AuthIdentity> {
    if (authorization !== "Bearer valid") {
      throw AppError.unauthenticated("bad token");
    }
    return {
      userId: "u-1",
      email: "user@example.com",
      name: "User",
      role: null,
      userType: (allowed[0] ?? "admins") as AuthIdentity["userType"],
      claims: {},
    };
  }
}

function makeApp() {
  const auth = createAuthGuard(new StubVerifier());
  const controller = new Elysia()
    .use(auth)
    .get(
      "/me",
      ({ auth }) => ({ userId: auth.userId, userType: auth.userType }),
      {
        protect: ["admins", "auditors"],
      },
    );
  const app = new Elysia().use(errorHandler).use(controller);
  return (init?: RequestInit) =>
    app.handle(new Request("http://localhost/me", init)).then(async (res) => ({
      status: res.status,
      body: (await res.json()) as {
        code?: string;
        userId?: string;
        userType?: string;
      },
    }));
}

describe("protect macro", () => {
  test("rejects a request with no Authorization header (401)", async () => {
    const call = makeApp();
    const { status, body } = await call();
    expect(status).toBe(401);
    expect(body.code).toBe("UNAUTHENTICATED");
  });

  test("rejects an invalid token (401)", async () => {
    const call = makeApp();
    const { status } = await call({
      headers: { authorization: "Bearer nope" },
    });
    expect(status).toBe(401);
  });

  test("injects the verified identity on success", async () => {
    const call = makeApp();
    const { status, body } = await call({
      headers: { authorization: "Bearer valid" },
    });
    expect(status).toBe(200);
    expect(body).toEqual({ userId: "u-1", userType: "admins" });
  });
});

describe("RemoteJwtVerifier", () => {
  const verifier = new RemoteJwtVerifier();

  test("throws unauthenticated when no header is present", async () => {
    await expect(verifier.verify(null, ["admins"])).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  test("throws unauthenticated for a malformed header", async () => {
    await expect(
      verifier.verify("Token abc", ["admins"]),
    ).rejects.toMatchObject({ status: 401 });
  });
});
