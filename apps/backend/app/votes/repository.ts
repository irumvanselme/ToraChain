import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { eligibilities } from "../voters/model.ts";
import { votes } from "./model.ts";

export interface RecordVoteInput {
  electionId: string;
  candidateId: string;
  eligibilityId: string;
  votingNumber: string;
  // Vote-verification receipt data (optional — omitted by legacy clients).
  ciphertext?: string;
  commitment?: string;
}

export interface CandidateTally {
  candidateId: string;
  count: number;
}

/**
 * The stored side of a vote a voter needs to verify their receipt against:
 * the encrypted ballot and the candidate that was actually counted.
 */
export interface VoteReceipt {
  candidateId: string;
  votingNumber: string;
  ciphertext: string | null;
  commitment: string | null;
  castAt: Date;
}

export interface VotesRepository {
  /**
   * Atomically record a ballot and flip the eligibility's `has_voted` flag.
   * Returns the cast timestamp, or `null` if the voter had already voted
   * (the guarded update matched no rows).
   */
  recordVote(input: RecordVoteInput): Promise<{ castAt: Date } | null>;
  tallies(electionId: string): Promise<CandidateTally[]>;
  /** The voter's own recorded vote, resolved by their eligibility. */
  findByEligibility(eligibilityId: string): Promise<VoteReceipt | null>;
}

export class DrizzleVotesRepository implements VotesRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async recordVote(input: RecordVoteInput): Promise<{ castAt: Date } | null> {
    return this.db.transaction(async (tx) => {
      // Guarded flip — only succeeds if the voter has not already voted.
      const flipped = await tx
        .update(eligibilities)
        .set({ hasVoted: true, updatedAt: new Date() })
        .where(
          and(
            eq(eligibilities.eligibilityId, input.eligibilityId),
            eq(eligibilities.hasVoted, false),
          ),
        )
        .returning({ id: eligibilities.eligibilityId });

      if (flipped.length === 0) return null;

      const [vote] = await tx
        .insert(votes)
        .values({
          electionId: input.electionId,
          candidateId: input.candidateId,
          eligibilityId: input.eligibilityId,
          votingNumber: input.votingNumber,
          ciphertext: input.ciphertext ?? null,
          commitment: input.commitment ?? null,
        })
        .returning({ castAt: votes.castAt });

      return { castAt: vote!.castAt };
    });
  }

  async findByEligibility(eligibilityId: string): Promise<VoteReceipt | null> {
    const [row] = await this.db
      .select({
        candidateId: votes.candidateId,
        votingNumber: votes.votingNumber,
        ciphertext: votes.ciphertext,
        commitment: votes.commitment,
        castAt: votes.castAt,
      })
      .from(votes)
      .where(eq(votes.eligibilityId, eligibilityId))
      .limit(1);
    return row ?? null;
  }

  async tallies(electionId: string): Promise<CandidateTally[]> {
    const rows = await this.db
      .select({
        candidateId: votes.candidateId,
        count: sql<number>`count(*)::int`,
      })
      .from(votes)
      .where(eq(votes.electionId, electionId))
      .groupBy(votes.candidateId);
    return rows.map((r) => ({ candidateId: r.candidateId, count: r.count }));
  }
}
