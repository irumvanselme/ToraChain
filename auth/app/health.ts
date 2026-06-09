import { Elysia } from "elysia";
import { appRegistry } from "./_apps.ts";

export async function AppHealth() {
  return new Elysia({
    prefix: "health",
  }).get("", async () => {
    const checks = await Promise.all(
      appRegistry().apps.map(async ({ userType, dbPool }) => {
        try {
          await dbPool.query("select 1");
          return [userType, "up"] as const;
        } catch {
          return [userType, "down"] as const;
        }
      }),
    );
    const databases = Object.fromEntries(checks);
    const healthy = checks.every(([, s]) => s === "up");
    return { ok: healthy, databases };
  });
}
