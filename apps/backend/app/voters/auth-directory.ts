import { Pool } from "pg";
import { Logger } from "@tora-chain/be-common/logging";

export interface AuthAccount {
  accountId: string;
  email: string;
}

/**
 * Looks up voter accounts in the auth backend. The auth service stores each
 * identity domain (voters/admins/auditors) in its own database; here we read
 * the voters domain's better-auth `user` table by email.
 */
export interface AuthDirectory {
  /** Whether account verification is enforced for this directory. */
  readonly enforced: boolean;
  findAccountByEmail(email: string): Promise<AuthAccount | null>;
}

/** Used when no `VOTERS_AUTH_DB_URI` is configured — eligibility is lenient. */
export class NullAuthDirectory implements AuthDirectory {
  readonly enforced = false;
  async findAccountByEmail(): Promise<AuthAccount | null> {
    return null;
  }
}

/** Reads the better-auth voters `user` table over a dedicated pg pool. */
export class PgAuthDirectory implements AuthDirectory {
  readonly enforced = true;
  private readonly pool: Pool;
  private readonly logger: Logger;

  constructor(
    connectionString: string,
    logger = new Logger({ name: "backend.auth-directory" }),
  ) {
    this.pool = new Pool({ connectionString });
    this.logger = logger;
    this.pool.on("error", (err) =>
      this.logger.error("Auth directory pool error", { error: err.message }),
    );
  }

  async findAccountByEmail(email: string): Promise<AuthAccount | null> {
    const { rows } = await this.pool.query<{ id: string; email: string }>(
      'select "id", "email" from "user" where lower("email") = lower($1) limit 1',
      [email],
    );
    const row = rows[0];
    return row ? { accountId: row.id, email: row.email } : null;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
