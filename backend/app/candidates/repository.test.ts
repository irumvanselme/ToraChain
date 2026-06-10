import { beforeEach, describe, expect, test } from "vitest";

import { fakeDb, type FakeDrizzle } from "../test-helpers/drizzle-fake.ts";
import { candidates, type CandidateRow } from "./model.ts";
import { DrizzleCandidatesRepository } from "./repository.ts";

const ELECTION = "11111111-1111-1111-1111-111111111111";

const row = (overrides: Partial<CandidateRow> = {}): CandidateRow => ({
  candidateId: "22222222-2222-2222-2222-222222222222",
  electionId: ELECTION,
  fullName: "Jane Doe",
  manifesto: null,
  candidateNumber: "123",
  deleted: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

let db: FakeDrizzle;
let repo: DrizzleCandidatesRepository;

beforeEach(() => {
  db = fakeDb();
  repo = new DrizzleCandidatesRepository(db.asDb());
});

describe("list", () => {
  test("returns the rows plus the counted total", async () => {
    const rows = [row({ fullName: "A" }), row({ fullName: "B" })];
    // First await -> rows, second await -> count aggregate.
    db.queue(rows, [{ count: 2 }]);

    const result = await repo.list(
      ELECTION,
      {},
      { page: 1, limit: 10, offset: 0 },
    );

    expect(result).toEqual({ rows, total: 2 });
    expect(db.lastArgs("from")?.[0]).toBe(candidates);
  });

  test("defaults total to 0 when the count query returns nothing", async () => {
    db.queue([], []);
    const result = await repo.list(
      ELECTION,
      {},
      { page: 1, limit: 10, offset: 0 },
    );
    expect(result.total).toBe(0);
  });
});

describe("findById / findAnyById", () => {
  test("returns the matched row", async () => {
    const found = row();
    db.queue([found]);
    expect(await repo.findById(ELECTION, found.candidateId)).toBe(found);
  });

  test("returns null when nothing matches", async () => {
    db.queue([]);
    expect(await repo.findById(ELECTION, "missing")).toBeNull();
  });

  test("findAnyById returns null when nothing matches", async () => {
    db.queue([]);
    expect(await repo.findAnyById("missing")).toBeNull();
  });
});

describe("listAllActive", () => {
  test("returns all rows from the query", async () => {
    const rows = [row()];
    db.queue(rows);
    expect(await repo.listAllActive(ELECTION)).toBe(rows);
  });
});

describe("create", () => {
  test("inserts the values and returns the created row", async () => {
    const created = row();
    db.queue([created]);

    const result = await repo.create({
      electionId: ELECTION,
      fullName: "Jane Doe",
      candidateNumber: "123",
    });

    expect(result).toBe(created);
    expect(db.lastArgs("insert")?.[0]).toBe(candidates);
    expect(db.lastArgs("values")?.[0]).toMatchObject({
      electionId: ELECTION,
      fullName: "Jane Doe",
      candidateNumber: "123",
    });
  });
});

describe("update", () => {
  test("stamps updatedAt onto the patch and returns the row", async () => {
    const updated = row({ fullName: "New" });
    db.queue([updated]);

    const result = await repo.update(updated.candidateId, { fullName: "New" });

    expect(result).toBe(updated);
    const setArg = db.lastArgs("set")?.[0] as Record<string, unknown>;
    expect(setArg.fullName).toBe("New");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  test("returns null when no row was updated", async () => {
    db.queue([]);
    expect(await repo.update("missing", { fullName: "x" })).toBeNull();
  });
});
