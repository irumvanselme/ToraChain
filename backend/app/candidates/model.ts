import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { elections } from "../elections/model.ts";

export const candidates = pgTable(
  "candidates",
  {
    candidateId: uuid("candidate_id").defaultRandom().primaryKey(),
    electionId: uuid("election_id")
      .notNull()
      .references(() => elections.electionId, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    manifesto: text("manifesto"),
    // 216-bit server-generated identifier.
    candidateNumber: numeric("candidate_number", { precision: 78, scale: 0 })
      .notNull()
      .unique(),
    deleted: boolean("deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("candidates_election_idx").on(t.electionId)],
);

export type CandidateRow = typeof candidates.$inferSelect;
export type CandidateInsert = typeof candidates.$inferInsert;

export interface CandidateDTO {
  candidateId: string;
  electionId: string;
  fullName: string;
  manifesto: string | null;
  deleted: boolean;
}

export function serializeCandidate(row: CandidateRow): CandidateDTO {
  return {
    candidateId: row.candidateId,
    electionId: row.electionId,
    fullName: row.fullName,
    manifesto: row.manifesto,
    deleted: row.deleted,
  };
}
