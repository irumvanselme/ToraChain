import { parseArgs } from "node:util";

import { APIError } from "better-auth/api";

import { AdminApp } from "../app/auth/admins.ts";

const USAGE =
  'Usage: bun run create-admin -- --name "Jane Doe" --email jane@example.com --password "s3cret-pass"';

/**
 * Bootstraps an admins-domain account directly against the configured
 * database. Admin self-registration is disabled, so the *first* admin must be
 * created with this script; further admins are then created from the admin
 * frontend (Users → Add admin).
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      name: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
    },
  });

  const { name, email, password } = values;
  if (!name || !email || !password) {
    console.error(USAGE);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters long.");
    process.exit(1);
  }

  const app = new AdminApp();
  try {
    const { user } = await app.auth.api.createUser({
      body: { name, email, password },
    });
    console.log(`Created admin ${user.email} (${user.id})`);
  } catch (error) {
    if (error instanceof APIError) {
      console.error(
        `Failed to create admin: ${error.body?.message ?? error.message}`,
      );
      process.exit(1);
    }
    throw error;
  } finally {
    await app.dbPool.end();
  }
}

await main();
