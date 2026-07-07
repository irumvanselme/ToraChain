import { describe, expect, test } from "vitest";

import { AppHealth } from "./health.ts";
import { AppRegistry, type App } from "./_apps.ts";
import { EUserType } from "./types.ts";

function fakeApp(userType: EUserType, query: () => Promise<unknown>): App {
  return {
    userType,
    dbPool: { query } as unknown as App["dbPool"],
    auth: {} as App["auth"],
  };
}

async function getHealth(registry: AppRegistry) {
  const app = await AppHealth(registry);
  const res = await app.handle(new Request("http://localhost/health"));
  return {
    status: res.status,
    body: (await res.json()) as Record<string, unknown>,
  };
}

describe("AppHealth", () => {
  test("reports ok when every pool answers", async () => {
    const registry = new AppRegistry()
      .registerApp(fakeApp(EUserType.VOTERS, async () => ({ rows: [] })))
      .registerApp(fakeApp(EUserType.ADMINS, async () => ({ rows: [] })));

    const { status, body } = await getHealth(registry);
    expect(status).toBe(200);
    expect(body).toStrictEqual({
      ok: true,
      databases: { voters: "up", admins: "up" },
    });
  });

  test("reports a down database and overall not-ok when a pool throws", async () => {
    const registry = new AppRegistry()
      .registerApp(fakeApp(EUserType.VOTERS, async () => ({ rows: [] })))
      .registerApp(
        fakeApp(EUserType.AUDITORS, async () => {
          throw new Error("connection refused");
        }),
      );

    const { body } = await getHealth(registry);
    expect(body.ok).toBe(false);
    expect(body.databases).toStrictEqual({ voters: "up", auditors: "down" });
  });
});
