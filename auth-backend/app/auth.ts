import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { openAPI } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";

import { db } from "./db";
import { config } from "./config/env.ts";
import * as schema from "./db/schema.ts";

export const auth = betterAuth({
  baseURL: config.betterAuthUrl,
  basePath: config.basePath,
  secret: config.betterAuthSecret,
  trustedOrigins: config.trustedOrigins,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
  },

  plugins: [admin(), organization(), jwt(), openAPI()],
});

export type Auth = typeof auth;
