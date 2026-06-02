import { Database, logger } from "@tora-chain/be-common";

import { config } from "../config/env.ts";
import * as schema from "./schema.ts";

export const database = new Database(
  config.database,
  schema,
  logger.child({ service: "auth-backend" }),
);

export const db = database.db;
