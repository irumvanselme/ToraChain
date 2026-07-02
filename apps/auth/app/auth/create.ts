import { Pool } from "pg";
import { jwt } from "better-auth/plugins/jwt";
import { admin, openAPI } from "better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth";

import { Logger } from "@tora-chain/be-common";

import { config } from "../env.ts";
import { EUserType, tableNames } from "../types.ts";

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

  const tables = tableNames(userType);

  const auth = betterAuth({
    appName,
    baseURL: config.baseURL,
    basePath: `/${userType}/api`,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: dbPool,
    advanced: {
      // The frontends (e.g. auditing.localhost:3002) and the IDP
      // (idp.localhost:8001) live on different registrable domains, so every
      // `get-session` call from a frontend is a *cross-site* request. The
      // browser only attaches the session cookie to a cross-site fetch when it
      // is `SameSite=None; Secure`. `Secure` is honoured over http on localhost
      // (a "potentially trustworthy" origin) and over https in demo/prod.
      useSecureCookies: true,
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    user: { modelName: tables.user },
    session: { modelName: tables.session },
    account: { modelName: tables.account },
    verification: { modelName: tables.verification },
    plugins: [
      jwt({ schema: { jwks: { modelName: tables.jwks } } }),
      openAPI(),
      admin(),
      ...(extraPlugins ?? []),
    ],
  });

  return { auth, dbPool };
}

export type Auth = ReturnType<typeof createAuth>["auth"];
