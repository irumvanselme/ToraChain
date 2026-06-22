import { defineConfig } from "vitest/config";

/**
 * Integration tests run against a real Postgres database.
 *
 * Provide a connection string via `VITE_TEST_DATABASE_URI` (Vitest loads it
 * from `.env` into `process.env`). The suite drops + recreates the schema,
 * runs migrations, truncates all tables, and then exercises the full HTTP
 * surface end to end — so point it at a dedicated test database, never a
 * database whose data you want to keep.
 *
 * If it is not set, the integration suite skips itself (see
 * tests/integration/setup.ts), so `bun run test:integration` is always safe.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["./tests/integration/**/*.test.ts"],

    // Integration tests share one database; run them serially.
    fileParallelism: false,
    sequence: { concurrent: false },
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      AUTH_SERVICE_URL: "no-url",
    },
  },
});
