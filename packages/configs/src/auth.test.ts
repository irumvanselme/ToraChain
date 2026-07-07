import { describe, it, expect } from "vitest";

import { USER_TYPES, authApiUrl, jwksUrl, tokenUrl } from "./auth.ts";
import { idpLink } from "./links.ts";

describe("USER_TYPES", () => {
  it("lists the three identity domains", () => {
    expect(USER_TYPES).toEqual(["voters", "admins", "auditors"]);
  });
});

describe("authApiUrl", () => {
  it("builds the better-auth API root for a domain", () => {
    expect(authApiUrl("voters")).toBe(`${idpLink}/voters/api`);
    expect(authApiUrl("admins")).toBe(`${idpLink}/admins/api`);
    expect(authApiUrl("auditors")).toBe(`${idpLink}/auditors/api`);
  });
});

describe("jwksUrl", () => {
  it("appends /jwks to the domain's API root", () => {
    expect(jwksUrl("voters")).toBe(`${authApiUrl("voters")}/jwks`);
  });
});

describe("tokenUrl", () => {
  it("appends /token to the domain's API root", () => {
    expect(tokenUrl("admins")).toBe(`${authApiUrl("admins")}/token`);
  });
});
