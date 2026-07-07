import { describe, expect, test } from "vitest";

import { idpLink } from "@tora-chain/configs";

import { loadConfig } from "./env.ts";
import { EUserType } from "./types.ts";

const VALID = {
  BETTER_AUTH_SECRET: "s3cret",
  AUTH_DB_URI: "postgres://u:p@localhost:5432/db",
};

describe("loadConfig", () => {
  test("builds config from a valid environment", () => {
    const config = loadConfig({ ...VALID, PORT: "8001" });
    expect(config.secret).toBe("s3cret");
    expect(config.databaseUrl).toBe(VALID.AUTH_DB_URI);
    expect(config.port).toBe(8001);
    expect(config.baseURL).toBe(idpLink);
    expect(config.trustedOrigins).toContain(idpLink);
  });

  test("points every domain at the single shared database", () => {
    const config = loadConfig(VALID);
    expect(config.databases).toStrictEqual({
      [EUserType.VOTERS]: VALID.AUTH_DB_URI,
      [EUserType.ADMINS]: VALID.AUTH_DB_URI,
      [EUserType.AUDITORS]: VALID.AUTH_DB_URI,
    });
  });

  test("defaults PORT to 3000 when unset", () => {
    expect(loadConfig(VALID).port).toBe(3000);
  });

  test("throws a descriptive error when required vars are missing", () => {
    expect(() => loadConfig({})).toThrow(/Invalid environment configuration/);
    expect(() => loadConfig({})).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => loadConfig({})).toThrow(/AUTH_DB_URI/);
  });

  test("rejects a non-positive port", () => {
    expect(() => loadConfig({ ...VALID, PORT: "-1" })).toThrow(
      /Invalid environment configuration/,
    );
  });
});
