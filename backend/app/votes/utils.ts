import type { CandidateRow } from "../candidates/model.ts";
import type { CandidateTally } from "./repository.ts";

export interface BallotCandidate {
  candidateId: string;
  candidateNumber: string;
  fullName: string;
  votes?: number;
}

/**
 * Build the candidate list for a ballot. Per-candidate tallies are included
 * only once the election is `closed` (our documented choice); while voting is
 * open the counts are withheld.
 */
export function buildBallotCandidates(
  rows: CandidateRow[],
  tallies: CandidateTally[] | null,
): BallotCandidate[] {
  const counts = tallies
    ? new Map(tallies.map((t) => [t.candidateId, t.count]))
    : null;

  return rows.map((row) => {
    const entry: BallotCandidate = {
      candidateId: row.candidateId,
      candidateNumber: row.candidateNumber,
      fullName: row.fullName,
    };
    if (counts) entry.votes = counts.get(row.candidateId) ?? 0;
    return entry;
  });
}
