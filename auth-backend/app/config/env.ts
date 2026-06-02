import {
  type DatabaseConfig,
  getEnv,
  getNumberEnv,
  getBoolEnv,
  requireEnv,
} from "@tora-chain/be-common";

export class AppConfig {
  readonly port: number;
  readonly betterAuthSecret: string;
  readonly betterAuthUrl: string;
  readonly basePath: string;
  readonly trustedOrigins: string[];
  readonly database: DatabaseConfig;

  constructor() {
    this.port = getNumberEnv("PORT", 3000);
    this.betterAuthSecret =
      process.env.NODE_ENV === "production"
        ? requireEnv("BETTER_AUTH_SECRET")
        : getEnv("BETTER_AUTH_SECRET", "dev-secret-change-me")!;

    this.betterAuthUrl = getEnv(
      "BETTER_AUTH_URL",
      `http://localhost:${this.port}`,
    )!;
    this.basePath = getEnv("BETTER_AUTH_BASE_PATH", "/api/auth")!;

    this.trustedOrigins = (
      getEnv("TRUSTED_ORIGINS", "http://localhost:3000") ?? ""
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    this.database = {
      url: getEnv("AUTH_DATABASE_URL"),
      host: getEnv("AUTH_DATABASE_HOST", "localhost"),
      port: getNumberEnv("AUTH_DATABASE_PORT", 5434),
      user: getEnv("AUTH_DATABASE_USER", "auth"),
      password: getEnv("AUTH_DATABASE_PASSWORD", "auth"),
      database: getEnv("AUTH_DATABASE_NAME", "auth"),
      ssl: getBoolEnv("AUTH_DATABASE_SSL", false),
      max: getNumberEnv("AUTH_DATABASE_POOL_MAX", 10),
    };
  }
}

export const config = new AppConfig();
