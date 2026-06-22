import { beforeEach, describe, expect, test } from "vitest";

import { fakeDb, type FakeDrizzle } from "../test-helpers/drizzle-fake.ts";
import {
  eligibilities,
  voters,
  type EligibilityRow,
  type EligibilityWithVoter,
  type VoterRow,
} from "./model.ts";
import { DrizzleVotersRepository } from "./repository.ts";

const ELECTION = "11111111-1111-1111-1111-111111111111";
const VOTER = "22222222-2222-2222-2222-222222222222";

const voterRow = (overrides: Partial<VoterRow> = {}): VoterRow => ({
  voterId: VOTER,
  email: "voter@example.com",
  accountId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

const eligibilityRow = (
  overrides: Partial<EligibilityRow> = {},
): EligibilityRow => ({
  eligibilityId: "33333333-3333-3333-3333-333333333333",
  votingNumber: "123",
  voterId: VOTER,
  electionId: ELECTION,
  hasVoted: false,
  deleted: false,
  externalVoterId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

const joined = (overrides: Partial<EligibilityWithVoter> = {}) =>
  ({
    ...eligibilityRow(),
    email: "voter@example.com",
    accountId: null,
    ...overrides,
  }) as EligibilityWithVoter;

let db: FakeDrizzle;
let repo: DrizzleVotersRepository;

beforeEach(() => {
  db = fakeDb();
  repo = new DrizzleVotersRepository(db.asDb());
});

describe("listEligibilities", () => {
  test("returns the joined rows (no cursor)", async () => {
    const rows = [joined()];
    db.queue(rows);
    expect(await repo.listEligibilities(ELECTION, {}, 10, null)).toBe(rows);
    expect(db.countOf("innerJoin")).toBe(1);
  });

  test("builds a keyset predicate when a cursor is supplied", async () => {
    const rows = [joined()];
    db.queue(rows);
    const cursor = { createdAt: "2026-01-01T00:00:00.000Z", id: "abc" };
    expect(await repo.listEligibilities(ELECTION, {}, 10, cursor)).toBe(rows);
  });
});

describe("findEligibility", () => {
  test("returns the joined row", async () => {
    const found = joined();
    db.queue([found]);
    expect(await repo.findEligibility(ELECTION, VOTER)).toBe(found);
  });

  test("returns null when nothing matches", async () => {
    db.queue([]);
    expect(await repo.findEligibility(ELECTION, "missing")).toBeNull();
  });
});

describe("voter lookups", () => {
  test("findVoterByEmail returns null when nothing matches", async () => {
    db.queue([]);
    expect(await repo.findVoterByEmail("nobody@example.com")).toBeNull();
  });

  test("findVoterById returns the matched row", async () => {
    const found = voterRow();
    db.queue([found]);
    expect(await repo.findVoterById(VOTER)).toBe(found);
  });
});

describe("createVoter / updateVoter", () => {
  test("createVoter inserts into the voters table", async () => {
    const created = voterRow();
    db.queue([created]);

    const result = await repo.createVoter({ email: "voter@example.com" });

    expect(result).toBe(created);
    expect(db.lastArgs("insert")?.[0]).toBe(voters);
    expect(db.lastArgs("values")?.[0]).toMatchObject({
      email: "voter@example.com",
    });
  });

  test("updateVoter stamps updatedAt and returns the row", async () => {
    const updated = voterRow({ accountId: "acct-1" });
    db.queue([updated]);

    const result = await repo.updateVoter(VOTER, { accountId: "acct-1" });

    expect(result).toBe(updated);
    const setArg = db.lastArgs("set")?.[0] as Record<string, unknown>;
    expect(setArg.accountId).toBe("acct-1");
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  test("updateVoter returns null when no row was updated", async () => {
    db.queue([]);
    expect(
      await repo.updateVoter("missing", { email: "x@example.com" }),
    ).toBeNull();
  });
});

describe("createEligibility / updateEligibility", () => {
  test("createEligibility inserts into the eligibility table", async () => {
    const created = eligibilityRow();
    db.queue([created]);

    const result = await repo.createEligibility({
      voterId: VOTER,
      electionId: ELECTION,
      votingNumber: "123",
    });

    expect(result).toBe(created);
    expect(db.lastArgs("insert")?.[0]).toBe(eligibilities);
  });

  test("updateEligibility stamps updatedAt and returns the row", async () => {
    const updated = eligibilityRow({ deleted: true });
    db.queue([updated]);

    const result = await repo.updateEligibility(updated.eligibilityId, {
      deleted: true,
    });

    expect(result).toBe(updated);
    const setArg = db.lastArgs("set")?.[0] as Record<string, unknown>;
    expect(setArg.deleted).toBe(true);
    expect(setArg.updatedAt).toBeInstanceOf(Date);
  });

  test("updateEligibility returns null when no row was updated", async () => {
    db.queue([]);
    expect(
      await repo.updateEligibility("missing", { deleted: true }),
    ).toBeNull();
  });
});
