import { betterAuth, type BetterAuthOptions } from "better-auth";
import { openAPI } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";
import { Pool } from "pg";

import { config } from "../env.ts";
import { EUserType } from "../types.ts";
import { Logger } from "@tora-chain/be-common";

const logger = new Logger({ name: "auth.shared" });

export function createAuth(
  userType: EUserType,
  extraPlugins: BetterAuthOptions["plugins"] = [],
) {
  logger.info(`Creating auth for ${userType}`);
  const dbPool = new Pool({ connectionString: config.databases[userType] });
  dbPool.on("connect", () => logger.info(`Connected to ${userType} database`));
  dbPool.on("error", (err) => logger.error(`Database error: ${err.message}`));
  const appName = `tora-chain-${userType}`;
  const auth = betterAuth({
    appName,
    baseURL: config.baseURL,
    basePath: `/${userType}/api`,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: dbPool,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [jwt(), openAPI(), ...(extraPlugins ?? [])],
  });

  return { auth, dbPool };
}

export type Auth = ReturnType<typeof createAuth>["auth"];
