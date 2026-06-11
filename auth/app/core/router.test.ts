import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, test } from "vitest";

import { CoreRouter, type CoreDeps } from "./_router.ts";
import type {
  ApiKeyApi,
  ApiKeyDTO,
  CoreVotersApi,
  CreatedApiKeyDTO,
  VoterDTO,
} from "./service.ts";

class FakeApiKeyApi implements ApiKeyApi {
  keys = new Map<string, ApiKeyDTO>();
  tokens = new Map<string, string>();

  async create(input: {
    name: string;
    expiresAt?: string | null;
    createdBy?: string | null;
  }): Promise<CreatedApiKeyDTO> {
    const id = randomUUID();
    const token = `tck_${id}`;
    const dto: ApiKeyDTO = {
      id,
      name: input.name,
      prefix: id,
      createdBy: input.createdBy ?? null,
      lastUsedAt: null,
      expiresAt: input.expiresAt ?? null,
      revoked: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    this.keys.set(id, dto);
    this.tokens.set(token, id);
    return { ...dto, token };
  }

  async list(): Promise<ApiKeyDTO[]> {
    return [...this.keys.values()];
  }

  async get(id: string): Promise<ApiKeyDTO | null> {
    return this.keys.get(id) ?? null;
  }

  async update(
    id: string,
    input: { name?: string; expiresAt?: string | null; revoked?: boolean },
  ): Promise<ApiKeyDTO | null> {
    const k = this.keys.get(id);
    if (!k) return null;
    const updated: ApiKeyDTO = {
      ...k,
      name: input.name ?? k.name,
      revoked: input.revoked ?? k.revoked,
      expiresAt: input.expiresAt === undefined ? k.expiresAt : input.expiresAt,
    };
    this.keys.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.keys.delete(id);
  }

  async verify(token: string): Promise<ApiKeyDTO | null> {
    const id = this.tokens.get(token);
    if (!id) return null;
    const k = this.keys.get(id);
    return k && !k.revoked ? k : null;
  }
}

class FakeCoreVotersApi implements CoreVotersApi {
  voters = new Map<string, VoterDTO>();
  async getVoter(id: string): Promise<VoterDTO | null> {
    return this.voters.get(id) ?? null;
  }
}

describe("CoreRouter", () => {
  let apiKeys: FakeApiKeyApi;
  let voters: FakeCoreVotersApi;
  let app: ReturnType<typeof CoreRouter>;

  const ADMIN = { "x-admin": "yes" };

  beforeEach(() => {
    apiKeys = new FakeApiKeyApi();
    voters = new FakeCoreVotersApi();
    const deps: CoreDeps = {
      apiKeys,
      voters,
      async getAdminSession(headers) {
        return headers.get("x-admin") === "yes" ? { userId: "admin-1" } : null;
      },
    };
    app = CoreRouter(deps);
  });

  const call = async (
    method: string,
    path: string,
    opts: { headers?: Record<string, string>; body?: unknown } = {},
  ) => {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.body) headers["content-type"] = "application/json";
    const res = await app.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      }),
    );
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep raw text */
    }
    return { status: res.status, body: body as Record<string, unknown> };
  };

  test("serves the OpenAPI reference at /core/api/reference", async () => {
    const res = await app.handle(
      new Request("http://localhost/core/api/reference"),
    );
    expect(res.status).toBe(200);
  });

  test("rejects api-key management without an admin session", async () => {
    const res = await call("POST", "/core/api/api-keys", {
      body: { name: "ci" },
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  test("admin can create, list, and delete api keys", async () => {
    const created = await call("POST", "/core/api/api-keys", {
      headers: ADMIN,
      body: { name: "ci" },
    });
    expect(created.status).toBe(201);
    expect(created.body.token).toMatch(/^tck_/);
    expect(created.body.createdBy).toBe("admin-1");

    const list = await call("GET", "/core/api/api-keys", { headers: ADMIN });
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect((list.body as unknown as ApiKeyDTO[]).length).toBe(1);

    const id = (created.body as unknown as ApiKeyDTO).id;
    const del = await call("DELETE", `/core/api/api-keys/${id}`, {
      headers: ADMIN,
    });
    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(true);
  });

  test("404 when updating a missing api key", async () => {
    const res = await call(
      "PATCH",
      "/core/api/api-keys/00000000-0000-0000-0000-000000000000",
      { headers: ADMIN, body: { revoked: true } },
    );
    expect(res.status).toBe(404);
  });

  test("voter lookup requires a valid api key", async () => {
    const res = await call("GET", "/core/api/voters/voter-1");
    expect(res.status).toBe(401);
  });

  test("voter lookup returns the voter with a valid api key", async () => {
    voters.voters.set("voter-1", {
      id: "voter-1",
      name: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const created = await call("POST", "/core/api/api-keys", {
      headers: ADMIN,
      body: { name: "svc" },
    });
    const token = (created.body as unknown as CreatedApiKeyDTO).token;

    const res = await call("GET", "/core/api/voters/voter-1", {
      headers: { "x-api-key": token },
    });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ada@example.com");

    const missing = await call("GET", "/core/api/voters/ghost", {
      headers: { "x-api-key": token },
    });
    expect(missing.status).toBe(404);
  });
});
