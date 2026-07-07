import { afterAll, describe, expect, test } from "vitest";
import type { Pool } from "pg";

import { createAuth } from "./create.ts";
import { VotersApp } from "./voters.ts";
import { AdminApp } from "./admins.ts";
import { AuditorsApp } from "./auditors.ts";
import { EUserType } from "../types.ts";

const pools: Pool[] = [];

afterAll(async () => {
  await Promise.all(pools.map((p) => p.end().catch(() => {})));
});

describe("createAuth", () => {
  test("wires a better-auth instance and pool for a domain", () => {
    const { auth, dbPool } = createAuth(EUserType.VOTERS);
    pools.push(dbPool);
    expect(typeof auth.handler).toBe("function");
    expect(auth.api).toBeDefined();
  });

  test("accepts extra plugins", () => {
    const { auth, dbPool } = createAuth(EUserType.ADMINS, []);
    pools.push(dbPool);
    expect(auth).toBeDefined();
  });
});

describe("domain apps", () => {
  test("VotersApp exposes the voters domain", () => {
    const app = new VotersApp();
    pools.push(app.dbPool);
    expect(app.userType).toBe(EUserType.VOTERS);
    expect(typeof app.auth.handler).toBe("function");
  });

  test("AdminApp exposes the admins domain", () => {
    const app = new AdminApp();
    pools.push(app.dbPool);
    expect(app.userType).toBe(EUserType.ADMINS);
  });

  test("AuditorsApp exposes the auditors domain with the organization plugin", () => {
    const app = new AuditorsApp();
    pools.push(app.dbPool);
    expect(app.userType).toBe(EUserType.AUDITORS);
    // The organization plugin adds an org creation endpoint.
    const api = app.auth.api as Record<string, unknown>;
    expect(api.createOrganization).toBeDefined();
  });
});
