import { describe, it, expect } from "vitest";

import {
  DEV_PASSWORD,
  DEV_CREDENTIALS,
  DEV_USERS,
  getDevCredential,
} from "./credentials.ts";

describe("DEV_CREDENTIALS", () => {
  it("has an entry per dev user type, keyed to match its own userType", () => {
    for (const [key, credential] of Object.entries(DEV_CREDENTIALS)) {
      expect(credential.userType).toBe(key);
      expect(credential.password).toBe(DEV_PASSWORD);
      expect(credential.email).toContain("@localhost.dev");
    }
  });

  it("covers voters, admins, and auditors", () => {
    expect(Object.keys(DEV_CREDENTIALS).sort()).toEqual([
      "admins",
      "auditors",
      "voters",
    ]);
  });
});

describe("DEV_USERS", () => {
  it("is the list of all DEV_CREDENTIALS values", () => {
    expect(DEV_USERS).toHaveLength(3);
    expect(DEV_USERS).toEqual(
      expect.arrayContaining(Object.values(DEV_CREDENTIALS)),
    );
  });
});

describe("getDevCredential", () => {
  it("returns the matching credential for a user type", () => {
    expect(getDevCredential("admins")).toBe(DEV_CREDENTIALS.admins);
    expect(getDevCredential("voters")).toBe(DEV_CREDENTIALS.voters);
    expect(getDevCredential("auditors")).toBe(DEV_CREDENTIALS.auditors);
  });
});
