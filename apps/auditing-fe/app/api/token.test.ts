import { describe, test, expect, vi, beforeEach } from "vitest";

const { getToken, getTokenManager } = vi.hoisted(() => {
  const getToken = vi.fn();
  return { getToken, getTokenManager: vi.fn(() => ({ getToken })) };
});

vi.mock("@tora-chain/fe-common", () => ({
  getTokenManager,
}));

vi.mock("../lib/config.ts", () => ({
  AUTH_API: "https://idp/auditors/api",
  USER_TYPE: "auditors",
}));

import { fetchAuditorToken } from "./token";

describe("fetchAuditorToken", () => {
  beforeEach(() => getToken.mockReset());

  test("configures the token manager with the auditor key and endpoint", () => {
    expect(getTokenManager).toHaveBeenCalledWith({
      key: "auditors",
      tokenEndpoint: "https://idp/auditors/api/token",
    });
  });

  test("delegates to the token manager", async () => {
    getToken.mockResolvedValue("jwt-abc");
    expect(await fetchAuditorToken()).toBe("jwt-abc");
    expect(getToken).toHaveBeenCalledOnce();
  });

  test("returns null when there is no active session", async () => {
    getToken.mockResolvedValue(null);
    expect(await fetchAuditorToken()).toBeNull();
  });
});
