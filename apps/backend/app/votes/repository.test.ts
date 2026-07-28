import { beforeEach, describe, expect, test } from "vitest";

import { fakeDb, type FakeDrizzle } from "../test-helpers/drizzle-fake.ts";
import { votes } from "./model.ts";
import { DrizzleVotesRepository } from "./repository.ts";

const ELECTION = "11111111-1111-1111-1111-111111111111";
const CANDIDATE = "22222222-2222-2222-2222-222222222222";
const ELIGIBILITY = "33333333-3333-3333-3333-333333333333";
const VOTE = "44444444-4444-4444-4444-444444444444";

const input = {
  electionId: ELECTION,
  candidateId: CANDIDATE,
  eligibilityId: ELIGIBILITY,
};

let db: FakeDrizzle;
let repo: DrizzleVotesRepository;

beforeEach(() => {
  db = fakeDb();
  repo = new DrizzleVotesRepository(db.asDb());
});

describe("recordVote", () => {
  test("records the ballot and returns its id and castAt when the flip succeeds", async () => {
    const castAt = new Date("2026-06-09T10:00:00Z");
    // First await -> guarded flip matched a row; second await -> inserted vote.
    db.queue([{ id: ELIGIBILITY }], [{ voteId: VOTE, castAt }]);

    const result = await repo.recordVote(input);

    expect(result).toEqual({ voteId: VOTE, castAt });
    expect(db.countOf("insert")).toBe(1);
    expect(db.lastArgs("insert")?.[0]).toBe(votes);
    expect(db.lastArgs("values")?.[0]).toMatchObject({
      electionId: ELECTION,
      candidateId: CANDIDATE,
    });
  });

  test("stores nothing that identifies the voter", async () => {
    db.queue([{ id: ELIGIBILITY }], [{ voteId: VOTE, castAt: new Date() }]);

    await repo.recordVote({
      ...input,
      ciphertext: "sealed",
      commitment: "hash",
    });

    // The eligibility only gates the insert; persisting it (or the voting
    // number) would put the voter one join away from `candidate_id`.
    const values = db.lastArgs("values")?.[0] as Record<string, unknown>;
    expect(Object.keys(values)).toEqual([
      "electionId",
      "candidateId",
      "ciphertext",
      "commitment",
    ]);
    expect(JSON.stringify(values)).not.toContain(ELIGIBILITY);
  });

  test("leaves the eligibility's updatedAt alone so it cannot be timed against castAt", async () => {
    db.queue([{ id: ELIGIBILITY }], [{ voteId: VOTE, castAt: new Date() }]);

    await repo.recordVote(input);

    expect(db.lastArgs("set")?.[0]).toEqual({ hasVoted: true });
  });

  test("returns null and skips the insert when the voter already voted", async () => {
    // Guarded flip matched no rows.
    db.queue([]);

    const result = await repo.recordVote(input);

    expect(result).toBeNull();
    expect(db.countOf("insert")).toBe(0);
  });
});

describe("findById", () => {
  test("returns the stored side of the ballot", async () => {
    const castAt = new Date("2026-06-09T10:00:00Z");
    db.queue([
      {
        voteId: VOTE,
        electionId: ELECTION,
        candidateId: CANDIDATE,
        ciphertext: "sealed",
        commitment: "hash",
        castAt,
      },
    ]);

    expect(await repo.findById(VOTE)).toEqual({
      voteId: VOTE,
      electionId: ELECTION,
      candidateId: CANDIDATE,
      ciphertext: "sealed",
      commitment: "hash",
      castAt,
    });
    expect(db.lastArgs("from")?.[0]).toBe(votes);
  });

  test("returns null for an unknown vote id", async () => {
    db.queue([]);
    expect(await repo.findById(VOTE)).toBeNull();
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
