import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTokenManager,
  getTokenManager,
  readStoredToken,
  clearStoredToken,
} from "./manager";

function jwtWithExpiry(expSeconds: number | undefined): string {
  const header = btoa(JSON.stringify({ alg: "none" }));
  const payload =
    expSeconds === undefined
      ? btoa(JSON.stringify({}))
      : btoa(JSON.stringify({ exp: expSeconds }));
  return `${header}.${payload}.signature`;
}

const NOW_SECONDS = 1_000_000;

describe("token manager", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now").mockReturnValue(NOW_SECONDS * 1000);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("readStoredToken / clearStoredToken", () => {
    test("returns null when nothing is stored", () => {
      expect(readStoredToken("voters")).toBeNull();
    });

    test("clearStoredToken removes the cached token", () => {
      localStorage.setItem("tora-chain.jwt.voters", "abc");
      clearStoredToken("voters");
      expect(readStoredToken("voters")).toBeNull();
    });
  });

  describe("getToken", () => {
    test("returns the cached token when it is still valid", async () => {
      const token = jwtWithExpiry(NOW_SECONDS + 3600);
      localStorage.setItem("tora-chain.jwt.admins", token);
      const manager = createTokenManager({
        key: "admins",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const result = await manager.getToken();

      expect(result).toBe(token);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test("refreshes when there is no cached token", async () => {
      const fresh = jwtWithExpiry(NOW_SECONDS + 3600);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ token: fresh }),
      });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const result = await manager.getToken();

      expect(result).toBe(fresh);
      expect(readStoredToken("voters")).toBe(fresh);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://idp.localhost/api/token",
        {
          credentials: "include",
          headers: { accept: "application/json" },
        },
      );
    });

    test("refreshes when the cached token is within the skew window", async () => {
      const stale = jwtWithExpiry(NOW_SECONDS + 10);
      localStorage.setItem("tora-chain.jwt.voters", stale);
      const fresh = jwtWithExpiry(NOW_SECONDS + 3600);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ token: fresh }),
      });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const result = await manager.getToken();

      expect(result).toBe(fresh);
    });

    test("refreshes when the cached token has no exp claim", async () => {
      localStorage.setItem("tora-chain.jwt.voters", jwtWithExpiry(undefined));
      const fresh = jwtWithExpiry(NOW_SECONDS + 3600);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ token: fresh }),
      });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      expect(await manager.getToken()).toBe(fresh);
    });

    test("refreshes when the cached token is malformed", async () => {
      localStorage.setItem("tora-chain.jwt.voters", "not-a-jwt");
      const fresh = jwtWithExpiry(NOW_SECONDS + 3600);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ token: fresh }),
      });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      expect(await manager.getToken()).toBe(fresh);
    });

    test("honors a custom refresh skew", async () => {
      const token = jwtWithExpiry(NOW_SECONDS + 20);
      localStorage.setItem("tora-chain.jwt.voters", token);
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
        refreshSkewSeconds: 5,
      });

      expect(await manager.getToken()).toBe(token);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test("clears the stored token when the refresh fails", async () => {
      localStorage.setItem("tora-chain.jwt.voters", "stale");
      fetchMock.mockResolvedValue({ ok: false });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const result = await manager.getToken();

      expect(result).toBeNull();
      expect(readStoredToken("voters")).toBeNull();
    });

    test("returns null when the fetch throws", async () => {
      fetchMock.mockRejectedValue(new Error("network down"));
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      expect(await manager.getToken()).toBeNull();
    });

    test("returns null when the response body has no token", async () => {
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      expect(await manager.getToken()).toBeNull();
    });

    test("returns null when the response body is not valid json", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("bad json");
        },
      });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      expect(await manager.getToken()).toBeNull();
    });

    test("de-dupes concurrent refreshes into a single request", async () => {
      const fresh = jwtWithExpiry(NOW_SECONDS + 3600);
      let resolveFetch: (value: unknown) => void = () => {};
      fetchMock.mockReturnValue(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const first = manager.getToken();
      const second = manager.getToken();
      resolveFetch({ ok: true, json: async () => ({ token: fresh }) });

      expect(await first).toBe(fresh);
      expect(await second).toBe(fresh);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("refresh", () => {
    test("forces a new fetch even with a valid cached token", async () => {
      const cached = jwtWithExpiry(NOW_SECONDS + 3600);
      localStorage.setItem("tora-chain.jwt.voters", cached);
      const fresh = jwtWithExpiry(NOW_SECONDS + 7200);
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ token: fresh }),
      });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      expect(await manager.refresh()).toBe(fresh);
    });
  });

  describe("peek / clear", () => {
    test("peek reads the cached token synchronously without validating it", () => {
      localStorage.setItem("tora-chain.jwt.voters", "raw-token");
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      expect(manager.peek()).toBe("raw-token");
    });

    test("clear drops the cached token", () => {
      localStorage.setItem("tora-chain.jwt.voters", "raw-token");
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      manager.clear();

      expect(manager.peek()).toBeNull();
    });
  });

  describe("authFetch", () => {
    test("attaches the bearer token to the request", async () => {
      const token = jwtWithExpiry(NOW_SECONDS + 3600);
      localStorage.setItem("tora-chain.jwt.voters", token);
      fetchMock.mockResolvedValue({ status: 200 });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      await manager.authFetch("https://api.localhost/votes");

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = new Headers(init.headers);
      expect(headers.get("Authorization")).toBe(`Bearer ${token}`);
    });

    test("refreshes once and retries on a 401", async () => {
      const stale = jwtWithExpiry(NOW_SECONDS + 3600);
      localStorage.setItem("tora-chain.jwt.voters", stale);
      const fresh = jwtWithExpiry(NOW_SECONDS + 7200);
      fetchMock
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: fresh }),
        })
        .mockResolvedValueOnce({ status: 200 });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const res = await manager.authFetch("https://api.localhost/votes");

      expect(res).toEqual({ status: 200 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [, retryInit] = fetchMock.mock.calls[2] as [string, RequestInit];
      expect(new Headers(retryInit.headers).get("Authorization")).toBe(
        `Bearer ${fresh}`,
      );
    });

    test("returns the 401 response as-is when refresh fails to produce a token", async () => {
      const stale = jwtWithExpiry(NOW_SECONDS + 3600);
      localStorage.setItem("tora-chain.jwt.voters", stale);
      const unauthorized = { status: 401 };
      fetchMock
        .mockResolvedValueOnce(unauthorized)
        .mockResolvedValueOnce({ ok: false });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const res = await manager.authFetch("https://api.localhost/votes");

      expect(res).toBe(unauthorized);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test("does not retry a 401 when no token was available to send", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      fetchMock.mockResolvedValueOnce({ ok: false });
      fetchMock.mockResolvedValueOnce({ status: 401 });
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const res = await manager.authFetch("https://api.localhost/votes");

      expect(res).toEqual({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      errorSpy.mockRestore();
    });

    test("passes through a non-401 response unchanged", async () => {
      const token = jwtWithExpiry(NOW_SECONDS + 3600);
      localStorage.setItem("tora-chain.jwt.voters", token);
      const ok = { status: 200 };
      fetchMock.mockResolvedValue(ok);
      const manager = createTokenManager({
        key: "voters",
        tokenEndpoint: "https://idp.localhost/api/token",
      });

      const res = await manager.authFetch("https://api.localhost/votes");

      expect(res).toBe(ok);
    });
  });
});

describe("getTokenManager", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("returns the same instance for the same key", () => {
    const a = getTokenManager({
      key: "shared-key",
      tokenEndpoint: "https://idp.localhost/api/token",
    });
    const b = getTokenManager({
      key: "shared-key",
      tokenEndpoint: "https://idp.localhost/api/token",
    });

    expect(a).toBe(b);
  });

  test("returns a different instance for a different key", () => {
    const a = getTokenManager({
      key: "key-a",
      tokenEndpoint: "https://idp.localhost/api/token",
    });
    const b = getTokenManager({
      key: "key-b",
      tokenEndpoint: "https://idp.localhost/api/token",
    });

    expect(a).not.toBe(b);
  });
});
