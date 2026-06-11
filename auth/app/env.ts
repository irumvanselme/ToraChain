import { z } from "zod";
import { EUserType } from "./types.ts";

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  // Single Postgres database shared by all three identity domains; their
  // tables are namespaced by prefix (voter_*, admin_*, auditor_*).
  AUTH_DB_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  TRUSTED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export interface AppConfig {
  readonly secret: string;
  readonly baseURL: string;
  readonly port: number;
  readonly trustedOrigins: string[];
  /** The single database URL shared by every identity domain. */
  readonly databaseUrl: string;
  /**
   * Connection string per identity domain. All entries point at the same
   * database now; tables are kept apart by prefix. Kept as a record so callers
   * that look up a domain's connection continue to work.
   */
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
    databaseUrl: env.AUTH_DB_URI,
    databases: {
      [EUserType.VOTERS]: env.AUTH_DB_URI,
      [EUserType.ADMINS]: env.AUTH_DB_URI,
      [EUserType.AUDITORS]: env.AUTH_DB_URI,
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
