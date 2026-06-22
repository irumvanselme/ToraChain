import { Pool } from "pg";

import { config } from "../env.ts";
import { Logger } from "@tora-chain/be-common/logging";

const logger = new Logger({ name: "auth.core.db" });

/**
 * A dedicated pool for the /core API (api_keys CRUD + voter_users lookups)
 * against the single shared auth database.
 */
export const corePool = new Pool({ connectionString: config.databaseUrl });

corePool.on("error", (err) =>
  logger.error("Core database pool error", { error: err.message }),
);
