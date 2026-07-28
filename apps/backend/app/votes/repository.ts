import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { eligibilities } from "../voters/model.ts";
import { votes } from "./model.ts";

export interface RecordVoteInput {
  electionId: string;
  candidateId: string;
  /**
   * Only used to claim the voter's single ballot (the guarded `has_voted`
   * flip). It is deliberately **not** stored on the vote row — persisting it
   * would re-create the `votes → eligibilities → voter` join this schema
   * exists to prevent.
   */
  eligibilityId: string;
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
  voteId: string;
  electionId: string;
  candidateId: string;
  ciphertext: string | null;
  commitment: string | null;
  castAt: Date;
}

export interface VotesRepository {
  /**
   * Atomically record a ballot and flip the eligibility's `has_voted` flag.
   * Returns the new vote id and cast timestamp, or `null` if the voter had
   * already voted (the guarded update matched no rows).
   */
  recordVote(input: RecordVoteInput): Promise<{
    voteId: string;
    castAt: Date;
  } | null>;
  tallies(electionId: string): Promise<CandidateTally[]>;
  /** A vote by its id — the capability handed to the voter in their receipt. */
  findById(voteId: string): Promise<VoteReceipt | null>;
}

export class DrizzleVotesRepository implements VotesRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async recordVote(
    input: RecordVoteInput,
  ): Promise<{ voteId: string; castAt: Date } | null> {
    return this.db.transaction(async (tx) => {
      // Guarded flip — only succeeds if the voter has not already voted. This
      // is what enforces one ballot per eligibility now that the vote row
      // carries no reference back to it: the row lock serialises concurrent
      // casts and the loser re-reads `has_voted = true` and matches nothing.
      //
      // `updated_at` is intentionally left alone. Bumping it would stamp the
      // eligibility with the moment the ballot was cast, and lining that up
      // against `votes.cast_at` would re-identify the voter by timing — the
      // same leak the dropped `eligibility_id` column represented.
      const flipped = await tx
        .update(eligibilities)
        .set({ hasVoted: true })
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
          ciphertext: input.ciphertext ?? null,
          commitment: input.commitment ?? null,
        })
        .returning({ voteId: votes.voteId, castAt: votes.castAt });

      return { voteId: vote!.voteId, castAt: vote!.castAt };
    });
  }

  async findById(voteId: string): Promise<VoteReceipt | null> {
    const [row] = await this.db
      .select({
        voteId: votes.voteId,
        electionId: votes.electionId,
        candidateId: votes.candidateId,
        ciphertext: votes.ciphertext,
        commitment: votes.commitment,
        castAt: votes.castAt,
      })
      .from(votes)
      .where(eq(votes.voteId, voteId))
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
