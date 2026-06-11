import { z } from "zod";

const EnvSchema = z.object({
  ELECTIONS_DB_URI: z.string().min(1),
  AUTH_SERVICE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  TRUSTED_ORIGINS: z.string().optional(),
  // Auth /core API for voter lookups by user id. Both must be set to enable it;
  // AUTH_CORE_URL defaults to AUTH_SERVICE_URL when only the key is provided.
  AUTH_CORE_URL: z.string().optional(),
  AUTH_CORE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export interface AppConfig {
  readonly databaseUrl: string;
  readonly baseURL: string;
  readonly port: number;
  readonly trustedOrigins: string[];
  /** Connection string to the voters identity DB, if configured. */
  readonly votersAuthDbUrl?: string;
  /** Base URL of the auth /core API (voter lookups), if configured. */
  readonly authCoreUrl?: string;
  /** API key used to authenticate against the auth /core API, if configured. */
  readonly authCoreApiKey?: string;
}

function buildConfig(env: Env): AppConfig {
  const trustedOrigins = env.TRUSTED_ORIGINS
    ? env.TRUSTED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [env.AUTH_SERVICE_URL];

  return {
    databaseUrl: env.ELECTIONS_DB_URI,
    baseURL: env.AUTH_SERVICE_URL,
    port: env.PORT,
    trustedOrigins,
    authCoreUrl: env.AUTH_CORE_URL ?? env.AUTH_SERVICE_URL,
    authCoreApiKey: env.AUTH_CORE_API_KEY,
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
