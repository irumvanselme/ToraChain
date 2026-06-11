import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

import { config } from "../app/env.ts";

/**
 * Applies the non-better-auth `/core` migrations (currently just the shared
 * `api_keys` table) to the single auth database. The better-auth domain tables
 * are managed separately by `migrate:voters/admins/auditors`.
 */
async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(resolve(here, "../migrations/api-keys.sql"), "utf8");

  const pool = new Pool({ connectionString: config.databaseUrl });
  try {
    await pool.query(sql);
    console.log("Applied migrations/api-keys.sql");
  } finally {
    await pool.end();
  }
}

await main();
