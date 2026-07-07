import { describe, expect, test } from "vitest";

import {
  EUserType,
  USER_TYPE_PREFIX,
  auditorOrgTableNames,
  canSelfRegister,
  tableNames,
} from "./types.ts";

describe("EUserType", () => {
  test("has the three identity domains", () => {
    expect(Object.values(EUserType)).toStrictEqual([
      "voters",
      "admins",
      "auditors",
    ]);
  });

  test("each domain has a singular table prefix", () => {
    expect(USER_TYPE_PREFIX).toStrictEqual({
      voters: "voter",
      admins: "admin",
      auditors: "auditor",
    });
  });
});

describe("canSelfRegister", () => {
  test("admins cannot self-register", () => {
    expect(canSelfRegister(EUserType.ADMINS)).toBe(false);
  });

  test("voters and auditors can self-register", () => {
    expect(canSelfRegister(EUserType.VOTERS)).toBe(true);
    expect(canSelfRegister(EUserType.AUDITORS)).toBe(true);
  });
});

describe("tableNames", () => {
  test("prefixes better-auth tables per domain", () => {
    expect(tableNames(EUserType.VOTERS)).toStrictEqual({
      user: "voter_users",
      session: "voter_sessions",
      account: "voter_accounts",
      verification: "voter_verifications",
      jwks: "voter_jwks",
    });
    expect(tableNames(EUserType.ADMINS).user).toBe("admin_users");
    expect(tableNames(EUserType.AUDITORS).jwks).toBe("auditor_jwks");
  });
});

describe("auditorOrgTableNames", () => {
  test("returns the fixed org/member/invitation tables", () => {
    expect(auditorOrgTableNames()).toStrictEqual({
      organization: "auditor_organizations",
      member: "auditor_members",
      invitation: "auditor_invitations",
    });
  });
});
