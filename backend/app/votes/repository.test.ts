import { beforeEach, describe, expect, test } from "vitest";

import { fakeDb, type FakeDrizzle } from "../test-helpers/drizzle-fake.ts";
import { votes } from "./model.ts";
import { DrizzleVotesRepository } from "./repository.ts";

const ELECTION = "11111111-1111-1111-1111-111111111111";
const CANDIDATE = "22222222-2222-2222-2222-222222222222";
const ELIGIBILITY = "33333333-3333-3333-3333-333333333333";

const input = {
  electionId: ELECTION,
  candidateId: CANDIDATE,
  eligibilityId: ELIGIBILITY,
  votingNumber: "123",
};

let db: FakeDrizzle;
let repo: DrizzleVotesRepository;

beforeEach(() => {
  db = fakeDb();
  repo = new DrizzleVotesRepository(db.asDb());
});

describe("recordVote", () => {
  test("records the ballot and returns castAt when the flip succeeds", async () => {
    const castAt = new Date("2026-06-09T10:00:00Z");
    // First await -> guarded flip matched a row; second await -> inserted vote.
    db.queue([{ id: ELIGIBILITY }], [{ castAt }]);

    const result = await repo.recordVote(input);

    expect(result).toEqual({ castAt });
    expect(db.countOf("insert")).toBe(1);
    expect(db.lastArgs("insert")?.[0]).toBe(votes);
    expect(db.lastArgs("values")?.[0]).toMatchObject({
      electionId: ELECTION,
      candidateId: CANDIDATE,
      eligibilityId: ELIGIBILITY,
      votingNumber: "123",
    });
  });

  test("returns null and skips the insert when the voter already voted", async () => {
    // Guarded flip matched no rows.
    db.queue([]);

    const result = await repo.recordVote(input);

    expect(result).toBeNull();
    expect(db.countOf("insert")).toBe(0);
  });
});

describe("tallies", () => {
  test("maps grouped rows to candidate tallies", async () => {
    db.queue([
      { candidateId: "a", count: 3 },
      { candidateId: "b", count: 1 },
    ]);

    expect(await repo.tallies(ELECTION)).toEqual([
      { candidateId: "a", count: 3 },
      { candidateId: "b", count: 1 },
    ]);
    expect(db.lastArgs("from")?.[0]).toBe(votes);
  });

  test("returns an empty array when no votes were cast", async () => {
    db.queue([]);
    expect(await repo.tallies(ELECTION)).toEqual([]);
  });
});
