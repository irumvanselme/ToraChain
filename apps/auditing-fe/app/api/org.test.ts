import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../lib/config.ts", () => ({
  AUTH_BASE: "https://idp/auditors",
  AUTH_API: "https://idp/auditors/api",
}));

import { fetchAuditStatus, createOrganization } from "./org";

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function notOk(status: number, body: unknown = {}) {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("fetchAuditStatus", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  test("requests the audit status URL with credentials", async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(ok({ userId: "u1", org: null }));

    const result = await fetchAuditStatus();

    expect(result).toEqual({ userId: "u1", org: null });
    const [url, options] = mock.mock.calls[0];
    expect(url).toBe("https://idp/auditors/audit/status");
    expect(options.credentials).toBe("include");
  });

  test("returns null when the response is not OK", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      notOk(401),
    );
    expect(await fetchAuditStatus()).toBeNull();
  });

  test("returns null when fetch throws", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network down"),
    );
    expect(await fetchAuditStatus()).toBeNull();
  });
});

describe("createOrganization", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  test("POSTs name and slug and returns the created org", async () => {
    const mock = fetch as unknown as ReturnType<typeof vi.fn>;
    mock.mockResolvedValue(ok({ id: "org1", name: "Acme" }));

    const result = await createOrganization("Acme", "acme");

    expect(result).toEqual({ id: "org1", name: "Acme" });
    const [url, options] = mock.mock.calls[0];
    expect(url).toBe("https://idp/auditors/api/organization/create");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ name: "Acme", slug: "acme" });
  });

  test("returns the server error message on failure", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      notOk(400, { message: "slug taken" }),
    );

    expect(await createOrganization("Acme", "acme")).toEqual({
      error: "slug taken",
    });
  });

  test("falls back to an HTTP status message when body has none", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      notOk(500, {}),
    );

    expect(await createOrganization("Acme", "acme")).toEqual({
      error: "HTTP 500",
    });
  });

  test("tolerates an unparseable error body", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("bad json");
      },
    } as unknown as Response);

    expect(await createOrganization("Acme", "acme")).toEqual({
      error: "HTTP 502",
    });
  });
});
