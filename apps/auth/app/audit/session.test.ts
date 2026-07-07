import { beforeEach, describe, expect, test, vi } from "vitest";

// Control jose so token verification is deterministic and offline, but keep its
// real `errors` classes so the `instanceof JOSEError` check in session.ts (which
// imports the same module) matches. The factory is hoisted, so its state lives
// in a `vi.hoisted` block hoisted alongside it.
const { jwtVerify } = vi.hoisted(() => ({ jwtVerify: vi.fn() }));

vi.mock("jose", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jose")>();
  return {
    ...actual,
    createRemoteJWKSet: () => () => ({}),
    jwtVerify: (...args: unknown[]) => jwtVerify(...args),
  };
});

import { resolveAuditor } from "./session.ts";
import type { App } from "../_apps.ts";

function appWithSession(
  session: { user: { id: string; name: string; email: string } } | null,
): App {
  return {
    userType: "auditors" as App["userType"],
    dbPool: {} as App["dbPool"],
    auth: {
      api: { getSession: async () => session },
    } as unknown as App["auth"],
  };
}

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/auditors/audit/status", { headers });
}

describe("resolveAuditor", () => {
  beforeEach(() => jwtVerify.mockReset());

  test("resolves from a session cookie", async () => {
    const app = appWithSession({
      user: { id: "auditor-1", name: "Ann", email: "ann@example.com" },
    });
    const principal = await resolveAuditor(app, req());
    expect(principal).toStrictEqual({
      id: "auditor-1",
      name: "Ann",
      email: "ann@example.com",
    });
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  test("returns null with neither a session nor an Authorization header", async () => {
    expect(await resolveAuditor(appWithSession(null), req())).toBeNull();
  });

  test("returns null for a non-Bearer Authorization header", async () => {
    const app = appWithSession(null);
    expect(
      await resolveAuditor(app, req({ authorization: "Basic abc" })),
    ).toBeNull();
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  test("resolves from a valid Bearer JWT", async () => {
    jwtVerify.mockResolvedValue({
      payload: { sub: "auditor-2", name: "Bob", email: "bob@example.com" },
    });
    const principal = await resolveAuditor(
      appWithSession(null),
      req({ authorization: "Bearer good.token" }),
    );
    expect(principal).toStrictEqual({
      id: "auditor-2",
      name: "Bob",
      email: "bob@example.com",
    });
  });

  test("defaults name/email to empty strings when the JWT omits them", async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: "auditor-3" } });
    const principal = await resolveAuditor(
      appWithSession(null),
      req({ authorization: "Bearer good" }),
    );
    expect(principal).toStrictEqual({ id: "auditor-3", name: "", email: "" });
  });

  test("returns null when the JWT lacks a subject", async () => {
    jwtVerify.mockResolvedValue({ payload: { name: "No Sub" } });
    expect(
      await resolveAuditor(
        appWithSession(null),
        req({ authorization: "Bearer t" }),
      ),
    ).toBeNull();
  });
});
