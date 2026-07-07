import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getSession, signOut } from "./session";
import type { AuthUser } from "./types";

const AUTH_API = "https://idp.localhost/api";

const user: AuthUser = {
  id: "u1",
  email: "voter@example.com",
  name: "Voter",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("getSession", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("returns the user when the session response is ok", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ user }),
    });

    const result = await getSession(AUTH_API);

    expect(result).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(`${AUTH_API}/get-session`, {
      credentials: "include",
      headers: { accept: "application/json" },
      signal: undefined,
    });
  });

  test("returns null when the response body has no user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    expect(await getSession(AUTH_API)).toBeNull();
  });

  test("returns null when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false });

    expect(await getSession(AUTH_API)).toBeNull();
  });

  test("returns null when the response body is not valid json", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("invalid json");
      },
    });

    expect(await getSession(AUTH_API)).toBeNull();
  });

  test("returns null when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    expect(await getSession(AUTH_API)).toBeNull();
  });

  test("rethrows an abort error", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    fetchMock.mockRejectedValue(abortError);

    await expect(getSession(AUTH_API)).rejects.toBe(abortError);
  });

  test("forwards the abort signal", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ user }) });
    const controller = new AbortController();

    await getSession(AUTH_API, controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      `${AUTH_API}/get-session`,
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});

describe("signOut", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("posts to the sign-out endpoint", async () => {
    fetchMock.mockResolvedValue({ ok: true });

    await signOut(AUTH_API);

    expect(fetchMock).toHaveBeenCalledWith(`${AUTH_API}/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  });

  test("resolves even when the request fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    await expect(signOut(AUTH_API)).resolves.toBeUndefined();
  });
});
