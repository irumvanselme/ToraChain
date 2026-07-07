import { beforeEach, describe, expect, test } from "vitest";

import { AdminAuditRouter, AuditorAuditRouter } from "./_router.ts";
import { AppRegistry, type App } from "../_apps.ts";
import { EUserType } from "../types.ts";

type Session = { user: { id: string; name: string; email: string } } | null;

function appFor(userType: EUserType, session: Session): App {
  return {
    userType,
    dbPool: {} as App["dbPool"],
    auth: {
      api: { getSession: async () => session },
    } as unknown as App["auth"],
  };
}

function registry(...apps: App[]): AppRegistry {
  const r = new AppRegistry();
  apps.forEach((a) => r.registerApp(a));
  return r;
}

async function call(
  app: { handle: (request: Request) => Promise<Response> },
  path: string,
  init?: RequestInit,
) {
  const res = await app.handle(new Request(`http://localhost${path}`, init));
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: body as Record<string, unknown> };
}

describe("AuditorAuditRouter", () => {
  test("throws when the auditors app is not registered", () => {
    expect(() => AuditorAuditRouter(registry())).toThrow(
      /Auditors app not registered/,
    );
  });

  test("GET /status requires an authenticated auditor", async () => {
    const app = AuditorAuditRouter(registry(appFor(EUserType.AUDITORS, null)));
    const res = await call(app, "/auditors/audit/status");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });
});

describe("AdminAuditRouter", () => {
  let router: ReturnType<typeof AdminAuditRouter>;

  beforeEach(() => {
    // Admin session is absent, so every guarded handler stops at requireAdmin
    // before reaching the database.
    router = AdminAuditRouter(registry(appFor(EUserType.ADMINS, null)));
  });

  test("throws when the admins app is not registered", () => {
    expect(() => AdminAuditRouter(registry())).toThrow(
      /Admins app not registered/,
    );
  });

  test("GET / requires an admin session", async () => {
    const res = await call(router, "/core/api/audit-orgs");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  test("GET / rejects an invalid filter value", async () => {
    const res = await call(router, "/core/api/audit-orgs?filter=bogus");
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION");
  });

  test("POST approve requires an admin session", async () => {
    const res = await call(router, "/core/api/audit-orgs/org-1/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  test("POST reject validates the reason before authenticating", async () => {
    const res = await call(router, "/core/api/audit-orgs/org-1/reject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "" }),
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION");
  });

  test("POST reject with a valid body still requires an admin session", async () => {
    const res = await call(router, "/core/api/audit-orgs/org-1/reject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "missing documents" }),
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });
});
