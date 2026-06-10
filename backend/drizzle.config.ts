import { defineConfig } from "drizzle-kit";

import { config } from "./app/env.ts";

/**
 * Drizzle Kit configuration.
 *
 * Each module owns its table(s) in `app/<module>/model.ts`; the glob below
 * collects every one of them. Migrations are written to `./migrations`.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./app/**/model.ts",
  out: "./migrations",
  dbCredentials: { url: config.databaseUrl },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
