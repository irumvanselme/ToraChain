import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { elections } from "../elections/model.ts";

// ---- Tables --------------------------------------------------------------

/**
 * A global voter, keyed by email and linked to their identity in the auth
 * backend via `accountId`. We deliberately do not store names here — those
 * live in the auth service.
 */
export const voters = pgTable("voters", {
  voterId: uuid("voter_id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  /** Id of the matching account in the auth backend (nullable when unverified). */
  accountId: text("account_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

/** A voter's eligibility (and ballot status) for a single election. */
export const eligibilities = pgTable(
  "eligibilities",
  {
    eligibilityId: uuid("eligibility_id").defaultRandom().primaryKey(),
    // 216-bit server-assigned identifier.
    votingNumber: numeric("voting_number", { precision: 78, scale: 0 })
      .notNull()
      .unique(),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => voters.voterId, { onDelete: "cascade" }),
    electionId: uuid("election_id")
      .notNull()
      .references(() => elections.electionId, { onDelete: "cascade" }),
    hasVoted: boolean("has_voted").notNull().default(false),
    deleted: boolean("deleted").notNull().default(false),
    /** Unique identifier returned by the external eligibility API (null for admin-granted eligibility). */
    externalVoterId: text("external_voter_id"),
    // Millisecond precision so the JS `Date` used in keyset cursors
    // round-trips exactly — otherwise the residual microseconds make the
    // boundary row satisfy `created_at > cursor` and reappear on the next page.
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
      precision: 3,
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
      mode: "date",
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("eligibilities_election_idx").on(t.electionId),
    // One live eligibility per voter+election (soft-deleted rows don't count).
    uniqueIndex("eligibilities_voter_election_uq")
      .on(t.voterId, t.electionId)
      .where(sql`${t.deleted} = false`),
  ],
);

export type VoterRow = typeof voters.$inferSelect;
export type VoterInsert = typeof voters.$inferInsert;
export type EligibilityRow = typeof eligibilities.$inferSelect;
export type EligibilityInsert = typeof eligibilities.$inferInsert;

/** An eligibility joined with its voter (email + accountId). */
export interface EligibilityWithVoter extends EligibilityRow {
  email: string;
  accountId: string | null;
}

// ---- DTO -----------------------------------------------------------------

export interface EligibilityDTO {
  eligibilityId: string;
  voterId: string;
  accountId: string | null;
  electionId: string;
  hasVoted: boolean;
  deleted: boolean;
  externalVoterId: string | null;
}

export function serializeEligibility(
  row: EligibilityWithVoter,
): EligibilityDTO {
  return {
    eligibilityId: row.eligibilityId,
    voterId: row.voterId,
    accountId: row.accountId,
    electionId: row.electionId,
    hasVoted: row.hasVoted,
    deleted: row.deleted,
    externalVoterId: row.externalVoterId ?? null,
  };
}
