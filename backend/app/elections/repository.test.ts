import { beforeEach, describe, expect, test } from "vitest";

import { fakeDb, type FakeDrizzle } from "../test-helpers/drizzle-fake.ts";
import { elections, type ElectionRow } from "./model.ts";
import { DrizzleElectionsRepository } from "./repository.ts";

const row = (overrides: Partial<ElectionRow> = {}): ElectionRow => ({
  electionId: "11111111-1111-1111-1111-111111111111",
  electionNumber: "123",
  title: "2026 General Election",
  description: null,
  status: "draft",
  startTime: null,
  endTime: null,
  deleted: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

let db: FakeDrizzle;
let repo: DrizzleElectionsRepository;

beforeEach(() => {
  db = fakeDb();
  repo = new DrizzleElectionsRepository(db.asDb());
});

describe("list", () => {
  test("returns the rows plus the counted total", async () => {
    const rows = [row()];
    db.queue(rows, [{ count: 1 }]);

    const result = await repo.list({}, { page: 1, limit: 10, offset: 0 });

    expect(result).toEqual({ rows, total: 1 });
    expect(db.lastArgs("from")?.[0]).toBe(elections);
  });

  test("defaults total to 0 when the count query returns nothing", async () => {
    db.queue([], []);
    const result = await repo.list(
      { status: "active" },
      { page: 1, limit: 5, offset: 0 },
    );
    expect(result.total).toBe(0);
  });
});

describe("findById / findActiveByTitle", () => {
  test("returns the matched row", async () => {
    const found = row();
    db.queue([found]);
    expect(await repo.findById(found.electionId)).toBe(found);
  });

  test("returns null when nothing matches", async () => {
    db.queue([]);
    expect(await repo.findById("missing")).toBeNull();
  });

  test("findActiveByTitle returns null when nothing matches", async () => {
    db.queue([]);
    expect(await repo.findActiveByTitle("Nope")).toBeNull();
  });
});

describe("create", () => {
  test("inserts the values and returns the created row", async () => {
    const created = row();
    db.queue([created]);

    const result = await repo.create({
      title: "2026 General Election",
      electionNumber: "123",
    });

    expect(result).toBe(created);
    expect(db.lastArgs("insert")?.[0]).toBe(elections);
    expect(db.lastArgs("values")?.[0]).toMatchObject({
      title: "2026 General Election",
      electionNumber: "123",
    });
  });
});

describe("update", () => {
  test("stamps updatedAt onto the patch and returns the row", async () => {
    const updated = row({ status: "active" });
    db.queue([updated]);

    const result = await repo.update(updated.electionId, { status: "active" });

    expect(result).toBe(updated);
    const setArg = db.lastArgs("set")?.[0] as Record<string, unknown>;
    expect(setArg.status).toBe("active");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  test("returns null when no row was updated", async () => {
    db.queue([]);
    expect(await repo.update("missing", { title: "x" })).toBeNull();
  });
});
