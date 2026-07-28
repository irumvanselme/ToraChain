import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { candidates } from "../candidates/model.ts";
import { elections } from "../elections/model.ts";

/**
 * A cast ballot. Not part of the ERD, but required to record votes and compute
 * tallies.
 *
 * Ballot secrecy: this table deliberately holds **no** column that resolves to
 * a voter — no `eligibility_id`, no `voting_number`. Either one would join
 * straight back to `eligibilities.voter_id` and hand anyone with read access to
 * the database (a dump, a replica, a support query) the full "who voted for
 * whom" list next to `candidate_id`. Nothing here can be joined to a voter.
 *
 * The link a voter needs is kept *outside* the database, in the receipt they
 * take away at cast time: `<vote_id>:<encryption key>`. `vote_id` is a random
 * UUID they present to the verify endpoint; the key — which the server never
 * sees — opens `ciphertext`. Losing the receipt means losing the ability to
 * verify, which is the intended trade: no one, including us, can reconstruct
 * the mapping from the database alone.
 *
 * One ballot per eligibility is enforced on the `eligibilities` side, by the
 * guarded `has_voted` flip that shares a transaction with the insert below
 * (see `repository.ts`).
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
    // Vote-verification receipt data (nullable — legacy/non-encrypting clients
    // omit them). `ciphertext` is the voter's AES-GCM encrypted ballot record
    // (base64); `commitment` is its SHA-256 hex, also anchored on-chain. The
    // AES key never reaches the server, so only the voter can open the ciphertext.
    ciphertext: text("ciphertext"),
    commitment: text("commitment"),
    castAt: timestamp("cast_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("votes_election_idx").on(t.electionId)],
);

export type VoteRow = typeof votes.$inferSelect;
