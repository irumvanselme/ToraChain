import { beforeEach, describe, expect, test } from "vitest";

import {
  ApiKeysRepository,
  CoreVotersRepository,
  type ApiKeyRow,
  type Queryable,
  type VoterUserRow,
} from "./repository.ts";
import { ApiKeyService, CoreVotersService } from "./service.ts";
import { hashApiKey } from "./keys.ts";

/** Records queries and returns queued row-sets in FIFO order. */
class FakeQueryable implements Queryable {
  calls: { text: string; params?: unknown[] }[] = [];
  private results: unknown[][] = [];

  queue(rows: unknown[]): this {
    this.results.push(rows);
    return this;
  }

  async query<R = Record<string, unknown>>(text: string, params?: unknown[]) {
    this.calls.push({ text, params });
    return { rows: (this.results.shift() ?? []) as R[] };
  }
}

function apiKeyRow(partial: Partial<ApiKeyRow> = {}): ApiKeyRow {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: partial.id ?? "key-1",
    name: partial.name ?? "ci",
    prefix: partial.prefix ?? "abc123",
    key_hash: partial.key_hash ?? "hash",
    created_by: partial.created_by ?? "admin-1",
    last_used_at: partial.last_used_at ?? null,
    expires_at: partial.expires_at ?? null,
    revoked: partial.revoked ?? false,
    created_at: partial.created_at ?? now,
    updated_at: partial.updated_at ?? now,
  };
}

describe("ApiKeyService", () => {
  let db: FakeQueryable;
  let service: ApiKeyService;

  beforeEach(() => {
    db = new FakeQueryable();
    service = new ApiKeyService(new ApiKeysRepository(db));
  });

  test("create returns the plaintext token and stores its hash", async () => {
    db.queue([apiKeyRow({ name: "ci-key" })]);
    const created = await service.create({
      name: "ci-key",
      createdBy: "admin-1",
    });

    expect(created.token).toMatch(/^tck_/);
    expect(created.name).toBe("ci-key");
    // The hash persisted must be the hash of the returned token.
    const insertParams = db.calls[0]!.params!;
    expect(insertParams[3]).toBe(hashApiKey(created.token));
    expect(created).not.toHaveProperty("key_hash");
  });

  test("list serializes rows to DTOs without the hash", async () => {
    db.queue([apiKeyRow({ id: "a" }), apiKeyRow({ id: "b" })]);
    const keys = await service.list();
    expect(keys.map((k) => k.id)).toEqual(["a", "b"]);
    expect(keys[0]).not.toHaveProperty("key_hash");
    expect(keys[0]!.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  test("get returns null when the key is missing", async () => {
    db.queue([]);
    expect(await service.get("nope")).toBeNull();
  });

  test("verify accepts a live key and touches last_used_at", async () => {
    db.queue([apiKeyRow({ id: "k", revoked: false })]).queue([]);
    const result = await service.verify("tck_whatever");
    expect(result?.id).toBe("k");
    // Second call updates last_used_at.
    expect(db.calls[1]!.text).toContain("last_used_at");
  });

  test("verify rejects a revoked key", async () => {
    db.queue([apiKeyRow({ revoked: true })]);
    expect(await service.verify("tck_x")).toBeNull();
  });

  test("verify rejects an expired key", async () => {
    db.queue([apiKeyRow({ expires_at: new Date("2020-01-01T00:00:00.000Z") })]);
    expect(await service.verify("tck_x")).toBeNull();
  });

  test("verify rejects an empty token without hitting the db", async () => {
    expect(await service.verify("")).toBeNull();
    expect(db.calls).toHaveLength(0);
  });
});

describe("CoreVotersService", () => {
  test("returns a serialized voter", async () => {
    const db = new FakeQueryable();
    const now = new Date("2026-02-02T00:00:00.000Z");
    const row: VoterUserRow = {
      id: "voter-1",
      name: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    db.queue([row]);
    const service = new CoreVotersService(new CoreVotersRepository(db));
    const voter = await service.getVoter("voter-1");
    expect(voter).toEqual({
      id: "voter-1",
      name: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      createdAt: "2026-02-02T00:00:00.000Z",
      updatedAt: "2026-02-02T00:00:00.000Z",
    });
    expect(db.calls[0]!.text).toContain("voter_users");
  });

  test("returns null for an unknown voter", async () => {
    const db = new FakeQueryable();
    db.queue([]);
    const service = new CoreVotersService(new CoreVotersRepository(db));
    expect(await service.getVoter("ghost")).toBeNull();
  });
});
