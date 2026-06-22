import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { Database } from "@tora-chain/be-common/database";

export const TEST_DB_URL = process.env.VITE_TEST_DATABASE_URI;
export const hasTestDb = Boolean(TEST_DB_URL);

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

export async function bootstrapDatabase(): Promise<Database> {
  // env.ts validates ELECTIONS_DB_URI at import; make sure it points at the
  // test database before any app module is imported.
  process.env.ELECTIONS_DB_URI = TEST_DB_URL;

  const database = new Database<Record<string, never>>({ url: TEST_DB_URL! });

  // Clean slate, then migrate. Drop the `drizzle` schema too: it holds
  // Drizzle's migration-tracking table, and if it survives a reset `migrate`
  // treats the migrations as already applied and skips recreating the tables.
  await database.db.execute(sql`drop schema if exists public cascade`);
  await database.db.execute(sql`drop schema if exists drizzle cascade`);
  await database.db.execute(sql`create schema public`);
  await migrate(database.db, { migrationsFolder });

  return database;
}

export async function truncateAll(database: Database): Promise<void> {
  try {
    await database.db.execute(
      sql`truncate table votes, eligibilities, candidates, voters, elections restart identity cascade`,
    );
  } catch (err: unknown) {
    console.warn(
      "Error truncating tables; check that the test database is configured correctly and has the expected schema.",
      err,
    );
  }
}
