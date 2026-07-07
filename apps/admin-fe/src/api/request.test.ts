import { describe, test, expect, vi, beforeEach } from "vitest";
import { ApiError, NetworkError } from "./error.ts";

// The request module builds a token manager at import time; capture its
// authFetch so each test can control the network response.
const authFetch = vi.fn();
vi.mock("@tora-chain/fe-common", () => ({
  getTokenManager: () => ({
    authFetch: (...args: unknown[]) => authFetch(...args),
  }),
}));

import { request } from "./request.ts";

function jsonResponse(
  body: unknown,
  { status = 200, contentType = "application/json" } = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  authFetch.mockReset();
});

describe("request", () => {
  test("returns parsed JSON on success", async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({ hello: "world" }));
    const data = await request<{ hello: string }>("/thing");
    expect(data).toEqual({ hello: "world" });
    const [url, init] = authFetch.mock.calls[0];
    expect(url).toBe("/thing");
    expect(init).toMatchObject({ method: "GET", credentials: "include" });
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  test("serializes a body and sets the JSON content-type", async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({ id: 1 }));
    await request("/thing", { method: "POST", body: { a: 1 } });
    const [, init] = authFetch.mock.calls[0];
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  test("builds a query string, skipping undefined and empty values", async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({}));
    await request("/thing", {
      query: { a: 1, b: "x", c: undefined, d: "", e: false },
    });
    const [url] = authFetch.mock.calls[0];
    expect(url).toBe("/thing?a=1&b=x&e=false");
  });

  test("omits the query string entirely when no query is given", async () => {
    authFetch.mockResolvedValueOnce(jsonResponse({}));
    await request("/plain");
    expect(authFetch.mock.calls[0][0]).toBe("/plain");
  });

  test("returns null when the response is not JSON", async () => {
    authFetch.mockResolvedValueOnce(
      jsonResponse("ignored", { contentType: "text/plain" }),
    );
    await expect(request("/thing")).resolves.toBeNull();
  });

  test("throws ApiError with the server-provided code and message", async () => {
    authFetch.mockResolvedValueOnce(
      jsonResponse(
        { code: "BAD", message: "nope", details: { field: "x" } },
        { status: 422 },
      ),
    );
    const err = (await request("/thing").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("BAD");
    expect(err.message).toBe("nope");
    expect(err.details).toEqual({ field: "x" });
  });

  test("falls back to generic error code and message", async () => {
    authFetch.mockResolvedValueOnce(jsonResponse(null, { status: 500 }));
    const err = (await request("/thing").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.message).toBe("Request failed (500)");
    expect(err.details).toBeNull();
  });

  test("wraps network failures in NetworkError", async () => {
    authFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(request("/thing")).rejects.toBeInstanceOf(NetworkError);
  });

  test("re-throws AbortError untouched", async () => {
    const abort = new DOMException("aborted", "AbortError");
    authFetch.mockRejectedValueOnce(abort);
    await expect(request("/thing")).rejects.toBe(abort);
  });
});
