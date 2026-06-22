import { Logger } from "@tora-chain/be-common/logging";

import { AppError } from "../common/errors.ts";

/** A voter identity as returned by the auth /core API. */
export interface CoreVoter {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

/**
 * Reads voter identities from the auth service's /core API by voter user id.
 * The backend uses this when granting eligibility so the canonical email/id
 * come from the auth service rather than client input.
 */
export interface AuthCoreClient {
  /** Whether a real client is configured (lookups are enforced). */
  readonly enabled: boolean;
  /** Returns the voter, or null when the auth service reports 404. */
  getVoter(voterUserId: string): Promise<CoreVoter | null>;
}

/** Used when no auth /core API is configured — voter-id grants are unavailable. */
export class NullAuthCore implements AuthCoreClient {
  readonly enabled = false;
  async getVoter(): Promise<CoreVoter | null> {
    return null;
  }
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** Calls `GET {baseUrl}/core/api/voters/{voterUserId}` with an API key. */
export class AuthCoreService implements AuthCoreClient {
  readonly enabled = true;
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly logger = new Logger({ name: "backend.auth-core" }),
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async getVoter(voterUserId: string): Promise<CoreVoter | null> {
    const url = `${this.baseUrl}/core/api/voters/${encodeURIComponent(voterUserId)}`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        headers: { "x-api-key": this.apiKey, accept: "application/json" },
      });
    } catch (err) {
      this.logger.error("Auth core request failed", {
        voterUserId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw AppError.internal("Failed to reach the auth service.");
    }

    if (res.status === 404) return null;
    if (res.status === 401) {
      this.logger.error("Auth core rejected the API key", { status: 401 });
      throw AppError.internal("Auth service rejected the backend API key.");
    }
    if (!res.ok) {
      this.logger.error("Auth core returned an error", { status: res.status });
      throw AppError.internal("Auth service returned an unexpected error.");
    }

    const data = (await res.json()) as Partial<CoreVoter>;
    if (!data.id || !data.email) {
      throw AppError.internal("Auth service returned a malformed voter.");
    }
    return {
      id: data.id,
      name: data.name ?? "",
      email: data.email,
      emailVerified: Boolean(data.emailVerified),
    };
  }
}
