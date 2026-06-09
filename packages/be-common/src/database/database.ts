import { Pool, type PoolConfig } from "pg";

import { Logger, logger as defaultLogger } from "../logging/logger.ts";

export interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean;
  max?: number;
  connectionTimeoutMs?: number;
}

export type DrizzleSchema = Record<string, unknown>;

export class Database<TSchema extends DrizzleSchema = Record<string, never>> {
  readonly pool: Pool;
  readonly db: NodePgDatabase<TSchema>;

  private readonly logger: Logger;
  private closed = false;

  constructor(
    config: DatabaseConfig,
    schema?: TSchema,
    logger: Logger = defaultLogger,
  ) {
    this.logger = logger.child({ component: "database" });
    this.pool = new Pool(Database.toPoolConfig(config));

    this.pool.on("error", (err) => {
      this.logger.error("Unexpected error on idle Postgres client", {
        error: err.message,
      });
    });

    this.db = drizzle(this.pool, {
      schema,
      logger: false,
    }) as NodePgDatabase<TSchema>;
  }

  private static toPoolConfig(config: DatabaseConfig): PoolConfig {
    const base: PoolConfig = {
      max: config.max,
      connectionTimeoutMillis: config.connectionTimeoutMs,
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    };

    if (config.url) {
      return { ...base, connectionString: config.url };
    }

    return {
      ...base,
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    };
  }

  async connect(): Promise<void> {
    await this.db.execute(sql`select 1`);
    this.logger.info("Connected to Postgres");
  }

  async ping(): Promise<boolean> {
    try {
      await this.db.execute(sql`select 1`);
      return true;
    } catch (error) {
      this.logger.warn("Postgres ping failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.pool.end();
    this.logger.info("Postgres connection pool closed");
  }
}
