import { z } from "zod";
import { EUserType } from "./types.ts";

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  ADMINS_AUTH_DB_URI: z.string().min(1),
  VOTERS_AUTH_DB_URI: z.string().min(1),
  AUDITORS_AUTH_DB_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  TRUSTED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export interface AppConfig {
  readonly secret: string;
  readonly baseURL: string;
  readonly port: number;
  readonly trustedOrigins: string[];
  /** Connection string per identity domain. */
  readonly databases: Record<EUserType, string>;
}

function buildConfig(env: Env): AppConfig {
  const trustedOrigins = env.TRUSTED_ORIGINS
    ? env.TRUSTED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [env.BETTER_AUTH_URL];

  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    port: env.PORT,
    trustedOrigins,
    databases: {
      [EUserType.VOTERS]: env.VOTERS_AUTH_DB_URI,
      [EUserType.ADMINS]: env.ADMINS_AUTH_DB_URI,
      [EUserType.AUDITORS]: env.AUDITORS_AUTH_DB_URI,
    },
  };
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return buildConfig(parsed.data);
}

export const config = loadConfig();
