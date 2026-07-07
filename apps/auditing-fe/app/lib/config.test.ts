import { describe, test, expect, vi } from "vitest";

vi.mock("@tora-chain/configs", () => ({
  apiLink: "https://api.example",
  idpLink: "https://idp.example",
}));

import {
  USER_TYPE,
  AUTH_BASE,
  API_BASE,
  ONBOARDING_URL,
  PENDING_URL,
  AUDIT_API,
  AUTH_API,
  loginUrl,
} from "./config";

describe("config", () => {
  test("derives URLs from the configs links", () => {
    expect(USER_TYPE).toBe("auditors");
    expect(API_BASE).toBe("https://api.example");
    expect(AUTH_BASE).toBe("https://idp.example/auditors");
    expect(ONBOARDING_URL).toBe("https://idp.example/auditors/onboarding");
    expect(PENDING_URL).toBe("https://idp.example/auditors/pending");
    expect(AUDIT_API).toBe("https://api.example/audit");
    expect(AUTH_API).toBe("https://idp.example/auditors/api");
  });

  describe("loginUrl", () => {
    test("appends an encoded redirect target", () => {
      expect(loginUrl("/dashboard?tab=x")).toBe(
        "https://idp.example/auditors/login?redirect=%2Fdashboard%3Ftab%3Dx",
      );
    });
  });
});
