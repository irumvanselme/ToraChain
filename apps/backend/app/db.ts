import { Database } from "@tora-chain/be-common/database";
import { Logger } from "@tora-chain/be-common/logging";

import { config } from "./env.ts";
import { candidates } from "./candidates/model.ts";
import { elections, electionStatusEnum } from "./elections/model.ts";
import { eligibilities, voters } from "./voters/model.ts";
import { votes } from "./votes/model.ts";

/** Full Drizzle schema for the elections' database. */
export const schema = {
  elections,
  electionStatusEnum,
  candidates,
  voters,
  eligibilities,
  votes,
};

export type Schema = typeof schema;

const logger = new Logger({ name: "backend.db" });

// Schema is collected by drizzle-kit via the `./app/**/model.ts` glob for
// migrations; at runtime the repositories use the schema-agnostic core query
// builder, so we don't bind the schema generic to the Database instance.
export const database = new Database<Record<string, never>>(
  { url: config.databaseUrl },
  undefined,
  logger,
);

/** Shared Drizzle instance injected into repositories. */
export const db = database.db;
