import { describe, test, expect, vi, beforeEach } from "vitest";

const apiGet = vi.fn();
vi.mock("@/app/api/request", () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

vi.mock("../lib/config.ts", () => ({
  AUDIT_API: "https://api/audit",
}));

import {
  listElections,
  getElection,
  getElectionResults,
  getBlockchainData,
} from "./elections";

describe("elections API", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({});
  });

  describe("listElections", () => {
    test("builds a bare URL with no params", async () => {
      await listElections("tok");
      expect(apiGet).toHaveBeenCalledWith("https://api/audit/elections", "tok");
    });

    test("appends page, limit and q query params", async () => {
      await listElections("tok", { page: 2, limit: 12, q: "mayor" });
      const [url] = apiGet.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("page")).toBe("2");
      expect(parsed.searchParams.get("limit")).toBe("12");
      expect(parsed.searchParams.get("q")).toBe("mayor");
    });

    test("omits params that are falsy", async () => {
      await listElections("tok", { page: 0, limit: 0, q: "" });
      const [url] = apiGet.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.has("page")).toBe(false);
      expect(parsed.searchParams.has("limit")).toBe(false);
      expect(parsed.searchParams.has("q")).toBe(false);
    });
  });

  test("getElection targets the election id", async () => {
    await getElection("tok", "e1");
    expect(apiGet).toHaveBeenCalledWith(
      "https://api/audit/elections/e1",
      "tok",
    );
  });

  test("getElectionResults targets the results endpoint", async () => {
    await getElectionResults("tok", "e1");
    expect(apiGet).toHaveBeenCalledWith(
      "https://api/audit/elections/e1/results",
      "tok",
    );
  });

  test("getBlockchainData targets the blockchain endpoint", async () => {
    await getBlockchainData("tok", "e1");
    expect(apiGet).toHaveBeenCalledWith(
      "https://api/audit/elections/e1/blockchain",
      "tok",
    );
  });
});
