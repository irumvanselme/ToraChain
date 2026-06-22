import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { pgBigNumber } from "app/common/big-number";
import { createdAt, updatedAt } from "../common/timestamps.ts";

// ---- Status --------------------------------------------------------------

export const ELECTION_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "inactive",
  "closed",
  "archived",
] as const;

export type ElectionStatus = (typeof ELECTION_STATUSES)[number];

export const electionStatusEnum = pgEnum("election_status", ELECTION_STATUSES);

// ---- Table ---------------------------------------------------------------

export const elections = pgTable(
  "elections",
  {
    electionId: uuid("election_id").defaultRandom().primaryKey(),
    electionNumber: pgBigNumber("election_number"),
    title: text("title").notNull(),
    description: text("description"),
    status: electionStatusEnum("status").notNull().default("draft"),
    startTime: timestamp("start_time", { withTimezone: true, mode: "date" }),
    endTime: timestamp("end_time", { withTimezone: true, mode: "date" }),
    deleted: boolean("deleted").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (t) => [index("elections_status_idx").on(t.status)],
);

export type ElectionRow = typeof elections.$inferSelect;
export type ElectionInsert = typeof elections.$inferInsert;

// ---- DTO -----------------------------------------------------------------

export interface ElectionDTO {
  electionId: string;
  title: string;
  description: string | null;
  status: ElectionStatus;
  startTime: string | null;
  endTime: string | null;
  deleted: boolean;
}

export function serializeElection(row: ElectionRow): ElectionDTO {
  return {
    electionId: row.electionId,
    title: row.title,
    description: row.description,
    status: row.status,
    startTime: row.startTime ? row.startTime.toISOString() : null,
    endTime: row.endTime ? row.endTime.toISOString() : null,
    deleted: row.deleted,
  };
}
