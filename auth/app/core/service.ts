import { randomUUID } from "node:crypto";

import { generateApiKey, hashApiKey } from "./keys.ts";
import type {
  ApiKeyRow,
  ApiKeysRepository,
  CoreVotersRepository,
  VoterUserRow,
} from "./repository.ts";

// ---- DTOs ----------------------------------------------------------------

export interface ApiKeyDTO {
  id: string;
  name: string;
  prefix: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Returned only by `create` — includes the plaintext token, shown once. */
export interface CreatedApiKeyDTO extends ApiKeyDTO {
  token: string;
}

export interface VoterDTO {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  expiresAt?: string | null;
  createdBy?: string | null;
}

export interface UpdateApiKeyInput {
  name?: string;
  expiresAt?: string | null;
  revoked?: boolean;
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

function serialize(row: ApiKeyRow): ApiKeyDTO {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdBy: row.created_by,
    lastUsedAt: iso(row.last_used_at),
    expiresAt: iso(row.expires_at),
    revoked: row.revoked,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function serializeVoter(row: VoterUserRow): VoterDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ---- Service interfaces (so the router can be tested with fakes) ---------

export interface ApiKeyApi {
  create(input: CreateApiKeyInput): Promise<CreatedApiKeyDTO>;
  list(): Promise<ApiKeyDTO[]>;
  get(id: string): Promise<ApiKeyDTO | null>;
  update(id: string, input: UpdateApiKeyInput): Promise<ApiKeyDTO | null>;
  remove(id: string): Promise<boolean>;
  /** Verify a presented token; returns the key (and touches it) or null. */
  verify(token: string): Promise<ApiKeyDTO | null>;
}

export interface CoreVotersApi {
  getVoter(voterUserId: string): Promise<VoterDTO | null>;
}

// ---- Implementations -----------------------------------------------------

export class ApiKeyService implements ApiKeyApi {
  constructor(
    private readonly repo: ApiKeysRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(input: CreateApiKeyInput): Promise<CreatedApiKeyDTO> {
    const { token, prefix, hash } = generateApiKey();
    const row = await this.repo.insert({
      id: randomUUID(),
      name: input.name,
      prefix,
      keyHash: hash,
      createdBy: input.createdBy ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    });
    return { ...serialize(row), token };
  }

  async list(): Promise<ApiKeyDTO[]> {
    return (await this.repo.list()).map(serialize);
  }

  async get(id: string): Promise<ApiKeyDTO | null> {
    const row = await this.repo.findById(id);
    return row ? serialize(row) : null;
  }

  async update(
    id: string,
    input: UpdateApiKeyInput,
  ): Promise<ApiKeyDTO | null> {
    const row = await this.repo.update(id, {
      name: input.name,
      revoked: input.revoked,
      expiresAt:
        input.expiresAt === undefined
          ? undefined
          : input.expiresAt
            ? new Date(input.expiresAt)
            : null,
    });
    return row ? serialize(row) : null;
  }

  async remove(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async verify(token: string): Promise<ApiKeyDTO | null> {
    if (!token) return null;
    const row = await this.repo.findByHash(hashApiKey(token));
    if (!row || row.revoked) return null;
    if (row.expires_at && row.expires_at.getTime() <= this.now().getTime()) {
      return null;
    }
    await this.repo.touchLastUsed(row.id);
    return serialize(row);
  }
}

export class CoreVotersService implements CoreVotersApi {
  constructor(private readonly repo: CoreVotersRepository) {}

  async getVoter(voterUserId: string): Promise<VoterDTO | null> {
    const row = await this.repo.findById(voterUserId);
    return row ? serializeVoter(row) : null;
  }
}
