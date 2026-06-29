import { z } from "zod";
import { EUserType } from "./types.ts";
import {
  adminFeLink,
  apiLink,
  auditingFeLink,
  idpLink,
  votingFeLink,
} from "@tora-chain/configs";

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  AUTH_DB_URI: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof EnvSchema>;

const TRUSTED_ORIGINS = [
  idpLink,
  apiLink,
  adminFeLink,
  auditingFeLink,
  votingFeLink,
];

export interface AppConfig {
  readonly secret: string;
  readonly baseURL: string;
  readonly port: number;
  readonly trustedOrigins: string[];
  readonly databaseUrl: string;
  readonly databases: Record<EUserType, string>;
}

function buildConfig(env: Env): AppConfig {
  const trustedOrigins = TRUSTED_ORIGINS;
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL: idpLink,
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
