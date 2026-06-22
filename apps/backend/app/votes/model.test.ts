import { describe, expect, test } from "vitest";

import type { CandidateRow } from "../candidates/model.ts";
import { buildBallotCandidates } from "./utils.ts";

const candidate = (id: string, number: string): CandidateRow => ({
  candidateId: id,
  electionId: "11111111-1111-1111-1111-111111111111",
  fullName: `Candidate ${id}`,
  manifesto: null,
  candidateNumber: number,
  deleted: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
});

describe("buildBallotCandidates", () => {
  test("omits tallies while voting is open (no tallies passed)", () => {
    const out = buildBallotCandidates([candidate("a", "1")], null);
    expect(out).toEqual([
      { candidateId: "a", candidateNumber: "1", fullName: "Candidate a" },
    ]);
    expect(out[0]).not.toHaveProperty("votes");
  });

  test("includes per-candidate votes when tallies are supplied", () => {
    const out = buildBallotCandidates(
      [candidate("a", "1"), candidate("b", "2")],
      [{ candidateId: "a", count: 3 }],
    );
    expect(out[0]).toMatchObject({ candidateId: "a", votes: 3 });
    // Candidates with no recorded votes default to 0.
    expect(out[1]).toMatchObject({ candidateId: "b", votes: 0 });
  });
});
