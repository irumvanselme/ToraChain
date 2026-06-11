import { describe, expect, test } from "vitest";

import { AuthCoreService, type FetchLike } from "./AuthCoreService.ts";

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("AuthCoreService", () => {
  test("calls /core/api/voters/:id with the api key and returns the voter", async () => {
    let captured: { url: string; init?: RequestInit } | undefined;
    const fetchImpl: FetchLike = async (url, init) => {
      captured = { url, init };
      return jsonResponse(200, {
        id: "voter-1",
        name: "Ada",
        email: "ada@example.com",
        emailVerified: true,
      });
    };
    const svc = new AuthCoreService(
      "http://auth:3000/",
      "secret-key",
      fetchImpl,
    );

    const voter = await svc.getVoter("voter-1");

    expect(voter).toEqual({
      id: "voter-1",
      name: "Ada",
      email: "ada@example.com",
      emailVerified: true,
    });
    expect(captured?.url).toBe("http://auth:3000/core/api/voters/voter-1");
    const headers = captured?.init?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("secret-key");
  });

  test("returns null when the auth service reports 404", async () => {
    const svc = new AuthCoreService("http://auth", "k", async () =>
      jsonResponse(404, { code: "RESOURCE_NOT_FOUND" }),
    );
    expect(await svc.getVoter("ghost")).toBeNull();
  });

  test("throws INTERNAL_ERROR when the api key is rejected (401)", async () => {
    const svc = new AuthCoreService("http://auth", "bad", async () =>
      jsonResponse(401, { code: "UNAUTHORIZED" }),
    );
    await expect(svc.getVoter("v1")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
    });
  });

  test("throws when the auth service errors (500)", async () => {
    const svc = new AuthCoreService("http://auth", "k", async () =>
      jsonResponse(500),
    );
    await expect(svc.getVoter("v1")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
  });

  test("throws when the response body is malformed", async () => {
    const svc = new AuthCoreService("http://auth", "k", async () =>
      jsonResponse(200, { name: "missing id/email" }),
    );
    await expect(svc.getVoter("v1")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
  });

  test("throws when the request itself fails", async () => {
    const svc = new AuthCoreService("http://auth", "k", async () => {
      throw new Error("network down");
    });
    await expect(svc.getVoter("v1")).rejects.toMatchObject({
      code: "INTERNAL_ERROR",
    });
  });
});
