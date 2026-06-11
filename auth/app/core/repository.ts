import { EUserType, tableNames } from "../types.ts";

/** Minimal surface of a `pg` Pool/Client we depend on (keeps tests simple). */
export interface Queryable {
  query<R = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

// ---- API keys ------------------------------------------------------------

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  key_hash: string;
  created_by: string | null;
  last_used_at: Date | null;
  expires_at: Date | null;
  revoked: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ApiKeyInsert {
  id: string;
  name: string;
  prefix: string;
  keyHash: string;
  createdBy: string | null;
  expiresAt: Date | null;
}

export interface ApiKeyUpdate {
  name?: string;
  expiresAt?: Date | null;
  revoked?: boolean;
}

const API_KEY_COLUMNS =
  '"id", "name", "prefix", "key_hash", "created_by", "last_used_at", "expires_at", "revoked", "created_at", "updated_at"';

export class ApiKeysRepository {
  constructor(private readonly db: Queryable) {}

  async insert(values: ApiKeyInsert): Promise<ApiKeyRow> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `insert into "api_keys" ("id", "name", "prefix", "key_hash", "created_by", "expires_at")
       values ($1, $2, $3, $4, $5, $6)
       returning ${API_KEY_COLUMNS}`,
      [
        values.id,
        values.name,
        values.prefix,
        values.keyHash,
        values.createdBy,
        values.expiresAt,
      ],
    );
    return rows[0]!;
  }

  async list(): Promise<ApiKeyRow[]> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `select ${API_KEY_COLUMNS} from "api_keys" order by "created_at" desc`,
    );
    return rows;
  }

  async findById(id: string): Promise<ApiKeyRow | null> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `select ${API_KEY_COLUMNS} from "api_keys" where "id" = $1 limit 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByHash(keyHash: string): Promise<ApiKeyRow | null> {
    const { rows } = await this.db.query<ApiKeyRow>(
      `select ${API_KEY_COLUMNS} from "api_keys" where "key_hash" = $1 limit 1`,
      [keyHash],
    );
    return rows[0] ?? null;
  }

  async update(id: string, values: ApiKeyUpdate): Promise<ApiKeyRow | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (values.name !== undefined) {
      sets.push(`"name" = $${i++}`);
      params.push(values.name);
    }
    if (values.expiresAt !== undefined) {
      sets.push(`"expires_at" = $${i++}`);
      params.push(values.expiresAt);
    }
    if (values.revoked !== undefined) {
      sets.push(`"revoked" = $${i++}`);
      params.push(values.revoked);
    }
    if (sets.length === 0) return this.findById(id);
    sets.push(`"updated_at" = CURRENT_TIMESTAMP`);
    params.push(id);
    const { rows } = await this.db.query<ApiKeyRow>(
      `update "api_keys" set ${sets.join(", ")} where "id" = $${i} returning ${API_KEY_COLUMNS}`,
      params,
    );
    return rows[0] ?? null;
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.db.query(
      `update "api_keys" set "last_used_at" = CURRENT_TIMESTAMP where "id" = $1`,
      [id],
    );
  }

  async delete(id: string): Promise<boolean> {
    const { rows } = await this.db.query<{ id: string }>(
      `delete from "api_keys" where "id" = $1 returning "id"`,
      [id],
    );
    return rows.length > 0;
  }
}

// ---- Voter users (read-only lookup into the voters domain) ---------------

const VOTER_USERS_TABLE = tableNames(EUserType.VOTERS).user;

export interface VoterUserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CoreVotersRepository {
  constructor(
    private readonly db: Queryable,
    private readonly table: string = VOTER_USERS_TABLE,
  ) {}

  async findById(voterUserId: string): Promise<VoterUserRow | null> {
    const { rows } = await this.db.query<VoterUserRow>(
      `select "id", "name", "email", "emailVerified", "createdAt", "updatedAt"
       from "${this.table}" where "id" = $1 limit 1`,
      [voterUserId],
    );
    return rows[0] ?? null;
  }
}
