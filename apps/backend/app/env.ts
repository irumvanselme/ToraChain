import { z } from "zod";
import {
  idpLink,
  apiLink,
  adminFeLink,
  auditingFeLink,
  votingFeLink,
} from "@tora-chain/configs";

const EnvSchema = z.object({
  ELECTIONS_DB_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  AUTH_CORE_API_KEY: z.string().optional(),
  CHAIN_NODE_URL: z.string().optional(),
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
  /** Base URL of the auth service for auditor session validation. */
  readonly auditorsAuthUrl: string;
  /** Chain-node URL for blockchain data retrieval. */
  readonly chainNodeUrl?: string;
}

const TRUSTED_ORIGINS = [
  idpLink,
  apiLink,
  adminFeLink,
  auditingFeLink,
  votingFeLink,
];

function buildConfig(env: Env): AppConfig {
  const trustedOrigins = TRUSTED_ORIGINS;

  return {
    databaseUrl: env.ELECTIONS_DB_URI,
    baseURL: apiLink,
    port: env.PORT,
    trustedOrigins,
    authCoreUrl: idpLink,
    authCoreApiKey: env.AUTH_CORE_API_KEY,
    auditorsAuthUrl: idpLink,
    chainNodeUrl: env.CHAIN_NODE_URL,
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
