import { describe, test, expect } from "vitest";
import {
  USER_TYPE,
  AUTH_BASE,
  API_BASE,
  AUTH_API,
  CORE_API,
  loginUrl,
} from "./config.ts";

describe("config", () => {
  test("USER_TYPE is admins", () => {
    expect(USER_TYPE).toBe("admins");
  });

  test("derived URLs are built from the auth base", () => {
    expect(AUTH_BASE).toContain("/admins");
    expect(AUTH_API).toBe(`${AUTH_BASE}/api`);
    expect(CORE_API).toContain("/core/api");
    expect(typeof API_BASE).toBe("string");
  });

  test("loginUrl encodes the redirect target", () => {
    const url = loginUrl("/elections?page=2");
    expect(url).toBe(
      `${AUTH_BASE}/login?redirect=${encodeURIComponent("/elections?page=2")}`,
    );
  });
});
