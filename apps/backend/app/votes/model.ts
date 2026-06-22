import { index, numeric, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { candidates } from "../candidates/model.ts";
import { elections } from "../elections/model.ts";
import { eligibilities } from "../voters/model.ts";

/**
 * A cast ballot. Not part of the ERD, but required to record votes and compute
 * tallies. One vote per eligibility is enforced by the unique constraint.
 */
export const votes = pgTable(
  "votes",
  {
    voteId: uuid("vote_id").defaultRandom().primaryKey(),
    electionId: uuid("election_id")
      .notNull()
      .references(() => elections.electionId, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.candidateId, { onDelete: "cascade" }),
    eligibilityId: uuid("eligibility_id")
      .notNull()
      .unique()
      .references(() => eligibilities.eligibilityId, { onDelete: "cascade" }),
    votingNumber: numeric("voting_number", {
      precision: 78,
      scale: 0,
    }).notNull(),
    castAt: timestamp("cast_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("votes_election_idx").on(t.electionId)],
);

export type VoteRow = typeof votes.$inferSelect;
