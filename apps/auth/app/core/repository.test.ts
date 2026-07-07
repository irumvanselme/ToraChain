import { beforeEach, describe, expect, test } from "vitest";

import {
  ApiKeysRepository,
  CoreVotersRepository,
  type ApiKeyRow,
  type Queryable,
} from "./repository.ts";

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

function row(partial: Partial<ApiKeyRow> = {}): ApiKeyRow {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "key-1",
    name: "CI",
    prefix: "abcd",
    key_hash: "hash",
    created_by: null,
    last_used_at: null,
    expires_at: null,
    revoked: false,
    created_at: now,
    updated_at: now,
    ...partial,
  };
}

describe("ApiKeysRepository", () => {
  let db: FakeQueryable;
  let repo: ApiKeysRepository;

  beforeEach(() => {
    db = new FakeQueryable();
    repo = new ApiKeysRepository(db);
  });

  test("insert passes all columns and returns the row", async () => {
    db.queue([row()]);
    const inserted = await repo.insert({
      id: "key-1",
      name: "CI",
      prefix: "abcd",
      keyHash: "hash",
      createdBy: "admin-1",
      expiresAt: null,
    });
    expect(inserted.id).toBe("key-1");
    expect(db.calls[0]?.params).toStrictEqual([
      "key-1",
      "CI",
      "abcd",
      "hash",
      "admin-1",
      null,
    ]);
  });

  test("list and findById / findByHash / delete round-trip", async () => {
    db.queue([row(), row({ id: "key-2" })]);
    expect(await repo.list()).toHaveLength(2);

    db.queue([row()]);
    expect((await repo.findById("key-1"))?.id).toBe("key-1");

    db.queue([]);
    expect(await repo.findById("missing")).toBeNull();

    db.queue([row()]);
    expect((await repo.findByHash("hash"))?.key_hash).toBe("hash");

    db.queue([{ id: "key-1" }]);
    expect(await repo.delete("key-1")).toBe(true);

    db.queue([]);
    expect(await repo.delete("missing")).toBe(false);
  });

  test("update builds a dynamic SET clause for provided fields only", async () => {
    db.queue([row({ name: "Renamed", revoked: true })]);
    const updated = await repo.update("key-1", {
      name: "Renamed",
      revoked: true,
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
    });
    expect(updated?.name).toBe("Renamed");
    const { text, params } = db.calls[0]!;
    expect(text).toContain('"name" = $1');
    expect(text).toContain('"expires_at" = $2');
    expect(text).toContain('"revoked" = $3');
    expect(text).toContain('"updated_at" = CURRENT_TIMESTAMP');
    expect(text).toContain('where "id" = $4');
    expect(params?.[3]).toBe("key-1");
  });

  test("update with no fields short-circuits to findById", async () => {
    db.queue([row()]);
    const result = await repo.update("key-1", {});
    expect(result?.id).toBe("key-1");
    // Only the findById select ran — no UPDATE statement.
    expect(db.calls).toHaveLength(1);
    expect(db.calls[0]?.text).toContain("select");
  });

  test("update returns null when the key is gone", async () => {
    db.queue([]);
    expect(await repo.update("missing", { revoked: true })).toBeNull();
  });

  test("touchLastUsed issues an update by id", async () => {
    db.queue([]);
    await repo.touchLastUsed("key-1");
    expect(db.calls[0]?.text).toContain('"last_used_at" = CURRENT_TIMESTAMP');
    expect(db.calls[0]?.params).toStrictEqual(["key-1"]);
  });
});

describe("CoreVotersRepository", () => {
  test("findById selects from the voters table", async () => {
    const db = new FakeQueryable();
    const repo = new CoreVotersRepository(db, "voter_users");
    db.queue([
      {
        id: "v-1",
        name: "Ann",
        email: "ann@example.com",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const voter = await repo.findById("v-1");
    expect(voter?.id).toBe("v-1");
    expect(db.calls[0]?.text).toContain('from "voter_users"');
  });

  test("returns null for an unknown voter", async () => {
    const db = new FakeQueryable();
    const repo = new CoreVotersRepository(db, "voter_users");
    db.queue([]);
    expect(await repo.findById("missing")).toBeNull();
  });
});
