import { Elysia } from "elysia";

import type { Database } from "@tora-chain/be-common/database";

/** `/health` — pings the elections database. */
export function AppHealth(database: Database) {
  return new Elysia().get("/health", async ({ set }) => {
    const up = await database.ping();
    if (!up) set.status = 503;
    return { ok: up, database: up ? "up" : "down" };
  });
}
