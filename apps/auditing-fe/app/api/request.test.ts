import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, apiGet } from "./request";
import { ApiError, NetworkError } from "./errors";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number }) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("returns parsed JSON on a 2xx response", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ hello: "world" }, { ok: true }),
    );

    const result = await apiFetch<{ hello: string }>("https://x/y", null);
    expect(result).toEqual({ hello: "world" });
  });

  test("attaches the Bearer token when provided", async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(jsonResponse({}, { ok: true }));

    await apiFetch("https://x/y", "tok-123");

    const [, options] = mock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer tok-123");
    expect(options.headers.Accept).toBe("application/json");
  });

  test("omits the Authorization header when token is null", async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(jsonResponse({}, { ok: true }));

    await apiFetch("https://x/y", null);

    const [, options] = mock.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  test("merges caller-supplied headers", async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(jsonResponse({}, { ok: true }));

    await apiFetch("https://x/y", null, {
      headers: { "X-Custom": "1" },
    });

    const [, options] = mock.mock.calls[0];
    expect(options.headers["X-Custom"]).toBe("1");
  });

  test("throws ApiError with parsed code/message on non-OK", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse(
        { code: "FORBIDDEN", message: "nope" },
        { ok: false, status: 403 },
      ),
    );

    await expect(apiFetch("https://x/y", null)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "nope",
    });
  });

  test("falls back to generic code/message when body is not JSON", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("invalid json");
      },
    } as unknown as Response);

    const err = await apiFetch("https://x/y", null).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.code).toBe("ERROR");
    expect(err.message).toBe("HTTP 500");
  });

  test("wraps a network failure in NetworkError", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new TypeError("failed to fetch"),
    );

    await expect(apiFetch("https://x/y", null)).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  test("re-throws an ApiError without re-wrapping it", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ code: "BAD", message: "bad" }, { ok: false, status: 400 }),
    );

    await expect(apiFetch("https://x/y", null)).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("apiGet", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("issues a GET with the token", async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(jsonResponse({ ok: 1 }, { ok: true }));

    const result = await apiGet<{ ok: number }>("https://x/y", "t");
    expect(result).toEqual({ ok: 1 });
    const [, options] = mock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer t");
  });
});
