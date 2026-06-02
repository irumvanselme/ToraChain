import { defineConfig } from "drizzle-kit";

import { config } from "./app/config/env.ts";

const db = config.database;

/**
 * drizzle-kit configuration for applying the generated better-auth schema to
 * Postgres (`bun run db:push` / `db:generate` + `db:migrate`).
 */
export default defineConfig({
  schema: "./app/db/schema.ts",
  out: "./app/db/migrations",
  dialect: "postgresql",
  dbCredentials: db.url
    ? { url: db.url }
    : {
        host: db.host!,
        port: db.port!,
        user: db.user!,
        password: db.password!,
        database: db.database!,
        ssl: db.ssl ?? false,
      },
});
